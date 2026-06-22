import { $, component$, useSignal, useStore, useVisibleTask$ } from '@builder.io/qwik';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import type { AppInstance } from '~/contexts/types';
import { gravatarUrl, loadProfile, wsBase } from '~/WinXp/apps/Messenger/profile';
import type { RoomMember, ServerMessage } from '~/WinXp/apps/Messenger/types';
import { connectRoom, sendToRoom } from '~/WinXp/apps/Messenger/ws-client';

/** Render user markdown to a sanitized HTML string (browser only). */
function renderMarkdown(md: string): string {
	const raw = marked.parse(md, { async: false, breaks: true, gfm: true });
	return DOMPurify.sanitize(raw, { ADD_ATTR: ['target', 'rel'] });
}

interface ChatLine {
	key: string;
	kind: 'msg' | 'system';
	userId?: string;
	displayName?: string;
	avatar?: string;
	html?: string;
	text?: string;
	ts: number;
}

/** A participant's current identity, looked up by user id when rendering. */
interface Identity {
	avatar?: string;
	displayName?: string;
}

/** Only nudge presence at most once a minute. */
const ACTIVE_THROTTLE_MS = 60_000;

/** Cross-window channel: profile edits in the directory reach open rooms. */
const PROFILE_CHANNEL = 'msmsgs.profile';

/**
 * A single open chatroom. Messages are relayed through the service-worker-held
 * WebSocket; markdown is rendered + sanitized locally and off-domain links are
 * gated behind a confirmation.
 */
export const MessengerRoom = component$<{ app?: AppInstance }>(({ app }) => {
	const roomId = app?.data?.roomId ?? '';
	const roomName = useSignal(app?.data?.roomName ?? 'Conversation');

	const lines = useStore<{ items: ChatLine[] }>({ items: [] });
	const members = useStore<{ list: RoomMember[] }>({ list: [] });
	// Latest known identity per user id, so existing messages re-render when a
	// participant changes their avatar or display name.
	const profiles = useStore<{ map: Record<string, Identity> }>({ map: {} });
	const connected = useSignal(false);
	const draft = useSignal('');
	const meId = useSignal('');
	const scroller = useSignal<HTMLElement>();

	// Connect through the service worker and wire up presence/idle tracking.
	useVisibleTask$((ctx) => {
		if (!roomId) return;

		const profile = loadProfile();
		const url = new URL(`${wsBase}/api/messenger/rooms/${roomId}/ws`);
		if (profile.gravatarHash) url.searchParams.set('avatar', profile.gravatarHash);

		const push = (line: ChatLine) => {
			lines.items = [...lines.items, line].slice(-500);
			requestAnimationFrame(() => scroller.value?.scrollTo({ top: scroller.value.scrollHeight }));
		};

		const upsertIdentity = (userId: string, avatar?: string, displayName?: string) => {
			const prev = profiles.map[userId] ?? {};
			profiles.map = { ...profiles.map, [userId]: { avatar: avatar ?? prev.avatar, displayName: displayName ?? prev.displayName } };
		};

		let lastActiveSent = 0;
		const markActive = () => {
			if (document.visibilityState !== 'visible') return;
			const now = Date.now();
			if (now - lastActiveSent < ACTIVE_THROTTLE_MS) return;
			lastActiveSent = now;
			sendToRoom(roomId, { type: 'active' });
		};

		const onMessage = (msg: ServerMessage) => {
			switch (msg.type) {
				case 'roster':
					roomName.value = msg.name || roomName.value;
					meId.value = msg.you;
					members.list = msg.members;
					for (const m of msg.members) upsertIdentity(m.userId, m.avatar, m.displayName);
					break;
				case 'msg':
					upsertIdentity(msg.userId, msg.avatar, msg.displayName);
					push({ key: `${msg.userId}-${msg.ts}-${Math.random()}`, kind: 'msg', userId: msg.userId, displayName: msg.displayName, avatar: msg.avatar, html: renderMarkdown(msg.body), ts: msg.ts });
					break;
				case 'join':
					if (!members.list.some((m) => m.userId === msg.userId)) members.list = [...members.list, { userId: msg.userId, avatar: msg.avatar, displayName: msg.displayName, lastActive: msg.lastActive }];
					upsertIdentity(msg.userId, msg.avatar, msg.displayName);
					push({ key: `join-${msg.userId}-${Date.now()}`, kind: 'system', text: 'A participant joined the conversation.', ts: Date.now() });
					break;
				case 'leave':
					members.list = members.list.filter((m) => m.userId !== msg.userId);
					push({ key: `leave-${msg.userId}-${Date.now()}`, kind: 'system', text: 'A participant left the conversation.', ts: Date.now() });
					break;
				case 'presence':
					members.list = members.list.map((m) => (m.userId === msg.userId ? { ...m, lastActive: msg.lastActive } : m));
					break;
				case 'profile':
					members.list = members.list.map((m) => (m.userId === msg.userId ? { ...m, avatar: msg.avatar, displayName: msg.displayName } : m));
					upsertIdentity(msg.userId, msg.avatar, msg.displayName);
					break;
			}
		};

		const dispose = connectRoom(roomId, url.toString(), {
			onOpen: () => {
				connected.value = true;
				// Pull the current roster ourselves now that we're connected.
				sendToRoom(roomId, { type: 'roster' });
			},
			onMessage,
			onClose: () => (connected.value = false),
			onError: () => (connected.value = false),
		});

		// Profile edits made elsewhere (e.g. the directory) reflect here live.
		const profileChannel = new BroadcastChannel(PROFILE_CHANNEL);
		profileChannel.onmessage = (e: MessageEvent) => {
			const p = e.data as { displayName?: string; avatar?: string };
			sendToRoom(roomId, { type: 'profile', ...(p.displayName !== undefined ? { displayName: p.displayName } : {}), ...(p.avatar !== undefined ? { avatar: p.avatar } : {}) });
		};

		// --- Idle / activity detection -------------------------------------
		const activityEvents: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'touchstart', 'scroll'];
		const onActivity = () => markActive();
		let idleDetector: { stop?: () => void } | undefined;

		const startIdle = async () => {
			const Idle = (globalThis as unknown as { IdleDetector?: { requestPermission: () => Promise<PermissionState>; new (): EventTarget & { start: (o: { threshold: number; signal: AbortSignal }) => Promise<void>; userState: string; screenState: string } } }).IdleDetector;
			if (Idle) {
				try {
					if ((await Idle.requestPermission()) === 'granted') {
						const controller = new AbortController();
						const detector = new Idle();
						detector.addEventListener('change', () => {
							if (detector.userState === 'active' && detector.screenState === 'locked') return;
							if (detector.userState === 'active') markActive();
						});
						await detector.start({ threshold: 60_000, signal: controller.signal });
						idleDetector = { stop: () => controller.abort() };
						return;
					}
				} catch {
					/* fall through to generic listeners */
				}
			}
			// Fallback when Idle Detection is unavailable or denied.
			for (const ev of activityEvents) addEventListener(ev, onActivity, { passive: true });
		};
		void startIdle();

		const onVisibility = () => markActive();
		document.addEventListener('visibilitychange', onVisibility);

		ctx.cleanup(() => {
			dispose();
			profileChannel.close();
			idleDetector?.stop?.();
			for (const ev of activityEvents) removeEventListener(ev, onActivity);
			document.removeEventListener('visibilitychange', onVisibility);
		});
	});

	const send = $(() => {
		const body = draft.value.trim();
		if (!body || !connected.value) return;
		const profile = loadProfile();
		const displayName = profile.displayName?.trim();
		sendToRoom(roomId, { type: 'msg', body, ...(displayName ? { displayName } : {}) });
		draft.value = '';
	});

	// Off-domain links get a confirmation before opening. The container always
	// prevents the default navigation so links are opened explicitly here.
	const onContentClick = $((event: MouseEvent) => {
		const anchor = (event.target as HTMLElement).closest('a');
		if (!anchor) return;
		const href = anchor.getAttribute('href');
		if (!href) return;
		let dest: URL;
		try {
			dest = new URL(href, location.href);
		} catch {
			return;
		}
		if (dest.host !== location.host) {
			if (confirm(`This link will take you to another website:\n\n${dest.href}\n\nAre you sure you want to visit it?`)) window.open(dest.href, '_blank', 'noopener,noreferrer');
		} else {
			window.open(dest.href, '_blank', 'noopener,noreferrer');
		}
	});

	return (
		<div class="flex h-full flex-col bg-[#eef3fb] text-[11px] text-black">
			{/* Header: room name + id */}
			<div class="flex items-center gap-2 bg-linear-to-b from-[#aec7f5] to-[#cfddf9] px-3 py-1.5">
				<div class="flex min-w-0 flex-col">
					<span class="truncate text-[12px] font-bold text-[#0a246a]">{roomName.value}</span>
					<span class="text-2xs truncate text-[#566]">{roomId}</span>
				</div>
				<span class={`ml-auto h-2 w-2 shrink-0 rounded-full ${connected.value ? 'bg-[#3aa93a]' : 'bg-[#b0b0b0]'}`} title={connected.value ? 'Connected' : 'Disconnected'} />
			</div>

			<div class="flex min-h-0 flex-1">
				{/* Conversation */}
				<div ref={scroller} class="min-h-0 flex-1 overflow-auto bg-white px-2 py-1" preventdefault:click onClick$={onContentClick}>
					{lines.items.length === 0 ? (
						<p class="px-1 py-2 text-[#7f7f7f]">No messages yet. Say hello!</p>
					) : (
						lines.items.map((line) => {
							if (line.kind === 'system')
								return (
									<p key={line.key} class="text-2xs py-0.5 text-center text-[#9a9a9a] italic">
										{line.text}
									</p>
								);

							const identity = line.userId ? profiles.map[line.userId] : undefined;
							const avatar = identity?.avatar ?? line.avatar ?? '';
							const profName = identity?.displayName?.trim();
							const lineName = line.displayName?.trim();
							const name = profName ?? lineName ?? (line.userId === meId.value ? 'You' : 'Guest');

							return (
								<div key={line.key} class="flex gap-2 py-1">
									<img src={gravatarUrl(avatar, 24)} width={24} height={24} alt="" class="h-6 w-6 shrink-0 rounded-sm border border-[#cdd9ec]" />
									<div class="min-w-0">
										<span class="font-bold text-[#0a246a]">{name}</span>
										<div class="messenger-md wrap-break-word" dangerouslySetInnerHTML={line.html ?? ''} />
									</div>
								</div>
							);
						})
					)}
				</div>

				{/* Member list */}
				<div class="w-28 shrink-0 overflow-auto border-l border-[#b6c8e6] bg-[#f6f9fe] px-2 py-1">
					<p class="mb-1 font-bold text-[#0a246a]">In room ({members.list.length})</p>
					<ul>
						{members.list.map((m) => {
							const profName = profiles.map[m.userId]?.displayName?.trim();
							const memberName = m.displayName?.trim();
							const name = profName || memberName || (m.userId === meId.value ? 'You' : `${m.userId.slice(0, 8)}…`);
							return (
								<li key={m.userId} class="flex items-center gap-1 py-0.5">
									<span class="h-2 w-2 shrink-0 rounded-full bg-[#3aa93a]" />
									<span class="truncate" title={m.userId}>
										{name}
									</span>
								</li>
							);
						})}
					</ul>
				</div>
			</div>

			{/* Composer */}
			<div class="flex flex-col gap-1 border-t border-[#b6c8e6] bg-[#f6f9fe] px-2 py-2">
				<textarea
					class="h-14 w-full resize-none border border-[#7f9db9] px-1 py-0.5"
					value={draft.value}
					onInput$={(_, el) => (draft.value = el.value)}
					onKeyDown$={(e) => {
						if (e.key === 'Enter' && !e.shiftKey) {
							e.preventDefault();
							void send();
						}
					}}
					placeholder={connected.value ? 'Type a message (Markdown supported)…' : 'Connecting…'}
				/>
				<button class="self-end rounded-sm border border-[#7f9db9] bg-linear-to-b from-white to-[#dfe8f6] px-4 py-0.5 active:from-[#dfe8f6] active:to-white disabled:opacity-50" disabled={!connected.value} onClick$={send}>
					Send
				</button>
			</div>
		</div>
	);
});
