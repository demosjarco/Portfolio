/**
 * UI-thread client for a chatroom WebSocket.
 *
 * Primary path: a single service worker owns every socket and relays traffic
 * as {@link SwCommand} / {@link SwEvent} postMessages, so connections survive
 * across tabs and are torn down by the worker's own lifecycle.
 *
 * Fallback path: when no service worker controls the page (e.g. local dev,
 * where the SW isn't served, or browsers that block it), we open the
 * WebSocket directly on the main thread so chat still works.
 */
import type { ClientMessage, ServerMessage, SwCommand, SwEvent } from '~/WinXp/apps/Messenger/types';

interface RoomHandlers {
	onOpen?: () => void;
	onMessage: (msg: ServerMessage) => void;
	onClose?: (code: number) => void;
	onError?: () => void;
}

/** True when a service worker is active and controlling this page. */
function swControlled() {
	return 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;
}

/* ------------------------------------------------------- direct fallback */

/** Sockets opened directly on the main thread (keyed by room id). */
const directSockets = new Map<string, WebSocket>();

function connectDirect(roomId: string, wsUrl: string, handlers: RoomHandlers): () => void {
	const ws = new WebSocket(wsUrl);
	directSockets.set(roomId, ws);

	ws.addEventListener('open', () => handlers.onOpen?.());
	ws.addEventListener('message', (event) => {
		try {
			const data = JSON.parse(typeof event.data === 'string' ? event.data : '') as ServerMessage;
			handlers.onMessage(data);
		} catch {
			/* ignore non-JSON frames */
		}
	});
	ws.addEventListener('close', (event) => {
		directSockets.delete(roomId);
		handlers.onClose?.(event.code);
	});
	ws.addEventListener('error', () => handlers.onError?.());

	return () => {
		directSockets.delete(roomId);
		try {
			ws.close(1000, 'Client left');
		} catch {
			/* already closing */
		}
	};
}

/* -------------------------------------------------- service worker path */

/** Post a command to the controlling service worker. */
function post(cmd: SwCommand): void {
	navigator.serviceWorker.controller?.postMessage(cmd);
}

function connectViaWorker(roomId: string, wsUrl: string, handlers: RoomHandlers): () => void {
	const listener = (event: MessageEvent) => {
		const data = event.data as SwEvent | undefined;
		if (data?.ns !== 'msmsgs' || data.roomId !== roomId) return;
		switch (data.evt) {
			case 'open':
				handlers.onOpen?.();
				break;
			case 'message':
				handlers.onMessage(data.data);
				break;
			case 'close':
				handlers.onClose?.(data.code);
				break;
			case 'error':
				handlers.onError?.();
				break;
		}
	};

	navigator.serviceWorker.addEventListener('message', listener);
	post({ ns: 'msmsgs', cmd: 'connect', roomId, wsUrl });

	return () => {
		navigator.serviceWorker.removeEventListener('message', listener);
		post({ ns: 'msmsgs', cmd: 'disconnect', roomId });
	};
}

/* ---------------------------------------------------------------- public */

/**
 * Subscribe to a room. Returns a disposer that detaches listeners and drops
 * the socket. Uses the service worker when available, otherwise a direct
 * main-thread socket.
 */
export function connectRoom(roomId: string, wsUrl: string, handlers: RoomHandlers): () => void {
	return swControlled() ? connectViaWorker(roomId, wsUrl, handlers) : connectDirect(roomId, wsUrl, handlers);
}

/** Send a message into a room over whichever transport owns its socket. */
export function sendToRoom(roomId: string, payload: ClientMessage): void {
	if (swControlled()) {
		post({ ns: 'msmsgs', cmd: 'send', roomId, payload });
		return;
	}
	const ws = directSockets.get(roomId);
	if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
}
