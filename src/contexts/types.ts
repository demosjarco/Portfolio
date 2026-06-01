export enum Wallpapers {
	// New
	'Nostalgic Solitaire',
	'Nostalgic Windows',
	'Nostalgic Clippy',
	'Nostalgic MsPaint',
	'SL3 1',
	'SL3 2',
	'SL3 3',
	'SL3 4',
	'SL3 5',
	'SL3 6',
	'SL3 7',
	'SL3 8',
	// Old
	Aquarium,
	Ascent,
	Autumn,
	Azul,
	Bliss,
	Crystal,
	DaVinci,
	'Energy Bliss',
	Follow,
	Friend,
	Home,
	'Moon flower',
	Ocean,
	Peace,
	'Purple flower',
	Radiance,
	'Red moon desert',
	Ripple,
	Space,
	Spring,
	StarTracks,
	Stonehenge,
	Stream,
	Tulips,
	'Vortec space',
	Wind,
	'Windows XP',
}

export enum PowerState {
	start,
	logOff,
	turnOff,
}

/**
 * Stable identifier for every application the desktop knows how to launch.
 * Used as the lookup key into the app registry ({@link appRegistry}) so that
 * non-serializable data (JSX icons, content components) can live outside the
 * window-manager store.
 */
export enum AppKey {
	SecurityEssentials = 'SecurityEssentials',
}

/**
 * What the desktop currently considers "active". Mirrors the real XP behaviour
 * where focus can live on a window, a desktop icon, or the bare desktop.
 */
export enum Focusing {
	window = 'window',
	icon = 'icon',
	desktop = 'desktop',
}

/**
 * A single running window. Only serializable data lives here — the icon and
 * content component are resolved from {@link appRegistry} via {@link AppKey}.
 */
export interface AppInstance {
	id: number;
	appKey: AppKey;
	title: string;
	zIndex: number;
	minimized: boolean;
	maximized: boolean;
	/** Top-left position (px) relative to the desktop, when not maximized. */
	x: number;
	y: number;
	/** Size (px) when not maximized. */
	width: number;
	height: number;
}

/**
 * The complete reactive state for the Desktop Window Manager (DWM).
 * Held in a Qwik store and mutated directly by the action helpers in
 * `WinXp/dwm/actions.ts`.
 */
export interface WindowManagerState {
	apps: AppInstance[];
	/** Monotonic id handed to the next launched window. */
	nextAppId: number;
	/** Monotonic z-index handed to the next focused window. */
	nextZIndex: number;
	/** Whether focus currently lives on a window, an icon, or the desktop. */
	focusing: Focusing;
}

export type IconStates = IconState[];
export interface IconState {
	id: number;
	appKey: AppKey;
	title: string;
	isFocus: boolean;
}
