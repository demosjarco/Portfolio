import type { JSXOutput } from '@builder.io/qwik';

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
