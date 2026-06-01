import { createContextId, type Signal } from '@builder.io/qwik';
import type { IconStates, PowerState, Wallpapers, WindowManagerState } from './types';

export const WallpaperContext = createContextId<Signal<Wallpapers>>('WallpaperContext');
export const IconStateContext = createContextId<Signal<IconStates>>('IconStateContext');
export const PowerStateContext = createContextId<Signal<PowerState>>('PowerStateContext');

/**
 * The Desktop Window Manager store. Holds every running window plus the
 * focus/z-index bookkeeping. Provided once in the root layout and consumed by
 * the windows, taskbar and desktop icons.
 */
export const WindowManagerContext = createContextId<WindowManagerState>('WindowManagerContext');
