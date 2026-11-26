import { zValidator } from '@hono/zod-validator';
import { DurableObject, WorkerEntrypoint } from 'cloudflare:workers';
import { Hono } from 'hono';
import * as zm from 'zod/mini';
import type { EnvVars } from '~/types';
import { MAX_WINDOWS, PsCloseCode, psClientMessageSchema, uuidToBytes, windowIdSchema, WINDOW_ID_BYTES, type PsClientMessage, type PsServerMessage } from '~/WinXp/apps/PowerShell/types';

/** No input and no output for this long deletes the whole sandbox: container, sockets, storage. */
const IDLE_MS = 900_000 as const; // 15 * 60 * 1000
/** Activity is persisted at most this often, so a busy shell doesn't write storage on every keystroke. */
const TOUCH_THROTTLE_MS = 30_000 as const;
/** Virtual hostname the container's host process POSTs pane output to. Only reachable through our intercept; the container has no Internet. */
const SINK_HOST = 'pwsh.internal' as const;
/** Port of the container's host process (container/powershell/host). */
const HOST_PORT = 8080 as const;
/** How long a freshly started container gets to answer /health before the start counts as failed. `lite` is 1/16 vCPU. */
const HOST_READY_TIMEOUT_MS = 60_000 as const;

/** Storage keys. The sandbox exists exactly as long as {@link KEY_CREATED} does. */
const KEY_CREATED = 'created' as const;
const KEY_LAST_IO = 'lastIo' as const;

/* ------------------------------------------- container host API contract */

/** Responses of the container host (container/powershell/host/src/main.rs). Validated because they cross a trust boundary: the container runs whatever the user types. */
const hostOpenSchema = zm.object({ state: zm.enum(['created', 'exists', 'full', 'failed']) });
const hostSnapshotSchema = zm.object({
	screen: zm.string(),
	x: zm.int().check(zm.gte(0)),
	y: zm.int().check(zm.gte(0)),
	appCursor: zm.boolean(),
});
const hostWindowsSchema = zm.object({ ids: zm.array(zm.string()) });

/** Per-socket state, persisted with {@link WebSocket.serializeAttachment} so it survives hibernation. */
interface SocketAttachment {
	/** Windows whose output this socket wants. */
	windows: string[];
}

/** Props handed to {@link PowerShellSink} by the intercept, so it knows which sandbox a request came from. */
interface SinkProps {
	sandbox: string;
}

/**
 * One PowerShell sandbox: a Linux container running real `pwsh`, shared by every PowerShell window in one browser.
 *
 * Each window's PowerShell runs detached in its own tmux session named by the window's id, so it doesn't depend on any socket or on this object staying in memory. The container's host process exposes a small HTTP API on {@link HOST_PORT} (create/reattach, input, resize, snapshot, close) and pushes output: tmux `pipe-pane` feeds it, it POSTs to {@link SINK_HOST}, the intercept hands that to {@link PowerShellSink}, which calls {@link PowerShellSandbox.output}. Nothing here holds a long-lived stream, so between bursts the object can hibernate with its sockets open.
 *
 * Nothing persists: after {@link IDLE_MS} without input or output, the alarm destroys the container, closes every socket and deletes all storage.
 */
export class PowerShellSandbox extends DurableObject<EnvVars> {
	/** In-flight container start, shared by concurrent callers. */
	private starting: Promise<void> | undefined;
	/** Epoch ms of the last persisted activity (in memory only; resets on wake, which just causes one extra write). */
	private lastTouch = 0;
	/** Per-window input queue so keystrokes are delivered in order and coalesced while a request is in flight. */
	private readonly pendingInput = new Map<string, string>();
	private readonly flushing = new Set<string>();

	constructor(ctx: DurableObjectState, env: EnvVars) {
		super(ctx, env);

		// Socket-level keepalives shouldn't wake the object or count as activity.
		ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));

		// The inactivity timeout is per instance of this object, so a restarted object has to set it again.
		const container = ctx.container;
		if (container?.running) void ctx.blockConcurrencyWhile(() => container.setInactivityTimeout(IDLE_MS));
	}

	/* ---------------------------------------------------------- lifecycle */

	/** Called once by the API right after Turnstile and the rate limit pass. */
	async init(): Promise<void> {
		if (this.exists) return;
		this.ctx.storage.kv.put(KEY_CREATED, Date.now());
		await this.touch(true);
	}

	private get exists(): boolean {
		return this.ctx.storage.kv.get<number>(KEY_CREATED) !== undefined;
	}

	/** Record activity and push the expiry alarm out. Throttled unless forced. */
	private async touch(force = false): Promise<void> {
		const now = Date.now();
		if (!force && now - this.lastTouch < TOUCH_THROTTLE_MS) return;
		this.lastTouch = now;
		this.ctx.storage.kv.put(KEY_LAST_IO, now);
		await this.ctx.storage.setAlarm(now + IDLE_MS);
	}

	override async alarm(): Promise<void> {
		const lastIo = this.ctx.storage.kv.get<number>(KEY_LAST_IO);
		// Activity since the alarm was set (throttling can leave it up to TOUCH_THROTTLE_MS stale): check again later.
		if (lastIo !== undefined && Date.now() - lastIo < IDLE_MS) {
			await this.ctx.storage.setAlarm(lastIo + IDLE_MS);
			return;
		}
		await this.wipe();
	}

	/** Delete everything: the container (not just stop), every socket, the alarm, and all storage. */
	private async wipe(): Promise<void> {
		for (const ws of this.ctx.getWebSockets()) {
			try {
				ws.close(PsCloseCode.Expired, 'Sandbox expired');
			} catch {
				/* already closed */
			}
		}
		const container = this.ctx.container;
		if (container?.running) await container.destroy('expired');
		await this.ctx.storage.deleteAlarm();
		await this.ctx.storage.deleteAll();
	}

	/* ---------------------------------------------------------- container */

	private get container(): Container {
		const container = this.ctx.container;
		if (!container) throw new Error('No container is configured for PowerShellSandbox');
		return container;
	}

	/** Start the container if needed and wait for its host process. Intercepts and the inactivity timeout live as long as the container, so they're only set on a fresh start. */
	private ensureContainer(): Promise<void> {
		if (this.starting) return this.starting;
		const container = this.container;
		if (container.running) return Promise.resolve();

		this.starting = (async () => {
			try {
				// Register before start so the host can never post before the sink exists.
				await container.interceptOutboundHttp(SINK_HOST, this.ctx.exports.PowerShellSink({ props: { sandbox: this.ctx.id.toString() } satisfies SinkProps }));
				container.start({
					image: container.images['powershell']!,
					instance: 'lite',
					enableInternet: false,
				});
				await container.setInactivityTimeout(IDLE_MS);
				await this.waitForHost();
			} catch (error) {
				if (container.running) await container.destroy();
				throw error;
			} finally {
				this.starting = undefined;
			}
		})();
		return this.starting;
	}

	/** `start()` returns before the container is ready; poll the host's /health until it answers. */
	private async waitForHost(): Promise<void> {
		const deadline = Date.now() + HOST_READY_TIMEOUT_MS;
		for (;;) {
			try {
				const res = await this.container.getTcpPort(HOST_PORT).fetch('http://host/health');
				if (res.ok) return;
			} catch {
				/* not listening yet */
			}
			if (Date.now() >= deadline) throw new Error('PowerShell host did not become ready');
			await scheduler.wait(100);
		}
	}

	/** Call the container host. Returns the response, or undefined if the container isn't running. */
	private async host(path: string, init?: { method: 'GET' | 'PUT' | 'POST' | 'DELETE'; json?: unknown }): Promise<Response | undefined> {
		if (!this.container.running) return undefined;
		try {
			return await this.container.getTcpPort(HOST_PORT).fetch(`http://host${path}`, {
				method: init?.method ?? 'GET',
				headers: init?.json === undefined ? undefined : { 'Content-Type': 'application/json' },
				body: init?.json === undefined ? undefined : JSON.stringify(init.json),
			});
		} catch (error) {
			console.error('PowerShell host request failed', init?.method ?? 'GET', path, String(error));
			throw error;
		}
	}

	/* ------------------------------------------------------------ windows */

	/** Start a window's PowerShell, or reattach to an existing one and send a snapshot of its screen. */
	private async openWindow(ws: WebSocket, w: string, cols: number, rows: number, shell: 'powershell' | 'cmd' = 'powershell'): Promise<void> {
		this.subscribe(ws, w);
		await this.ensureContainer();

		const res = await this.host(`/windows/${w}`, { method: 'PUT', json: { cols, rows, max: MAX_WINDOWS, shell } });
		const parsed = hostOpenSchema.safeParse(res?.ok ? await res.json() : undefined);
		const state = parsed.success ? parsed.data.state : 'failed';

		switch (state) {
			case 'exists':
				await this.sendSnapshot(ws, w);
				return;
			case 'created':
				return;
			case 'full':
				// Sessions nobody is subscribed to belong to tabs that vanished without closing their windows. Reap them and try once more.
				if (await this.reapOrphans()) return this.openWindow(ws, w, cols, rows, shell);
				this.unsubscribe(ws, w);
				this.send(ws, { t: 'error', w, message: `Too many PowerShell windows are open (limit ${MAX_WINDOWS}).` });
				return;
			case 'failed':
				this.unsubscribe(ws, w);
				this.send(ws, { t: 'error', w, message: 'PowerShell failed to start.' });
				return;
		}
	}

	/** Full scrollback + screen with colors, then put the cursor and cursor-key mode back where pwsh left them. */
	private async sendSnapshot(ws: WebSocket, w: string): Promise<void> {
		const res = await this.host(`/windows/${w}/snapshot`);
		const parsed = hostSnapshotSchema.safeParse(res?.ok ? await res.json() : undefined);
		if (!parsed.success) {
			this.exited(w);
			return;
		}
		const { screen, x, y, appCursor } = parsed.data;
		// capture-pane ends every line with \n, including the last one, which would scroll the screen by one.
		const text = screen.replace(/\n$/, '').replaceAll('\n', '\r\n');
		this.send(ws, { t: 'snap', w, d: `${text}\x1b[${y + 1};${x + 1}H${appCursor ? '\x1b[?1h' : '\x1b[?1l'}` });
	}

	/** Queue keystrokes for a window. While one request is in flight, later input is coalesced into the next one. */
	private queueInput(w: string, data: string): void {
		this.pendingInput.set(w, (this.pendingInput.get(w) ?? '') + data);
		if (!this.flushing.has(w)) void this.flushInput(w);
	}

	private async flushInput(w: string): Promise<void> {
		this.flushing.add(w);
		try {
			for (let data = this.pendingInput.get(w); data; data = this.pendingInput.get(w)) {
				this.pendingInput.delete(w);
				const res = await this.host(`/windows/${w}/input`, { method: 'POST', json: { data } });
				// The session died with the container (or never existed): close the window.
				if (!res?.ok) {
					this.exited(w);
					return;
				}
			}
		} finally {
			this.flushing.delete(w);
			this.pendingInput.delete(w);
		}
	}

	private async resizeWindow(w: string, cols: number, rows: number): Promise<void> {
		await this.host(`/windows/${w}/size`, { method: 'PUT', json: { cols, rows } });
	}

	private async closeWindow(w: string): Promise<void> {
		for (const ws of this.ctx.getWebSockets()) this.unsubscribe(ws, w);
		this.pendingInput.delete(w);
		// kill-session takes the pane's whole process tree with it (pwsh and anything it started).
		await this.host(`/windows/${w}`, { method: 'DELETE' });
	}

	/** Kill sessions that no open socket is subscribed to. Returns whether anything was killed. */
	private async reapOrphans(): Promise<boolean> {
		const wanted = new Set(this.ctx.getWebSockets().flatMap((ws) => this.attachment(ws).windows));
		const res = await this.host('/windows');
		const parsed = hostWindowsSchema.safeParse(res?.ok ? await res.json() : undefined);
		if (!parsed.success) return false;
		const orphans = parsed.data.ids.filter((id) => !wanted.has(id));
		for (const id of orphans) await this.host(`/windows/${id}`, { method: 'DELETE' });
		return orphans.length > 0;
	}

	/* ------------------------------------------------ called by the sink */

	/** Fan a window's output out to the sockets that want it, as a binary frame: 16-byte window id + output bytes. Returns false once the sandbox is gone. */
	async output(w: string, data: ArrayBuffer): Promise<boolean> {
		if (!this.exists) return false;

		const frame = new Uint8Array(WINDOW_ID_BYTES + data.byteLength);
		frame.set(uuidToBytes(w), 0);
		frame.set(new Uint8Array(data), WINDOW_ID_BYTES);

		let delivered = false;
		for (const ws of this.ctx.getWebSockets()) {
			if (!this.attachment(ws).windows.includes(w)) continue;
			try {
				ws.send(frame);
				delivered = true;
			} catch {
				/* socket closing */
			}
		}
		// Only output someone is watching counts as activity. Otherwise an orphaned window that keeps printing (or a script in the sandbox posting to the sink itself) would keep the sandbox alive past the 15-minute expiry forever.
		if (delivered) await this.touch();
		return true;
	}

	/** PowerShell exited: tell the windows to close, like the real console does on `exit`. */
	exited(w: string): void {
		for (const ws of this.ctx.getWebSockets()) {
			if (!this.attachment(ws).windows.includes(w)) continue;
			this.send(ws, { t: 'exit', w });
			this.unsubscribe(ws, w);
		}
	}

	/* ------------------------------------------------------------ sockets */

	override fetch(request: Request): Response {
		if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('Expected websocket', { status: 426 });

		const { 0: client, 1: server } = new WebSocketPair();
		if (!this.exists) {
			// Accept just to deliver a close code the client can act on (create a new sandbox).
			server.accept();
			server.close(PsCloseCode.NotFound, 'Sandbox not found');
			return new Response(null, { status: 101, webSocket: client });
		}

		this.ctx.acceptWebSocket(server);
		server.serializeAttachment({ windows: [] } satisfies SocketAttachment);
		return new Response(null, { status: 101, webSocket: client });
	}

	override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
		if (!this.exists) {
			ws.close(PsCloseCode.NotFound, 'Sandbox not found');
			return;
		}

		let parsed: PsClientMessage;
		try {
			if (typeof message !== 'string') throw new Error('Binary frames are not accepted');
			const result = psClientMessageSchema.safeParse(JSON.parse(message));
			if (!result.success) throw result.error;
			parsed = result.data;
		} catch (error) {
			console.warn('PowerShell sandbox rejected a message', error instanceof zm.core.$ZodError ? JSON.stringify(error.issues) : String(error));
			ws.close(PsCloseCode.BadMessage, 'Bad message');
			return;
		}

		await this.touch();

		switch (parsed.t) {
			case 'open':
				await this.openWindow(ws, parsed.w, parsed.cols, parsed.rows, parsed.shell);
				break;
			case 'in':
				this.subscribe(ws, parsed.w);
				this.queueInput(parsed.w, parsed.d);
				break;
			case 'resize':
				await this.resizeWindow(parsed.w, parsed.cols, parsed.rows);
				break;
			case 'close':
				await this.closeWindow(parsed.w);
				break;
			case 'detach':
				this.unsubscribe(ws, parsed.w);
				break;
		}
	}

	override webSocketClose(ws: WebSocket, code: number): void {
		// Sessions stay up: the service worker reconnects and reattaches. Orphans are reaped when the sandbox fills up, and everything goes at expiry.
		try {
			ws.close(code === 1005 || code === 1006 ? 1000 : code, 'Closing');
		} catch {
			/* already closed */
		}
	}

	private attachment(ws: WebSocket): SocketAttachment {
		return (ws.deserializeAttachment() as SocketAttachment | null) ?? { windows: [] };
	}

	private subscribe(ws: WebSocket, w: string): void {
		const { windows } = this.attachment(ws);
		if (windows.includes(w)) return;
		ws.serializeAttachment({ windows: [...windows, w] } satisfies SocketAttachment);
	}

	private unsubscribe(ws: WebSocket, w: string): void {
		const { windows } = this.attachment(ws);
		if (!windows.includes(w)) return;
		ws.serializeAttachment({ windows: windows.filter((id) => id !== w) } satisfies SocketAttachment);
	}

	private send(ws: WebSocket, message: PsServerMessage): void {
		try {
			ws.send(JSON.stringify(message));
		} catch {
			/* socket closing */
		}
	}
}

/**
 * Receives the container host's output POSTs (via `interceptOutboundHttp`) and hands them to the sandbox that registered the intercept. The sandbox id comes from the intercept's props, never from the request, so a container can only ever reach its own sandbox.
 */
export class PowerShellSink extends WorkerEntrypoint<EnvVars, SinkProps> {
	private readonly app = new Hono<{ Bindings: EnvVars }>()
		.post('/out/:w', zValidator('param', zm.object({ w: windowIdSchema })), async (c) => {
			const alive = await this.sandbox().output(c.req.valid('param').w, await c.req.arrayBuffer());
			return c.body(null, alive ? 204 : 410);
		})
		.post('/exit/:w', zValidator('param', zm.object({ w: windowIdSchema })), async (c) => {
			await this.sandbox().exited(c.req.valid('param').w);
			return c.body(null, 204);
		});

	private sandbox() {
		return this.env.POWERSHELL.get(this.env.POWERSHELL.idFromString(this.ctx.props.sandbox));
	}

	override fetch(request: Request): Response | Promise<Response> {
		return this.app.fetch(request, this.env);
	}
}
