/**
 * Shared contracts for the Windows PowerShell app.
 *
 * Three hops carry data:
 * 1. UI thread <-> Service Worker via {@link PsSwCommand} / {@link PsSwEvent} (plain `postMessage` IPC).
 * 2. Service Worker / page <-> sandbox Durable Object over one hibernatable WebSocket per sandbox. Control messages are JSON validated by {@link psClientMessageSchema} / {@link psServerMessageSchema}. Terminal output is a binary frame: the 16 raw bytes of the window's UUIDv7 followed by the output bytes.
 * 3. Container -> Durable Object: `ps-forward` POSTs pane output to an intercepted virtual hostname (see `do/PowerShellSandbox.ts`).
 *
 * Window ids are canonical (hyphenated, lowercase) UUIDv7 strings; inside binary frames they are the 16 raw bytes. A sandbox id is 32 random bytes as 64 lowercase hex characters.
 */
import * as zm from 'zod/mini';

/** Hex length of a sandbox id (32 random bytes). */
export const SANDBOX_ID_HEX_LENGTH = 64 as const;
/** Raw byte length of a window id inside binary output frames. */
export const WINDOW_ID_BYTES = 16 as const;

/** Hard cap on PowerShell windows per sandbox (each is a ~80 MiB pwsh on a 256 MiB `lite` instance). */
export const MAX_WINDOWS = 4 as const;
/** Max characters in one input message (a paste). */
export const MAX_INPUT_LENGTH = 16_384 as const;

/** Console geometry limits. The PowerShell shortcut used a 120-column buffer; rows follow the window height. */
export const MAX_COLS = 300 as const;
export const MAX_ROWS = 200 as const;

/** WebSocket close codes used by the sandbox. A plain object, since close codes arrive as numbers. */
export const PsCloseCode = {
	/** The sandbox expired (15 minutes without input or output) and everything was deleted. */
	Expired: 4410,
	/** The sandbox id does not exist (never created, or already deleted). */
	NotFound: 4404,
	/** The client sent something that failed validation. */
	BadMessage: 4400,
} as const;

/* ------------------------------------------------------------------ ids */

/** A window id: a UUIDv7, compared case-insensitively (normalized to lowercase). */
export const windowIdSchema = zm.pipe(zm.string().check(zm.trim(), zm.toLowerCase()), zm.uuidv7());

/** A sandbox id: 32 random bytes as hex, compared case-insensitively (normalized to lowercase). */
export const sandboxIdSchema = zm.pipe(zm.string().check(zm.trim(), zm.toLowerCase()), zm.hex().check(zm.length(SANDBOX_ID_HEX_LENGTH)));

const colsSchema = zm.int().check(zm.gte(20), zm.lte(MAX_COLS));
const rowsSchema = zm.int().check(zm.gte(5), zm.lte(MAX_ROWS));

/* ------------------------------------------------------------- encoding */

/** Hex string from raw bytes. */
export function bytesToHex(bytes: Uint8Array): string {
	let hex = '';
	for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
	return hex;
}

/** The 16 raw bytes of a canonical UUID string. */
export function uuidToBytes(uuid: string): Uint8Array {
	const hex = uuid.replaceAll('-', '');
	const bytes = new Uint8Array(WINDOW_ID_BYTES);
	for (let i = 0; i < WINDOW_ID_BYTES; i++) bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
	return bytes;
}

/** Canonical lowercase UUID string from its 16 raw bytes. */
export function bytesToUuid(bytes: Uint8Array): string {
	const hex = bytesToHex(bytes.subarray(0, WINDOW_ID_BYTES));
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/* -------------------------------------------------- WebSocket: outbound */

/** Messages a client may send on the sandbox socket. Anything failing this closes the socket with {@link PsCloseCode.BadMessage}. */
export const psClientMessageSchema = zm.discriminatedUnion('t', [
	/** Start a window's PowerShell, or reattach to it if it's already running (the reply is a `snap`). */
	zm.object({
		t: zm.literal('open'),
		w: windowIdSchema,
		cols: colsSchema,
		rows: rowsSchema,
		/** `cmd` makes the window look like Command Prompt that just ran `powershell` (it is still pwsh). Only used when the window is created. */
		shell: zm.optional(zm.enum(['powershell', 'cmd'])),
	}),
	/** Keystrokes / paste, as the terminal emitted them. */
	zm.object({ t: zm.literal('in'), w: windowIdSchema, d: zm.string().check(zm.minLength(1), zm.maxLength(MAX_INPUT_LENGTH)) }),
	zm.object({ t: zm.literal('resize'), w: windowIdSchema, cols: colsSchema, rows: rowsSchema }),
	/** The window was closed: kill its PowerShell. */
	zm.object({ t: zm.literal('close'), w: windowIdSchema }),
	/** Stop routing a window's output to this socket without killing it (e.g. the tab went away). */
	zm.object({ t: zm.literal('detach'), w: windowIdSchema }),
]);
export type PsClientMessage = zm.input<typeof psClientMessageSchema>;

/* --------------------------------------------------- WebSocket: inbound */

/** Control messages the sandbox sends. Output itself arrives as binary frames. */
export const psServerMessageSchema = zm.discriminatedUnion('t', [
	/** Full screen + scrollback of a window, sent on (re)attach. Replaces whatever the terminal showed. */
	zm.object({ t: zm.literal('snap'), w: windowIdSchema, d: zm.string() }),
	/** PowerShell exited (`exit`, or the container lost it). The window should close, like the real console. */
	zm.object({ t: zm.literal('exit'), w: windowIdSchema }),
	/** Opening a window failed (e.g. too many windows). */
	zm.object({ t: zm.literal('error'), w: windowIdSchema, message: zm.string() }),
]);
export type PsServerMessage = zm.output<typeof psServerMessageSchema>;

/* --------------------------------------------- UI thread <-> Service Worker */

/** UI thread -> service worker. */
export type PsSwCommand =
	| { ns: 'pwsh'; cmd: 'connect'; sandboxId: string }
	| { ns: 'pwsh'; cmd: 'send'; sandboxId: string; payload: PsClientMessage }
	/** Ping so Chrome doesn't stop the idle worker (and its socket). Reopens the socket if the worker was recycled. */
	| { ns: 'pwsh'; cmd: 'keepalive'; sandboxId: string };

/** Service worker -> UI thread. Output frames are forwarded as transferable `ArrayBuffer`s. */
// `connId` on `open` is unique per socket, so tabs can tell a reconnect (re-open every window) from another window joining (open only that one).
export type PsSwEvent = { ns: 'pwsh'; evt: 'open'; sandboxId: string; connId: string } | { ns: 'pwsh'; evt: 'message'; sandboxId: string; data: string } | { ns: 'pwsh'; evt: 'output'; sandboxId: string; data: ArrayBuffer } | { ns: 'pwsh'; evt: 'close'; sandboxId: string; code: number };

/* ----------------------------------------------------------------- REST */

/** Response of `POST /api/powershell/sandbox`. */
export interface CreatedSandbox {
	id: string;
}
