import { createContextId, type Signal } from '@builder.io/qwik';
import type { IconStates, PowerState, Wallpapers } from './types';

export const WallpaperContext = createContextId<Signal<Wallpapers>>('WallpaperContext');
export const IconStateContext = createContextId<Signal<IconStates>>('IconStateContext');
export const PowerStateContext = createContextId<Signal<PowerState>>('PowerStateContext');
