import { createContextId, type Signal } from '@builder.io/qwik';
import type { Focusing, IconStates, PowerState } from './types';

export const FocusingContext = createContextId<Signal<Focusing>>('FocusingContext');
export const IconStateContext = createContextId<Signal<IconStates>>('IconStateContext');
export const PowerStateContext = createContextId<Signal<PowerState>>('PowerStateContext');
