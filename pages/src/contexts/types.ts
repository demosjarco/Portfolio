import type { JSXOutput } from '@builder.io/qwik';

export enum PowerState {
	start,
	logOff,
	turnOff,
}

export type IconStates = IconState[];
interface IconState {
	id: number;
	icon: JSXOutput;
	title: string;
	/**
	 * @todo
	 */
	component: any;
	isFocus: boolean;
}
