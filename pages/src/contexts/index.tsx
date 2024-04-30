import { createContextId, type Signal } from '@builder.io/qwik';
import type { Focusing, PowerState } from './types';

export const FocusingContext = createContextId<Signal<Focusing>>('FocusingContext');
export const PowerStateContext = createContextId<Signal<PowerState>>('PowerStateContext');
