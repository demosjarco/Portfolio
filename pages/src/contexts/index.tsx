import { createContextId, type Signal } from '@builder.io/qwik';
import type { IconStates, PowerState } from './types';

export const IconStateContext = createContextId<Signal<IconStates>>('IconStateContext');
export const PowerStateContext = createContextId<Signal<PowerState>>('PowerStateContext');
