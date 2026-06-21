import { $, component$, Resource, useContext, useResource$, useSignal, useStore, useTask$, useVisibleTask$ } from '@builder.io/qwik';
import type { TurnstileObject } from 'turnstile-types';
import { TurnstileSiteKeyContext, WindowManagerContext } from '~/contexts';
import { AppKey, type AppInstance } from '~/contexts/types';
import { apiBase, gravatarHash, gravatarUrl, loadProfile, saveProfile, type MessengerProfile } from '~/WinXp/apps/Messenger/profile';
import type { RoomListing, RoomPage } from '~/WinXp/apps/Messenger/types';
import { launchApp } from '~/WinXp/dwm/actions';

/** Re-poll the directory this often once the previous load has finished. */
const AUTO_REFRESH_MS = 30_000;

/**
 * `window.turnstile` is typed as always-present by `turnstile-types`, but the
 * script loads asynchronously, so read it through this accessor that admits
 * `undefined` until it's ready.
 */
function turnstileApi(): TurnstileObject | undefined {
	return (window as Window & { turnstile?: TurnstileObject }).turnstile;
}

/** Resolve once `window.turnstile` is available (or give up after ~10s). */
function waitForTurnstile(): Promise<TurnstileObject | undefined> {
	return new Promise((resolve) => {
		const ready = turnstileApi();
		if (ready) {
			resolve(ready);
			return;
		}
		let tries = 0;
		const iv = setInterval(() => {
			const ts = turnstileApi();
			if (ts) {
				clearInterval(iv);
				resolve(ts);
			} else if (++tries > 100) {
				clearInterval(iv);
				resolve(undefined);
			}
		}, 100);
	});
}

/**
 * Live socket count for a single room, lazily fetched per row so the directory
 * doesn't fan out one request up-front for every room.
 */
const RoomCount = component$<{ roomId: string }>(({ roomId }) => {
	const countResource = useResource$<number>(async (ctx) => {
		ctx.track(() => roomId);
		const controller = new AbortController();
		ctx.cleanup(() => controller.abort());
		const res = await fetch(`${apiBase}/api/messenger/rooms/${roomId}/count`, { signal: controller.signal });
		if (!res.ok) throw new Error('count failed');
		const json = await res.json<{ count: number }>();
		return json.count;
	});

	return <Resource value={countResource} onPending={() => <span class="text-[#7f7f7f]">…</span>} onRejected={() => <span class="text-[#7f7f7f]">—</span>} onResolved={(count) => <span class="text-[#2a6a2a]">{count} online</span>} />;
});

/**
 * The Windows Messenger main window: your profile header plus a directory of
 * chatrooms you can search, create and open. Only ever one of these exists.
 */
export const MessengerDirectory = component$<{ app?: AppInstance }>(() => {
	const wm = useContext(WindowManagerContext);
	// SSG-hardcoded Turnstile site key (no extra request needed).
	const turnstileSiteKey = useContext(TurnstileSiteKeyContext);

	const profile = useStore<MessengerProfile>({});
	const emailInput = useSignal('');
	const editingProfile = useSignal(false);

	const rooms = useStore<{ list: RoomListing[]; loading: boolean; loadingMore: boolean; error: boolean; nextCursor: string | null; lastUpdated: number | null }>({ list: [], loading: true, loadingMore: false, error: false, nextCursor: null, lastUpdated: null });
	const search = useSignal('');
	const newRoomName = useSignal('');

	// --- Turnstile (gates room creation) ---------------------------------
	const turnstileWidget = useSignal<HTMLDivElement>();
	const turnstileWidgetId = useSignal('');
	const turnstileToken = useSignal('');
	/** Token in hand — the Create button is enabled. */
	const turnstileReady = useSignal(false);
	/** A challenge needs visible interaction — show the XP callout. */
	const showChallenge = useSignal(false);
	/** A challenge is already running for the current input. */
	const challengeRunning = useSignal(false);

	// Hydrate the saved profile on mount.
	useVisibleTask$(() => {
		const saved = loadProfile();
		profile.displayName = saved.displayName;
		profile.gravatarHash = saved.gravatarHash;
	});

	// Render the Turnstile widget once the (always-loaded) script is ready.
	useVisibleTask$((ctx) => {
		let widgetId: string | undefined;
		let cancelled = false;
		const isCancelled = () => cancelled;

		void (async () => {
			const ts = await waitForTurnstile();
			if (isCancelled() || !ts || !turnstileWidget.value || !turnstileSiteKey.value) return;

			widgetId = ts.render(turnstileWidget.value, {
				sitekey: turnstileSiteKey.value,
				appearance: 'interaction-only',
				execution: 'execute',
				action: 'messenger-create-room',
				callback: (token: string) => {
					turnstileToken.value = token;
					turnstileReady.value = true;
					challengeRunning.value = false;
				},
				'before-interactive-callback': () => (showChallenge.value = true),
				'after-interactive-callback': () => (showChallenge.value = false),
				'expired-callback': () => {
					turnstileReady.value = false;
					turnstileToken.value = '';
					challengeRunning.value = false;
				},
				'error-callback': () => {
					turnstileReady.value = false;
					turnstileToken.value = '';
					challengeRunning.value = false;
					showChallenge.value = false;
					return false;
				},
			});
			turnstileWidgetId.value = widgetId;
		})();

		ctx.cleanup(() => {
			cancelled = true;
			const ts = turnstileApi();
			if (ts && widgetId) ts.remove(widgetId);
		});
	});

	/** Kick off the (interaction-only) challenge the first time the user types. */
	const startChallenge = $(() => {
		if (turnstileReady.value || challengeRunning.value || !turnstileWidgetId.value) return;
		const ts = turnstileApi();
		if (!ts) return;
		challengeRunning.value = true;
		ts.execute(turnstileWidgetId.value);
	});

	const fetchPage = $(async (cursor: string | null): Promise<RoomPage | undefined> => {
		const url = new URL(`${apiBase}/api/messenger/rooms`, location.href);
		if (search.value.trim()) url.searchParams.set('search', search.value.trim());
		if (cursor) url.searchParams.set('cursor', cursor);
		const res = await fetch(url);
		if (!res.ok) throw new Error('list failed');
		const page = await res.json<RoomPage>();
		return page;
	});

	const refresh = $(async () => {
		rooms.loading = true;
		rooms.error = false;
		try {
			const page = await fetchPage(null);
			rooms.list = page?.rooms ?? [];
			rooms.nextCursor = page?.nextCursor ?? null;
			rooms.lastUpdated = Date.now();
		} catch {
			rooms.error = true;
		} finally {
			rooms.loading = false;
		}
	});

	const loadMore = $(async () => {
		if (!rooms.nextCursor || rooms.loadingMore) return;
		rooms.loadingMore = true;
		try {
			const page = await fetchPage(rooms.nextCursor);
			rooms.list = [...rooms.list, ...(page?.rooms ?? [])];
			rooms.nextCursor = page?.nextCursor ?? null;
		} catch {
			rooms.error = true;
		} finally {
			rooms.loadingMore = false;
		}
	});

	// Initial load + reload on search changes (debounced).
	useTask$((ctx) => {
		ctx.track(() => search.value);
		const t = setTimeout(() => void refresh(), 250);
		ctx.cleanup(() => clearTimeout(t));
	});

	// Auto-refresh: 30s after each load settles, poll again.
	useVisibleTask$((ctx) => {
		let stopped = false;
		const isStopped = () => stopped;
		let timer: ReturnType<typeof setTimeout>;
		const tick = async () => {
			if (isStopped()) return;
			await refresh();
			if (isStopped()) return;
			timer = setTimeout(() => void tick(), AUTO_REFRESH_MS);
		};
		timer = setTimeout(() => void tick(), AUTO_REFRESH_MS);
		ctx.cleanup(() => {
			stopped = true;
			clearTimeout(timer);
		});
	});

	const openRoom = $((roomId: string, roomName: string) => {
		launchApp(wm, AppKey.MessengerRoom, { instanceKey: roomId, data: { roomId, roomName }, title: roomName });
	});

	const createRoom = $(async () => {
		const name = newRoomName.value.trim();
		if (!name || !turnstileReady.value) return;
		try {
			const res = await fetch(`${apiBase}/api/messenger/rooms`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ name, turnstile: turnstileToken.value }),
			});
			if (!res.ok) throw new Error('create failed');
			const room = await res.json<RoomListing>();
			newRoomName.value = '';
			// Optimistically prepend (the list is newest-first); the 30s
			// auto-refresh will reconcile soon anyway.
			rooms.list = [room, ...rooms.list];
			await openRoom(room.id, room.name);
		} catch {
			rooms.error = true;
		} finally {
			// Turnstile tokens are single-use — reset for the next room.
			const ts = turnstileApi();
			if (ts && turnstileWidgetId.value) ts.reset(turnstileWidgetId.value);
			turnstileReady.value = false;
			turnstileToken.value = '';
			challengeRunning.value = false;
		}
	});

	const saveProfileChanges = $(async () => {
		profile.gravatarHash = await gravatarHash(emailInput.value);
		emailInput.value = '';
		saveProfile({ displayName: profile.displayName, gravatarHash: profile.gravatarHash });
		// Tell any open room windows to reflect the new identity immediately.
		const displayName = profile.displayName?.trim();
		const channel = new BroadcastChannel('msmsgs.profile');
		channel.postMessage({ ...(displayName ? { displayName } : {}), avatar: profile.gravatarHash });
		channel.close();
		editingProfile.value = false;
	});

	return (
		<div class="flex h-full flex-col bg-[#eef3fb] text-[11px] text-black">
			{/* Identity header — the iconic blue gradient bar */}
			<div class="flex items-center gap-2 bg-linear-to-b from-[#aec7f5] to-[#cfddf9] px-3 py-2">
				<img src={gravatarUrl(profile.gravatarHash ?? '', 40)} width={40} height={40} alt="" class="h-10 w-10 rounded-sm border border-white shadow-sm" />
				<div class="flex min-w-0 flex-col">
					<span class="truncate text-[12px] font-bold text-[#0a246a]">{profile.displayName?.trim() ? profile.displayName.trim() : 'Click here to set your name'}</span>
					<button class="text-2xs self-start text-[#1b50c4] underline" onClick$={() => (editingProfile.value = !editingProfile.value)}>
						{editingProfile.value ? 'Close' : 'Personal Settings…'}
					</button>
				</div>
			</div>

			{/* Profile editor */}
			{editingProfile.value && (
				<div class="border-y border-[#b6c8e6] bg-white px-3 py-2">
					<label class="mb-1 block font-bold text-[#0a246a]">Display name</label>
					<input class="mb-2 w-full border border-[#7f9db9] px-1 py-0.5" value={profile.displayName ?? ''} maxLength={64} onInput$={(_, el) => (profile.displayName = el.value)} placeholder="(optional)" />
					<label class="mb-1 block font-bold text-[#0a246a]">Gravatar email</label>
					<input class="mb-1 w-full border border-[#7f9db9] px-1 py-0.5" type="email" value={emailInput.value} onInput$={(_, el) => (emailInput.value = el.value)} placeholder="you@example.com (optional)" />
					<p class="text-2xs mb-2 text-[#7f7f7f]">Your email is never stored — only the computed Gravatar address.</p>
					<button class="rounded-sm border border-[#7f9db9] bg-linear-to-b from-white to-[#dfe8f6] px-3 py-0.5 active:from-[#dfe8f6] active:to-white" onClick$={saveProfileChanges}>
						Save
					</button>
				</div>
			)}

			{/* Create + search toolbar */}
			<div class="flex flex-col gap-1 border-b border-[#b6c8e6] bg-[#f6f9fe] px-3 py-2">
				<div class="relative flex gap-1">
					<input
						class="min-w-0 flex-1 border border-[#7f9db9] px-1 py-0.5"
						value={newRoomName.value}
						maxLength={100}
						onInput$={(_, el) => {
							newRoomName.value = el.value;
							if (el.value.trim()) void startChallenge();
						}}
						placeholder="New chatroom name…"
						onKeyDown$={(e) => e.key === 'Enter' && void createRoom()}
					/>
					<script async defer src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"></script>
					<button class="rounded-sm border border-[#7f9db9] bg-linear-to-b from-white to-[#dfe8f6] px-2 py-0.5 whitespace-nowrap not-disabled:active:from-[#dfe8f6] not-disabled:active:to-white disabled:cursor-not-allowed disabled:opacity-50" disabled={!turnstileReady.value || !newRoomName.value.trim()} onClick$={createRoom}>
						Create
					</button>

					{/* Windows XP-style callout shown only when a challenge needs interaction.
					    Opens downward into the window so it's never clipped by the titlebar. */}
					<div class={['absolute top-full right-0 z-50 mt-2 w-75 max-w-full transition-opacity', showChallenge.value ? 'opacity-100' : 'pointer-events-none opacity-0']}>
						<div class="relative rounded-md border border-[#d4b106] bg-[#ffffe1] p-2 shadow-[2px_2px_6px_rgba(0,0,0,0.35)]">
							{/* upward pointer toward the input */}
							<span class="absolute -top-1.75 right-6 h-0 w-0 border-x-8 border-b-8 border-x-transparent border-b-[#d4b106]" />
							<span class="absolute -top-1.25 right-6 h-0 w-0 border-x-8 border-b-8 border-x-transparent border-b-[#ffffe1]" />
							<p class="text-2xs mb-1 font-bold text-[#003399]">Quick check — please verify you're human</p>
							<div ref={turnstileWidget} />
						</div>
					</div>
				</div>
				<input class="w-full border border-[#7f9db9] px-1 py-0.5" value={search.value} onInput$={(_, el) => (search.value = el.value)} placeholder="Search chatrooms…" />
			</div>

			{/* Directory list */}
			<div class="min-h-0 flex-1 overflow-auto bg-white px-1 py-1">
				{rooms.loading ? (
					<p class="px-2 py-3 text-[#7f7f7f]">Loading chatrooms…</p>
				) : rooms.error ? (
					<p class="px-2 py-3 text-[#a40000]">Couldn't reach the chatroom directory.</p>
				) : rooms.list.length === 0 ? (
					<p class="px-2 py-3 text-[#7f7f7f]">No chatrooms yet. Create one above!</p>
				) : (
					<ul>
						{rooms.list.map((room) => (
							<li key={room.id}>
								<button class="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left hover:bg-[#e7eefb]" onDblClick$={() => openRoom(room.id, room.name)} onClick$={() => openRoom(room.id, room.name)}>
									<span class="h-2 w-2 shrink-0 rounded-full bg-[#3aa93a]" />
									<span class="flex min-w-0 flex-1 flex-col">
										<span class="truncate font-bold text-[#0a246a]">{room.name}</span>
										<span class="text-2xs truncate text-[#9a9a9a]">{room.id}</span>
									</span>
									<RoomCount roomId={room.id} />
								</button>
							</li>
						))}
						{rooms.nextCursor && (
							<li class="px-2 py-1">
								<button class="w-full rounded-sm border border-[#7f9db9] bg-linear-to-b from-white to-[#dfe8f6] px-2 py-0.5 active:from-[#dfe8f6] active:to-white disabled:opacity-50" disabled={rooms.loadingMore} onClick$={loadMore}>
									{rooms.loadingMore ? 'Loading…' : 'Load more'}
								</button>
							</li>
						)}
					</ul>
				)}
			</div>

			{/* "I want to..." footer panel */}
			<div class="text-2xs flex items-center gap-2 border-t border-[#b6c8e6] bg-linear-to-b from-[#eef3fb] to-[#dbe6f8] px-3 py-1 text-[#0a246a]">
				<button class="underline" onClick$={refresh}>
					Refresh list
				</button>
				<span class="text-[#5a6b86]">{rooms.lastUpdated ? `Updated ${new Date(rooms.lastUpdated).toLocaleTimeString()}` : 'Never updated'}</span>
			</div>
		</div>
	);
});
