import type { AppInstance, WindowManagerState, AppKey } from '~/contexts/types';
import { Focusing } from '~/contexts/types';
import { appRegistry } from '../apps/registry';

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
 * Launch an app, or — for single-instance apps that are already open —
 * refocus/restore the existing window instead of opening a second one.
 */
export function launchApp(state: WindowManagerState, appKey: AppKey): void {
	const entry = appRegistry[appKey];

	if (entry.singleInstance) {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- always true while only one AppKey exists; future apps make this meaningful
		const existing = state.apps.find((a) => a.appKey === appKey);
		if (existing) {
			focusApp(state, existing.id);
			return;
		}
	}

	const id = state.nextAppId;
	const offset = (state.apps.length % 6) * CASCADE_STEP;
	const win: AppInstance = {
		id,
		appKey,
		title: entry.title,
		zIndex: state.nextZIndex,
		minimized: false,
		maximized: false,
		x: 80 + offset,
		y: 60 + offset,
		width: entry.defaultSize.width,
		height: entry.defaultSize.height,
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
