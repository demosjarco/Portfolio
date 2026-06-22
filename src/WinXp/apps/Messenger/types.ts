/**
 * Shared message contracts for the Windows Messenger feature.
 *
 * Two hops carry data:
 * 1. UI thread <-> Service Worker, via {@link SwCommand} / {@link SwEvent}
 *    (plain `postMessage` IPC — not WebSocket frames, so kept as TS types).
 * 2. Service Worker / page <-> chatroom Durable Object, via WebSocket using
 *    {@link clientMessageSchema} (outbound) and {@link serverMessageSchema}
 *    (inbound). Both ends share these Zod schemas; the message TypeScript
 *    types are derived from them with `zm.input` / `zm.output` rather than
 *    hand-written.
 */
import * as zm from 'zod/mini';

/**
 * Max characters in a single chat message body. Cloudflare caps a WebSocket
 * frame at 32 MiB; 4,000,000 characters stays safely under that even for
 * worst-case 4-byte UTF-8 plus the surrounding JSON envelope.
 */
export const MAX_MESSAGE_LENGTH = 4_000_000 as const;
/** Max characters in a display name. */
export const MAX_DISPLAY_NAME_LENGTH = 64 as const;

/** A SHA-256 hash (Gravatar hash, or one derived from the user id). */
const avatarSchema = zm.hash('sha256');
/** Server-issued participant id. */
const userIdSchema = zm.uuidv7();
const displayNameSchema = zm.string().check(zm.trim(), zm.maxLength(MAX_DISPLAY_NAME_LENGTH));

/** A connected participant as reported by the room roster. */
export const roomMemberSchema = zm.object({
	userId: userIdSchema,
	avatar: avatarSchema,
	displayName: zm.optional(displayNameSchema),
	/** Epoch ms of the peer's last activity. */
	lastActive: zm.number(),
});
export type RoomMember = zm.output<typeof roomMemberSchema>;

/* ---------------------------------------------------- WebSocket: outbound */

/** Messages a client may send. Anything failing this closes the socket. */
export const clientMessageSchema = zm.discriminatedUnion('type', [
	zm.object({
		type: zm.literal('msg'),
		/** Raw markdown — rendered + sanitized on the client, never here. */
		body: zm.string().check(zm.trim(), zm.minLength(1), zm.maxLength(MAX_MESSAGE_LENGTH)),
		displayName: zm.optional(displayNameSchema),
	}),
	/** Heartbeat: "I'm still active." */
	zm.object({ type: zm.literal('active') }),
	/** Request the current member roster (sent right after joining). */
	zm.object({ type: zm.literal('roster') }),
	/** Update this participant's identity (display name and/or avatar). */
	zm.object({
		type: zm.literal('profile'),
		displayName: zm.optional(displayNameSchema),
		avatar: zm.optional(avatarSchema),
	}),
]);
export type ClientMessage = zm.input<typeof clientMessageSchema>;

/* ----------------------------------------------------- WebSocket: inbound */

/** Messages the room broadcasts back to clients. */
export const serverMessageSchema = zm.discriminatedUnion('type', [
	/** Reply to a `roster` request: room name, your id, and current members. */
	zm.object({
		type: zm.literal('roster'),
		name: zm.string(),
		you: userIdSchema,
		members: zm.array(roomMemberSchema),
	}),
	zm.object({
		type: zm.literal('msg'),
		userId: userIdSchema,
		avatar: avatarSchema,
		displayName: zm.optional(displayNameSchema),
		body: zm.string(),
		ts: zm.number(),
	}),
	zm.object({
		type: zm.literal('join'),
		userId: userIdSchema,
		avatar: avatarSchema,
		displayName: zm.optional(displayNameSchema),
		lastActive: zm.number(),
	}),
	zm.object({
		type: zm.literal('leave'),
		userId: userIdSchema,
	}),
	zm.object({
		type: zm.literal('presence'),
		userId: userIdSchema,
		lastActive: zm.number(),
	}),
	/** A participant changed their display name and/or avatar. */
	zm.object({
		type: zm.literal('profile'),
		userId: userIdSchema,
		avatar: avatarSchema,
		displayName: zm.optional(displayNameSchema),
	}),
]);
export type ServerMessage = zm.output<typeof serverMessageSchema>;

/* ------------------------------------------------ UI thread <-> Service Worker */

/** UI thread -> service worker. (Plain IPC, not a WebSocket frame.) */
export type SwCommand =
	| {
			ns: 'msmsgs';
			cmd: 'connect';
			roomId: string;
			wsUrl: string;
	  }
	| {
			ns: 'msmsgs';
			cmd: 'send';
			roomId: string;
			payload: ClientMessage;
	  }
	| {
			ns: 'msmsgs';
			cmd: 'disconnect';
			roomId: string;
	  }
	| {
			// Keeps the (idle-terminated) worker alive and reconnects the room
			// if the worker was already recycled. Carries `wsUrl` so the worker
			// can reopen the socket from scratch.
			ns: 'msmsgs';
			cmd: 'keepalive';
			roomId: string;
			wsUrl: string;
	  };

/** Service worker -> UI thread. */
export type SwEvent =
	| {
			ns: 'msmsgs';
			evt: 'open';
			roomId: string;
	  }
	| {
			ns: 'msmsgs';
			evt: 'message';
			roomId: string;
			data: ServerMessage;
	  }
	| {
			ns: 'msmsgs';
			evt: 'close';
			roomId: string;
			code: number;
	  }
	| {
			ns: 'msmsgs';
			evt: 'error';
			roomId: string;
	  };

/* ------------------------------------------------------------------- REST */

/** A chatroom row as returned by `GET /api/messenger/rooms`. */
export interface RoomListing {
	id: string;
	name: string;
	b_time: number;
}

/** A page of chatrooms from `GET /api/messenger/rooms`. */
export interface RoomPage {
	rooms: RoomListing[];
	/** Pass back as `?cursor=` to fetch the next (older) page, or `null` at the end. */
	nextCursor: string | null;
}
