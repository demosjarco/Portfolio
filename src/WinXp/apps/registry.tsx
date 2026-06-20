import { component$, type Component } from '@builder.io/qwik';
import MseIcon from '~/assets/windowsIcons/Microsoft_Security_Essentials_icon.png?w=16&h=16&jsx';
import { AppKey } from '~/contexts/types';
import { SecurityEssentials } from './SecurityEssentials';

/**
 * Static metadata describing a launchable application.
 *
 * Everything here is non-serializable (JSX components, sizing) which is why it
 * lives in this registry rather than in the window-manager store. The store
 * only ever references an {@link AppKey}; the renderer looks the rest up here.
 */
export interface AppRegistryEntry {
	/** Default window title shown in the titlebar and taskbar. */
	title: string;
	/** 16x16 titlebar/taskbar icon. */
	Icon: Component<{ class?: string }>;
	/** The window body. */
	Content: Component;
	/** Default window size on first open (px). */
	defaultSize: { width: number; height: number };
	/** Whether more than one window of this app may exist at once. */
	singleInstance: boolean;
	/** Whether the window can be resized / maximized. */
	resizable: boolean;
}

/**
 * Small 16x16 wrapper so callers don't repeat the sizing classes. Imported
 * from the single largest source PNG and downscaled by Qwik's image optimizer.
 */
const MseTaskbarIcon = component$<{ class?: string }>(({ class: cls }) => <MseIcon class={cls} />);

export const appRegistry: Record<AppKey, AppRegistryEntry> = {
	[AppKey.SecurityEssentials]: {
		title: 'Microsoft Security Essentials',
		Icon: MseTaskbarIcon,
		Content: SecurityEssentials,
		defaultSize: { width: 720, height: 520 },
		singleInstance: true,
		resizable: true,
	},
};
