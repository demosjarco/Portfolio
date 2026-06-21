import { AppKey, Focusing, PowerState, type IconStates, type WindowManagerState } from './types';

export const defaultIconState: IconStates = [
	{
		id: 0,
		appKey: AppKey.SecurityEssentials,
		title: 'Microsoft Security Essentials',
		isFocus: false,
	},
	{
		id: 1,
		appKey: AppKey.Messenger,
		title: 'Windows Messenger',
		isFocus: false,
	},
];
export const defaultState: PowerState = PowerState.start;

export const defaultWindowManagerState: WindowManagerState = {
	apps: [],
	nextAppId: 0,
	nextZIndex: 0,
	focusing: Focusing.desktop,
};
