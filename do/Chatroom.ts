import { DurableObject } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import { count, eq, sql } from 'drizzle-orm/sql';
import { createHash, type UUID } from 'node:crypto';
import { v7 as uuidv7 } from 'uuid';
import * as zm from 'zod/mini';
import { DB_D1_ID, type EnvVars } from '~/types';
import { SQLCache } from '~/utils/sqlCache';
import { clientMessageSchema, type RoomMember } from '~/WinXp/apps/Messenger/types';
import * as schema from '~db/index.js';

/** WebSocket Hibernation API hard limit on concurrent accepted sockets. */
const MAX_SOCKETS = 32_768 as const;
/** Alarm cadence - checked once an hour. */
const HOUR_MS = 3_600_000 as const; // 60 * 60 * 1000
/** Empty rooms older than this (no live sockets) get nuked. */
const EMPTY_TTL_MS = 900_000 as const; // 15 * 60 * 1000

/** Storage keys used inside the Durable Object. */
const KEY_NAME = 'name' as const;
const KEY_LAST_ACTIVE = 'roomLastActive' as const;

/**
 * Per-socket data persisted via {@link WebSocket.serializeAttachment} so it
 * survives hibernation. The user id is *also* stored as the socket's only tag.
 */
export interface SocketAttachment {
	userId: string;
	/** Avatar hash - the supplied Gravatar hash (never the raw email), or a hash of the user id. */
	avatar: string;
	/** Optional display name, updated via a `profile` message. */
	displayName?: string;
	/** Epoch milliseconds of last activity. */
	lastActive: number;
}

/**
 * A single chatroom backed by the WebSocket Hibernation API. Replicates every
 * message to all connected peers and persists nothing about the messages
 * themselves. Lifecycle (creation row, presence, cleanup) is tracked in DO
 * storage + the root D1 `chatrooms` table.
 */
export class Chatroom extends DurableObject<EnvVars> {
	private db;

	constructor(ctx: DurableObjectState, env: EnvVars) {
		super(ctx, env);

		this.db = drizzle(this.env.DB.withSession('first-unconstrained'), {
			schema,
			cache: new SQLCache({
				dbName: DB_D1_ID,
				dbType: 'd1',
				cacheTTL: parseInt(this.env.SQL_TTL, 10),
				strategy: 'all',
			}),
		});

		this._setupCleanup();
		this._wsSetup();
	}

	private _setupCleanup() {
		this.ctx.waitUntil(
			this.ctx.storage.getAlarm({ allowConcurrency: true }).then(async (alarm) => {
				if (!alarm) await this.ctx.storage.setAlarm(Date.now() + HOUR_MS, { allowConcurrency: true });
			}),
		);
	}

	private _wsSetup() {
		this.ctx.waitUntil(
			(async () => {
				// No live (or hibernating) sockets means the room is currently empty - stamp it so the hourly alarm can reap it if it stays that way.
				if (this.ctx.getWebSockets().length === 0 && (await this.ctx.storage.get<number>(KEY_LAST_ACTIVE, { allowConcurrency: true })) === undefined) {
					await this.ctx.storage.put(KEY_LAST_ACTIVE, Date.now(), { allowConcurrency: true });
				}
			})(),
		);
	}

	/* ----------------------------------------------------------------- RPC */

	/**
	 * Called once by the worker right after the DO id is minted to seed the
	 * room name. Rooms are immutable after creation - make a new one to change
	 * settings.
	 */
	public async init(name: string) {
		await this.ctx.storage.put(KEY_NAME, name, { allowConcurrency: true });
	}

	/** Live socket count - used by the directory's lazy per-row loader. */
	public get socketCount() {
		return this.ctx.getWebSockets().length;
	}

	/**
	 * Force-disconnect everyone, drop the root db reference and erase all
	 * storage so the runtime can delete this object.
	 */
	public async nuke(reason?: string) {
		if (reason) console.warn(reason);
		for (const ws of this.ctx.getWebSockets()) {
			try {
				// Don't use 1xxx codes to prevent client auto-reconnects. 4001 is "room closed" in our protocol (matching 1001, but permanent)
				ws.close(4001, 'Room closed');
			} catch {
				/* already closed */
			}
		}
		await this.deleteDbRef();
		await this.ctx.storage.deleteAll();
	}

	/* ------------------------------------------------------------ WebSocket */

	override async fetch(request: Request) {
		request.signal.throwIfAborted();

		if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return new Response('Expected websocket', { status: 426 });
		if (request.method !== 'GET') return new Response('Method not allowed', { status: 405 });
		if (this.ctx.getWebSockets().length >= MAX_SOCKETS) return new Response('Room full', { status: 507 });

		const { avatar } = await zm
			.object({
				avatar: zm.optional(zm.hash('sha256').check(zm.trim())),
			})
			.parseAsync(Object.fromEntries(new URL(request.url).searchParams.entries()));

		// Server-issued identity - the client never supplies its own id.
		const userId = uuidv7() as UUID;

		const { 0: client, 1: server } = new WebSocketPair();
		// User id is the socket's only tag.
		this.ctx.acceptWebSocket(server, [userId]);
		// No Gravatar hash supplied - derive a stable one from the user id so the peer still gets a consistent identicon.
		const attachment: SocketAttachment = { userId, avatar: avatar ?? createHash('sha256').update(userId).digest('hex'), lastActive: Date.now() };
		server.serializeAttachment(attachment);

		// A real connection - cancel any pending empty-room reaping.
		await this.ctx.storage.delete(KEY_LAST_ACTIVE, { allowConcurrency: true });

		// Tell everyone else someone arrived. The joiner pulls the member roster
		// itself by sending a `roster` request right after connecting.
		this.broadcast({ type: 'join', userId, avatar: attachment.avatar, lastActive: attachment.lastActive }, server);

		return new Response(null, { status: 101, webSocket: client });
	}

	override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
		const att = ws.deserializeAttachment() as SocketAttachment | null;
		if (!att) return void ws.close(1011, 'No session');

		let parsed: unknown;
		try {
			parsed = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message));
		} catch {
			// Non-JSON - assume a misbehaving client.
			return void ws.close(1003, 'Invalid payload');
		}

		const result = await clientMessageSchema.safeParseAsync(parsed);
		if (!result.success) return void ws.close(1003, 'Schema violation');
		const data = result.data;

		// Any inbound message counts as activity.
		att.lastActive = Date.now();
		ws.serializeAttachment(att);

		switch (data.type) {
			case 'msg':
				if (data.displayName !== undefined) {
					att.displayName = data.displayName;
					ws.serializeAttachment(att);
				}
				this.broadcast({ type: 'msg', userId: att.userId, avatar: att.avatar, displayName: att.displayName, body: data.body, ts: att.lastActive });
				break;
			case 'active':
				this.broadcast({ type: 'presence', userId: att.userId, lastActive: att.lastActive }, ws);
				break;
			case 'roster':
				// Reply to the requester only with the current membership.
				ws.send(JSON.stringify({ type: 'roster', name: await this.ctx.storage.get<string>(KEY_NAME, { allowConcurrency: true }), you: att.userId, members: this.roster() }));
				break;
			case 'profile':
				if (data.displayName !== undefined) att.displayName = data.displayName;
				if (data.avatar !== undefined) att.avatar = data.avatar;
				ws.serializeAttachment(att);
				// Reflect the new identity to everyone (including the sender).
				this.broadcast({ type: 'profile', userId: att.userId, avatar: att.avatar, displayName: att.displayName });
				break;
		}
	}

	override async webSocketClose(ws: WebSocket): Promise<void> {
		await this.onDisconnect(ws);
	}

	override async webSocketError(ws: WebSocket): Promise<void> {
		await this.onDisconnect(ws);
	}

	private async onDisconnect(ws: WebSocket): Promise<void> {
		const att = ws.deserializeAttachment() as SocketAttachment | null;
		try {
			ws.close();
		} catch {
			/* already closing */
		}
		// All other sockets except the one going away.
		const remaining = this.ctx.getWebSockets().filter((s) => s !== ws);
		if (att) this.broadcast({ type: 'leave', userId: att.userId }, undefined, remaining);
		if (remaining.length === 0) await this.ctx.storage.put(KEY_LAST_ACTIVE, Date.now(), { allowConcurrency: true });
	}

	/* ---------------------------------------------------------------- Alarm */

	override async alarm(): Promise<void> {
		await this.ctx.storage.setAlarm(Date.now() + HOUR_MS, { allowConcurrency: true });

		// Orphan guard: if the root db no longer references this room, kill it.
		if (!(await this.refExists())) return this.nuke();

		// Empty-room reaping.
		const lastActive = await this.ctx.storage.get<number>(KEY_LAST_ACTIVE, { allowConcurrency: true });
		if (this.ctx.getWebSockets().length === 0 && typeof lastActive === 'number' && Date.now() - lastActive > EMPTY_TTL_MS) {
			return this.nuke();
		}
	}

	/* -------------------------------------------------------------- Helpers */

	private roster(): RoomMember[] {
		return this.ctx
			.getWebSockets()
			.map((s) => s.deserializeAttachment() as SocketAttachment | null)
			.filter((a): a is SocketAttachment => a !== null);
	}

	private broadcast(payload: Record<string, unknown>, except?: WebSocket, sockets: WebSocket[] = this.ctx.getWebSockets()): void {
		const msg = JSON.stringify(payload);
		for (const ws of sockets) {
			if (ws === except) continue;
			try {
				ws.send(msg);
			} catch {
				/* socket gone */
			}
		}
	}

	private async refExists(): Promise<boolean> {
		const [row] = await this.db
			.select({ c: count() })
			.from(schema.chatrooms)
			.where(eq(schema.chatrooms.do_id, sql`unhex(${this.ctx.id.toString()})`))
			.$withCache(false);
		return (row?.c ?? 0) > 0;
	}

	private deleteDbRef(): Promise<unknown> {
		return this.db
			.delete(schema.chatrooms)
			.where(eq(schema.chatrooms.do_id, sql`unhex(${this.ctx.id.toString()})`))
			.limit(1);
	}
}
