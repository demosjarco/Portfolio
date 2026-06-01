import { $, component$, useContext, useSignal, useVisibleTask$, type QRL } from '@builder.io/qwik';
import { WindowManagerContext } from '~/contexts';
import type { AppInstance, WindowManagerState } from '~/contexts/types';
import { appRegistry } from '~/WinXp/apps/registry';
import { focusApp, focusedAppId, taskbarClick } from '~/WinXp/dwm/actions';

/**
 * Below this per-button width (px) the title is truncated so aggressively that
 * XP switches to grouping windows of the same program into one button. We use
 * it to decide taskbar capacity.
 */
const MIN_BUTTON_WIDTH = 120;

/**
 * Taskbar window buttons.
 *
 * Mirrors XP behaviour:
 *  - One button per open window, sharing the available width (they shrink as
 *    more windows open).
 *  - Active window button is shown pressed/lit; others are raised.
 *  - Clicking the active window's button minimizes it; clicking any other
 *    focuses/restores it.
 *  - When there isn't enough room to show titles without over-truncating,
 *    windows belonging to the same program are auto-grouped into a single
 *    button (with a count), exactly like real XP taskbar grouping.
 */
export default component$(() => {
	const wm = useContext(WindowManagerContext);
	const containerRef = useSignal<HTMLDivElement>();
	const containerWidth = useSignal(0);

	// Track the available width so we can decide when to start grouping.
	// eslint-disable-next-line @typescript-eslint/unbound-method
	useVisibleTask$(({ cleanup }) => {
		const el = containerRef.value;
		if (!el) return;
		const ro = new ResizeObserver((entries) => {
			for (const entry of entries) containerWidth.value = entry.contentRect.width;
		});
		ro.observe(el);
		containerWidth.value = el.clientWidth;
		cleanup(() => ro.disconnect());
	});

	const focused = focusedAppId(wm);
	const apps = wm.apps;

	// Capacity = how many ungrouped buttons fit before titles truncate too much.
	const capacity = Math.max(1, Math.floor(containerWidth.value / MIN_BUTTON_WIDTH));
	const shouldGroup = apps.length > capacity;

	return (
		<div ref={containerRef} class="flex min-w-0 flex-1 items-center gap-[3px] overflow-hidden px-1">
			{shouldGroup ? <GroupedButtons apps={apps} focused={focused} wm={wm} /> : apps.map((app) => <TaskbarButton key={app.id} app={app} isFocus={focused === app.id} onClick$={$(() => taskbarClick(wm, app.id))} />)}
		</div>
	);
});

/** A single (ungrouped) taskbar window button. */
const TaskbarButton = component$<{ app: AppInstance; isFocus: boolean; onClick$: QRL<() => void> }>(({ app, isFocus, onClick$ }) => {
	const Icon = appRegistry[app.appKey].Icon;
	return (
		<button type="button" title={app.title} onClick$={onClick$} class={['flex h-[22px] min-w-0 flex-1 items-center gap-1.5 rounded-[2px] px-2 text-[11px] text-white', isFocus ? 'bg-[#1e52b7] shadow-[inset_0_0_1px_1px_rgba(0,0,0,0.2),inset_1px_0_1px_rgba(0,0,0,0.7)]' : 'bg-[#3c81f3] shadow-[inset_-1px_0_rgba(0,0,0,0.3),inset_1px_1px_1px_rgba(255,255,255,0.2)] hover:bg-[#53a3ff]']} style={{ 'max-width': '160px' }}>
			<Icon class="h-4 w-4 shrink-0" />
			<span class="truncate">{app.title}</span>
		</button>
	);
});

/**
 * Grouped view: one button per program (appKey) showing the window count.
 * Clicking focuses the most-recently-used window in that group.
 */
const GroupedButtons = component$<{ apps: AppInstance[]; focused: number; wm: WindowManagerState }>(({ apps, focused, wm }) => {
	// Preserve insertion order of first appearance per appKey.
	const groups = new Map<string, AppInstance[]>();
	for (const app of apps) {
		const list = groups.get(app.appKey) ?? [];
		list.push(app);
		groups.set(app.appKey, list);
	}

	return (
		<>
			{[...groups.entries()].map(([appKey, list]) => {
				const Icon = appRegistry[list[0]!.appKey].Icon;
				const groupFocused = list.some((a) => a.id === focused);
				const top = [...list].sort((a, b) => b.zIndex - a.zIndex)[0]!;
				return (
					<button key={appKey} type="button" title={`${list[0]!.title} (${list.length})`} onClick$={$(() => focusApp(wm, top.id))} class={['flex h-[22px] min-w-0 flex-1 items-center gap-1.5 rounded-[2px] px-2 text-[11px] text-white', groupFocused ? 'bg-[#1e52b7] shadow-[inset_0_0_1px_1px_rgba(0,0,0,0.2),inset_1px_0_1px_rgba(0,0,0,0.7)]' : 'bg-[#3c81f3] shadow-[inset_-1px_0_rgba(0,0,0,0.3),inset_1px_1px_1px_rgba(255,255,255,0.2)] hover:bg-[#53a3ff]']} style={{ 'max-width': '160px' }}>
						<Icon class="h-4 w-4 shrink-0" />
						<span class="truncate">{list[0]!.title}</span>
						<span class="ml-auto shrink-0 font-bold">{list.length}</span>
					</button>
				);
			})}
		</>
	);
});
