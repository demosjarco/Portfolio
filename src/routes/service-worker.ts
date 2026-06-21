import type { ServerMessage, SwCommand, SwEvent } from '~/WinXp/apps/Messenger/types';

addEventListener('install', () => self.skipWaiting());

addEventListener('activate', () => self.clients.claim());

declare const self: ServiceWorkerGlobalScope;

/**
 * Windows Messenger chatroom sockets.
 *
 * The service worker owns every room WebSocket so that a single connection is
 * shared and its lifecycle is decoupled from any one tab. UI threads relay
 * intent via {@link SwCommand} postMessages and receive {@link SwEvent}
 * broadcasts in return.
 */
const rooms = new Map<string, WebSocket>();

/** Broadcast an event to every controlled client (i.e. open tabs). */
async function broadcast(event: SwEvent): Promise<void> {
	const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
	for (const client of clients) client.postMessage(event);
}

function openRoom(roomId: string, wsUrl: string): void {
	// One socket per room — reuse if already open/connecting.
	const existing = rooms.get(roomId);
	if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
		if (existing.readyState === WebSocket.OPEN) void broadcast({ ns: 'msmsgs', evt: 'open', roomId });
		return;
	}

	const ws = new WebSocket(wsUrl);
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

function closeRoom(roomId: string): void {
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
	}
});

// On teardown (a new worker taking over) drop every socket cleanly.
addEventListener('activate', () => {
	for (const [roomId] of rooms) closeRoom(roomId);
});
