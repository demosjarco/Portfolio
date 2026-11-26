// Type-only imports. Qwik City emits this worker at the site root but puts modules it shares with the app into chunks under /build/, and the worker's relative `./q-*.js` import of such a chunk 404s, so the worker fails to evaluate and never registers. Anything imported at runtime must therefore be used only here.
import type { ServerMessage, SwCommand, SwEvent } from '~/WinXp/apps/Messenger/types';
import type { PsSwCommand, PsSwEvent } from '~/WinXp/apps/PowerShell/types';

addEventListener('install', () => self.skipWaiting());

addEventListener('activate', () => self.clients.claim());

declare const self: ServiceWorkerGlobalScope;

/** WebSocket origin of the site's own API; the worker is always served from that origin. */
const wsBase = self.location.origin.replace(/^http/, 'ws');

/**
 * Windows Messenger chatroom sockets.
 *
 * The service worker owns every room WebSocket so that a single connection is shared and its lifecycle is decoupled from any one tab. UI threads relay intent via {@link SwCommand} postMessages and receive {@link SwEvent} broadcasts in return.
 */
const rooms = new Map<string, WebSocket>();

/** A room id is one path segment — never a path separator, so it can't escape `/rooms/<id>/ws`. */
const SAFE_ROOM_ID = /^[^/]+$/;

/** A Gravatar hash (or one derived from a user id): a lowercase SHA-256 hex digest. */
const SAFE_AVATAR_HASH = /^[0-9a-f]{64}$/;

/**
 * `roomId` and `wsUrl` arrive via postMessage from a controlled client, so both must be treated as untrusted here even though the UI always sends well-formed values. Rather than validating the client-supplied `wsUrl` and forwarding it, the connect URL's origin and path are rebuilt from `wsBase` (a compile-time constant) plus `roomId` (checked against a strict allowlist pattern immediately before use), so neither is ever taken verbatim from client input. The one piece still sourced from `wsUrl` — the `avatar` query param — is likewise validated against an allowlist pattern immediately before being copied over.
 */
function trustedRoomUrl(roomId: string, wsUrl: string) {
	if (!SAFE_ROOM_ID.test(roomId)) return undefined;

	let candidate: URL;
	try {
		candidate = new URL(wsUrl);
	} catch {
		return undefined;
	}

	const trusted = new URL(`/api/messenger/rooms/${roomId}/ws`, wsBase);
	if (candidate.origin !== trusted.origin || candidate.pathname !== trusted.pathname) return undefined;

	const avatar = candidate.searchParams.get('avatar');
	if (avatar !== null && SAFE_AVATAR_HASH.test(avatar)) trusted.searchParams.set('avatar', avatar);
	return trusted;
}

/** Broadcast an event to every controlled client (i.e. open tabs). */
async function broadcast(event: SwEvent) {
	const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
	for (const client of clients) client.postMessage(event);
}

function openRoom(roomId: string, wsUrl: string) {
	const url = trustedRoomUrl(roomId, wsUrl);
	if (!url) return;

	// One socket per room — reuse if already open/connecting.
	const existing = rooms.get(roomId);
	if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
		if (existing.readyState === WebSocket.OPEN) void broadcast({ ns: 'msmsgs', evt: 'open', roomId });
		return;
	}

	const ws = new WebSocket(url.href);
	rooms.set(roomId, ws);

	ws.addEventListener('open', () => void broadcast({ ns: 'msmsgs', evt: 'open', roomId }));
	ws.addEventListener('message', (event) => {
		try {
			const data = JSON.parse(typeof event.data === 'string' ? event.data : '') as ServerMessage;
			void broadcast({ ns: 'msmsgs', evt: 'message', roomId, data });
		} catch {
			/* ignore non-JSON frames */
		}
	});
	ws.addEventListener('close', (event) => {
		rooms.delete(roomId);
		void broadcast({ ns: 'msmsgs', evt: 'close', roomId, code: event.code });
	});
	ws.addEventListener('error', () => void broadcast({ ns: 'msmsgs', evt: 'error', roomId }));
}

function closeRoom(roomId: string) {
	const ws = rooms.get(roomId);
	if (!ws) return;
	rooms.delete(roomId);
	try {
		ws.close(1000, 'Client left');
	} catch {
		/* already closing */
	}
}

addEventListener('message', (event) => {
	if (event.origin !== self.location.origin) return;

	const data = event.data as SwCommand | undefined;
	if (data?.ns !== 'msmsgs') return;

	switch (data.cmd) {
		case 'connect':
			openRoom(data.roomId, data.wsUrl);
			break;
		case 'send': {
			const ws = rooms.get(data.roomId);
			if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data.payload));
			break;
		}
		case 'disconnect':
			closeRoom(data.roomId);
			break;
		case 'keepalive': {
			// Receiving this message alone resets the worker's idle-termination timer. If the socket is gone (the worker was recycled before this ping arrived), transparently reopen it.
			const ws = rooms.get(data.roomId);
			if (!ws || ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) openRoom(data.roomId, data.wsUrl);
			break;
		}
	}
});

// On teardown (a new worker taking over) drop every socket cleanly.
addEventListener('activate', () => {
	for (const [roomId] of rooms) closeRoom(roomId);
	for (const [, ws] of sandboxes) ws.close(1001, 'Worker replaced');
});

/**
 * Windows PowerShell sandbox sockets: one per sandbox, shared by every tab. Frames are relayed untouched; tabs demultiplex output by window id. Reconnects are driven by the tabs (see `WinXp/apps/PowerShell/client.ts`), which re-send `open` for their windows when the socket comes back.
 */
const sandboxes = new Map<string, WebSocket>();
/** Connection id of each sandbox socket, sent with every `open` broadcast. */
const sandboxConnIds = new WeakMap<WebSocket, string>();
const sandboxPings = new Map<string, ReturnType<typeof setInterval>>();

/** A sandbox id is 64 hex characters, so it can't escape `/sandbox/<id>/ws`. */
const SAFE_SANDBOX_ID = /^[0-9a-f]{64}$/i;
/** Socket keepalive; answered by the Durable Object's auto-response without waking it. */
const SANDBOX_PING_MS = 30_000;

async function broadcastPwsh(event: PsSwEvent) {
	const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
	for (const client of clients) client.postMessage(event);
}

function openSandbox(sandboxId: string) {
	if (!SAFE_SANDBOX_ID.test(sandboxId)) return;
	const id = sandboxId.toLowerCase();

	const existing = sandboxes.get(id);
	if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
		// A new tab or window joined an open socket: let it start its windows.
		if (existing.readyState === WebSocket.OPEN) void broadcastPwsh({ ns: 'pwsh', evt: 'open', sandboxId: id, connId: sandboxConnIds.get(existing)! });
		return;
	}

	const ws = new WebSocket(new URL(`/api/powershell/sandbox/${id}/ws`, wsBase).href);
	ws.binaryType = 'arraybuffer';
	sandboxes.set(id, ws);
	const connId = crypto.randomUUID();
	sandboxConnIds.set(ws, connId);

	ws.addEventListener('open', () => {
		sandboxPings.set(
			id,
			setInterval(() => ws.readyState === WebSocket.OPEN && ws.send('ping'), SANDBOX_PING_MS),
		);
		void broadcastPwsh({ ns: 'pwsh', evt: 'open', sandboxId: id, connId });
	});
	ws.addEventListener('message', (event: MessageEvent<ArrayBuffer | string>) => {
		if (typeof event.data !== 'string') {
			void broadcastPwsh({ ns: 'pwsh', evt: 'output', sandboxId: id, data: event.data });
			return;
		}
		if (event.data === 'pong') return;
		// Relayed as text; the tab validates it. Keeps zod (and the chunk it would pull in) out of the worker.
		void broadcastPwsh({ ns: 'pwsh', evt: 'message', sandboxId: id, data: event.data });
	});
	ws.addEventListener('close', (event) => {
		clearInterval(sandboxPings.get(id));
		sandboxPings.delete(id);
		if (sandboxes.get(id) === ws) sandboxes.delete(id);
		void broadcastPwsh({ ns: 'pwsh', evt: 'close', sandboxId: id, code: event.code });
	});
}

addEventListener('message', (event) => {
	if (event.origin !== self.location.origin) return;

	const data = event.data as PsSwCommand | undefined;
	if (data?.ns !== 'pwsh' || !SAFE_SANDBOX_ID.test(data.sandboxId)) return;
	const id = data.sandboxId.toLowerCase();

	switch (data.cmd) {
		case 'connect':
			openSandbox(id);
			break;
		case 'send': {
			const ws = sandboxes.get(id);
			if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data.payload));
			break;
		}
		case 'keepalive':
			// Receiving this resets the worker's idle timer. If the worker was recycled the socket is gone; tabs reconnect when they see no `open`, so reopen it here.
			if (!sandboxes.has(id)) openSandbox(id);
			break;
	}
});
