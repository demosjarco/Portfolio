import type { AppInstance, AppKey, WindowManagerState } from '~/contexts/types';
import { Focusing } from '~/contexts/types';
import { appRegistry } from '~/WinXp/apps/registry';

/**
 * Pure helpers that mutate the Desktop Window Manager (DWM) store in place.
 *
 * These intentionally operate on the Qwik store object directly (Qwik proxies
 * make mutation reactive), which keeps event handlers tiny and the behaviour
 * easy to unit-reason-about — the equivalent of the reducer cases in the
 * original React winXP, but without the boilerplate.
 */

/** Default cascade offset so successive windows don't stack exactly. */
const CASCADE_STEP = 24;

/**
 * The id of the window that should currently render as focused: the top-most
 * (highest z-index) non-minimized window, or -1 when focus is elsewhere.
 */
export function focusedAppId(state: WindowManagerState): number {
	if (state.focusing !== Focusing.window) return -1;
	const top = [...state.apps].filter((a) => !a.minimized).sort((a, b) => b.zIndex - a.zIndex)[0];
	return top ? top.id : -1;
}

/**
 * Launch an app, or refocus an existing window instead of opening a duplicate.
 *
 * Dedupe rules:
 * - When `opts.instanceKey` is given, an existing window with the same
 *   {@link AppKey} *and* instance key is refocused (e.g. one window per
 *   chatroom).
 * - Otherwise, single-instance apps refocus their lone existing window.
 */
export function launchApp(state: WindowManagerState, appKey: AppKey, opts?: { instanceKey?: string; data?: AppInstance['data']; title?: string }): void {
	const entry = appRegistry[appKey];

	const existing = opts?.instanceKey !== undefined ? state.apps.find((a) => a.appKey === appKey && a.instanceKey === opts.instanceKey) : entry.singleInstance ? state.apps.find((a) => a.appKey === appKey) : undefined;
	if (existing) {
		focusApp(state, existing.id);
		return;
	}

	const id = state.nextAppId;
	const offset = (state.apps.length % 6) * CASCADE_STEP;
	const win: AppInstance = {
		id,
		appKey,
		title: opts?.title ?? entry.title,
		zIndex: state.nextZIndex,
		minimized: false,
		maximized: false,
		x: 80 + offset,
		y: 60 + offset,
		width: entry.defaultSize.width,
		height: entry.defaultSize.height,
		instanceKey: opts?.instanceKey,
		data: opts?.data,
	};

	state.apps = [...state.apps, win];
	state.nextAppId += 1;
	state.nextZIndex += 1;
	state.focusing = Focusing.window;
}

/** Bring a window to the front, restoring it if it was minimized. */
export function focusApp(state: WindowManagerState, id: number): void {
	state.apps = state.apps.map((a) => (a.id === id ? { ...a, zIndex: state.nextZIndex, minimized: false } : a));
	state.nextZIndex += 1;
	state.focusing = Focusing.window;
}

/** Minimize a window (hidden, but kept on the taskbar). */
export function minimizeApp(state: WindowManagerState, id: number): void {
	state.apps = state.apps.map((a) => (a.id === id ? { ...a, minimized: true } : a));
}

/** Toggle a window between its restored size and maximized. */
export function toggleMaximizeApp(state: WindowManagerState, id: number): void {
	state.apps = state.apps.map((a) => (a.id === id ? { ...a, maximized: !a.maximized } : a));
}

/** Close a window entirely. */
export function closeApp(state: WindowManagerState, id: number): void {
	state.apps = state.apps.filter((a) => a.id !== id);
	state.focusing = state.apps.length > 0 ? Focusing.window : Focusing.desktop;
}

/**
 * Taskbar button click: minimize when this window is already focused,
 * otherwise focus/restore it — exactly like XP.
 */
export function taskbarClick(state: WindowManagerState, id: number): void {
	if (focusedAppId(state) === id) {
		minimizeApp(state, id);
	} else {
		focusApp(state, id);
	}
}

/** Move focus to the desktop (e.g. clicking empty taskbar/desktop space). */
export function focusDesktop(state: WindowManagerState): void {
	state.focusing = Focusing.desktop;
}
