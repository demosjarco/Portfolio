/**
 * UI-thread client for the PowerShell sandbox.
 *
 * One browser = one sandbox (its id lives in localStorage, shared by every tab) = one WebSocket. Every PowerShell window in every tab is multiplexed over that socket by its UUIDv7.
 *
 * Primary transport: the service worker owns the socket (see `src/routes/service-worker.ts`), so all tabs share one connection. Fallback when no service worker controls the page (local dev, private windows, first load): a direct socket per tab.
 *
 * Reconnects are handled here for both transports. When the socket (re)opens, every window gets `onConnected` and re-sends `open`, which the sandbox answers with a full-screen snapshot, so a recycled service worker or a dropped connection is invisible apart from a repaint.
 */
import { apiBase, wsBase } from '~/WinXp/apps/Messenger/profile';
import { bytesToUuid, PsCloseCode, psServerMessageSchema, sandboxIdSchema, WINDOW_ID_BYTES, type CreatedSandbox, type PsClientMessage, type PsServerMessage, type PsSwCommand, type PsSwEvent } from '~/WinXp/apps/PowerShell/types';

/** localStorage key holding this browser's sandbox id. */
const SANDBOX_KEY = 'pwsh.sandbox';
/** Page -> service worker ping interval; must stay under Chrome's ~30s idle termination. */
const SW_KEEPALIVE_MS = 25_000;
/** Socket-level keepalive so idle connections aren't dropped by proxies. Answered by the Durable Object's auto-response without waking it. */
const WS_PING_MS = 30_000;
/** Reconnect backoff bounds after an unexpected close. */
const RECONNECT_MIN_MS = 500;
const RECONNECT_MAX_MS = 10_000;

/* ----------------------------------------------------------- sandbox id */

export function loadSandboxId(): string | undefined {
	try {
		const parsed = sandboxIdSchema.safeParse(localStorage.getItem(SANDBOX_KEY));
		return parsed.success ? parsed.data : undefined;
	} catch {
		return undefined;
	}
}

function saveSandboxId(id: string): void {
	try {
		localStorage.setItem(SANDBOX_KEY, id);
	} catch {
		/* storage unavailable: the sandbox still works for this page */
	}
}

/** Forget the sandbox, e.g. after it expired. The next window has to create a new one. */
export function forgetSandboxId(id: string): void {
	try {
		if (localStorage.getItem(SANDBOX_KEY) === id) localStorage.removeItem(SANDBOX_KEY);
	} catch {
		/* storage unavailable */
	}
}

/** Create a sandbox (Turnstile-gated, one per IP per minute) and remember it. */
export async function createSandbox(turnstile: string): Promise<{ ok: true; id: string } | { ok: false; status: number; error: string }> {
	try {
		const res = await fetch(`${apiBase}/api/powershell/sandbox`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ turnstile }),
		});
		if (!res.ok) {
			const body = await res.json<{ error?: string }>().catch(() => ({ error: undefined }));
			return { ok: false, status: res.status, error: body.error ?? res.statusText };
		}
		const { id } = await res.json<CreatedSandbox>();
		saveSandboxId(id);
		return { ok: true, id };
	} catch {
		return { ok: false, status: 0, error: 'The network connection failed.' };
	}
}

type CreateResult = Awaited<ReturnType<typeof createSandbox>>;
let creating: Promise<CreateResult> | undefined;

/** Create the sandbox once even when several windows open at the same time (creation is limited to one per IP per minute). `getToken` runs the Turnstile challenge and is only called by the first window. */
export function createSandboxOnce(getToken: () => Promise<string | undefined>): Promise<CreateResult> {
	creating ??= (async (): Promise<CreateResult> => {
		const token = await getToken();
		if (!token) return { ok: false, status: 0, error: 'Human verification failed.' };
		return createSandbox(token);
	})().finally(() => (creating = undefined));
	return creating;
}

/* ------------------------------------------------------------- windows */

export interface WindowHandlers {
	/** The socket is (re)connected: send `open` for this window. */
	onConnected(): void;
	/** Raw terminal output for this window. */
	onOutput(bytes: Uint8Array): void;
	onMessage(message: PsServerMessage): void;
	/** The socket closed for good (sandbox expired, not found, or rejected a message). */
	onClosed(code: number): void;
}

/** Windows open in this tab, by window id. `connId` is the socket the window last sent `open` on. */
const windows = new Map<string, { sandboxId: string; handlers: WindowHandlers; connId?: string }>();
/** Sandboxes this tab currently has an open (or opening) socket for. */
const connected = new Set<string>();
/** The open socket of each sandbox, by connection id (a new id per socket, so a reconnect is recognisable even when the old close was never seen). */
const liveConn = new Map<string, string>();
const reconnectDelay = new Map<string, number>();

function windowsOf(sandboxId: string) {
	return [...windows.values()].filter((entry) => entry.sandboxId === sandboxId);
}

/** Codes after which reconnecting is pointless. */
function isFinal(code: number): boolean {
	return code === PsCloseCode.Expired || code === PsCloseCode.NotFound || code === PsCloseCode.BadMessage;
}

/** A socket opened (or a new tab/window joined one). Only windows that haven't sent `open` on this socket do so, so joining doesn't make every other window reattach and repaint. */
function handleOpen(sandboxId: string, connId: string): void {
	reconnectDelay.delete(sandboxId);
	liveConn.set(sandboxId, connId);
	for (const entry of windowsOf(sandboxId)) {
		if (entry.connId === connId) continue;
		entry.connId = connId;
		entry.handlers.onConnected();
	}
}

function handleFrame(data: ArrayBuffer | string): void {
	if (typeof data === 'string') {
		let json: unknown;
		try {
			json = JSON.parse(data);
		} catch {
			return;
		}
		const parsed = psServerMessageSchema.safeParse(json);
		if (parsed.success) windows.get(parsed.data.w)?.handlers.onMessage(parsed.data);
		return;
	}
	if (data.byteLength < WINDOW_ID_BYTES) return;
	const bytes = new Uint8Array(data);
	windows.get(bytesToUuid(bytes.subarray(0, WINDOW_ID_BYTES)))?.handlers.onOutput(bytes.subarray(WINDOW_ID_BYTES));
}

function handleClose(sandboxId: string, code: number): void {
	connected.delete(sandboxId);
	liveConn.delete(sandboxId);
	if (isFinal(code)) {
		forgetSandboxId(sandboxId);
		for (const { handlers } of windowsOf(sandboxId)) handlers.onClosed(code);
		return;
	}
	if (windowsOf(sandboxId).length === 0) return;
	const delay = reconnectDelay.get(sandboxId) ?? RECONNECT_MIN_MS;
	reconnectDelay.set(sandboxId, Math.min(delay * 2, RECONNECT_MAX_MS));
	setTimeout(() => {
		if (windowsOf(sandboxId).length > 0) connect(sandboxId);
	}, delay);
}

/* ---------------------------------------------------------- transports */

function socketUrl(sandboxId: string): string {
	return `${wsBase}/api/powershell/sandbox/${sandboxId}/ws`;
}

function swControlled(): boolean {
	return 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;
}

function postToWorker(cmd: PsSwCommand): void {
	navigator.serviceWorker.controller?.postMessage(cmd);
}

/** Direct (no service worker) sockets, one per sandbox for this tab. */
const directSockets = new Map<string, WebSocket>();

function connectDirect(sandboxId: string): void {
	const ws = new WebSocket(socketUrl(sandboxId));
	ws.binaryType = 'arraybuffer';
	directSockets.set(sandboxId, ws);
	let ping: ReturnType<typeof setInterval> | undefined;

	const connId = crypto.randomUUID();
	ws.addEventListener('open', () => {
		ping = setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('ping'), WS_PING_MS);
		handleOpen(sandboxId, connId);
	});
	ws.addEventListener('message', (event: MessageEvent<ArrayBuffer | string>) => {
		// Auto-response to our keepalive.
		if (event.data === 'pong') return;
		handleFrame(event.data);
	});
	ws.addEventListener('close', (event) => {
		clearInterval(ping);
		if (directSockets.get(sandboxId) === ws) directSockets.delete(sandboxId);
		handleClose(sandboxId, event.code);
	});
}

let workerListening = false;
let workerKeepalive: ReturnType<typeof setInterval> | undefined;

/** Listen for the service worker's relayed socket events (once per tab). */
function listenToWorker(): void {
	if (workerListening) return;
	workerListening = true;
	navigator.serviceWorker.addEventListener('message', (event: MessageEvent<PsSwEvent | undefined>) => {
		const data = event.data;
		if (data?.ns !== 'pwsh') return;
		switch (data.evt) {
			case 'open':
				handleOpen(data.sandboxId, data.connId);
				break;
			case 'message':
				// Raw text from the socket; validated here.
				handleFrame(data.data);
				break;
			case 'output':
				handleFrame(data.data);
				break;
			case 'close':
				handleClose(data.sandboxId, data.code);
				break;
		}
	});
}

function connect(sandboxId: string): void {
	if (connected.has(sandboxId)) return;
	connected.add(sandboxId);
	if (swControlled()) {
		listenToWorker();
		postToWorker({ ns: 'pwsh', cmd: 'connect', sandboxId });
		// Chrome stops an idle service worker after ~30s, taking its socket with it. Pinging it keeps it alive.
		workerKeepalive ??= setInterval(() => {
			for (const id of new Set([...windows.values()].map((entry) => entry.sandboxId))) postToWorker({ ns: 'pwsh', cmd: 'keepalive', sandboxId: id });
		}, SW_KEEPALIVE_MS);
	} else {
		connectDirect(sandboxId);
	}
}

/* ---------------------------------------------------------------- public */

/** Register a window and make sure its sandbox's socket is up. `onConnected` fires once the socket is open (immediately-ish if it already is). Returns a disposer. */
export function attachWindow(sandboxId: string, windowId: string, handlers: WindowHandlers): () => void {
	const entry: { sandboxId: string; handlers: WindowHandlers; connId?: string } = { sandboxId, handlers };
	windows.set(windowId, entry);
	const live = liveConn.get(sandboxId);
	if (connected.has(sandboxId) && live) {
		// Socket already open: start this window right away.
		entry.connId = live;
		handlers.onConnected();
	} else if (connected.has(sandboxId)) {
		// Still connecting: the coming `open` starts it. Via the worker, asking again is harmless (it replays `open` if the socket is already up).
		if (swControlled()) postToWorker({ ns: 'pwsh', cmd: 'connect', sandboxId });
	} else {
		connect(sandboxId);
	}

	return () => {
		windows.delete(windowId);
		if (windowsOf(sandboxId).length > 0) return;
		// Last window of this sandbox in this tab: drop the direct socket. The worker's socket is shared with other tabs and lives on its own.
		const direct = directSockets.get(sandboxId);
		if (direct) {
			directSockets.delete(sandboxId);
			connected.delete(sandboxId);
			liveConn.delete(sandboxId);
			direct.close(1000, 'No windows');
		}
		if (windows.size === 0) {
			clearInterval(workerKeepalive);
			workerKeepalive = undefined;
			connected.clear();
			liveConn.clear();
		}
	};
}

/** Send a control message for a window over whichever transport owns the socket. */
export function sendToSandbox(sandboxId: string, payload: PsClientMessage): void {
	if (swControlled() && !directSockets.has(sandboxId)) {
		postToWorker({ ns: 'pwsh', cmd: 'send', sandboxId, payload });
		return;
	}
	const ws = directSockets.get(sandboxId);
	if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}
