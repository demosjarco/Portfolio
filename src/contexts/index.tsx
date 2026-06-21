import type { IconStates, PowerState, Wallpapers, WindowManagerState } from './types';
import { createContextId, type ReadonlySignal, type Signal } from '@builder.io/qwik';

export const WallpaperContext = createContextId<Signal<Wallpapers>>('WallpaperContext');
export const IconStateContext = createContextId<Signal<IconStates>>('IconStateContext');
export const PowerStateContext = createContextId<Signal<PowerState>>('PowerStateContext');

/**
 * SSG-hardcoded Turnstile site key. Sourced from the root layout's route
 * loader and provided here so lazily-rendered windows (which live outside the
 * route tree) can read it without invoking the loader themselves.
 */
export const TurnstileSiteKeyContext = createContextId<ReadonlySignal<string>>('TurnstileSiteKeyContext');

/**
 * The Desktop Window Manager store. Holds every running window plus the
 * focus/z-index bookkeeping. Provided once in the root layout and consumed by
 * the windows, taskbar and desktop icons.
 */
export const WindowManagerContext = createContextId<WindowManagerState>('WindowManagerContext');
