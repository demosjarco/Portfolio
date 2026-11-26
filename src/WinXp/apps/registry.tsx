import { component$, type Component } from '@builder.io/qwik';
import { v7 as uuidv7 } from 'uuid';
import CommandPromptIcon from '~/assets/windowsIcons/cmd_1_IDI_APPICON-1.png?w=16&h=16&jsx';
import PowerShellIcon from '~/assets/windowsIcons/33017-256x256x32.png?w=16&h=16&jsx';
import MseIcon from '~/assets/windowsIcons/Microsoft_Security_Essentials_icon.png?w=16&h=16&jsx';
import MessengerIcon from '~/assets/windowsIcons/msmsgs_1_1-6.png?w=16&h=16&jsx';
import RunIcon from '~/assets/windowsIcons/shell32_2_25-7.png?w=16&h=16&jsx';
import type { AppInstance } from '~/contexts/types';
import { AppKey } from '~/contexts/types';
import { MessengerDirectory } from '~/WinXp/apps/Messenger/Directory';
import { MessengerRoom } from '~/WinXp/apps/Messenger/Room';
import { PowerShellConsole } from '~/WinXp/apps/PowerShell/Console';
import { RunDialog } from '~/WinXp/apps/Run';
import { RunError } from '~/WinXp/apps/Run/RunError';
import { SecurityEssentials } from '~/WinXp/apps/SecurityEssentials';

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
	/** The window body. Receives its owning window instance. */
	Content: Component<{ app: AppInstance }>;
	/** Default window size on first open (px). */
	defaultSize: { width: number; height: number };
	/** Whether more than one window of this app may exist at once. */
	singleInstance: boolean;
	/** Whether the window can be resized / maximized. */
	resizable: boolean;
	/**
	 * Names that open this app from Start → Run, like the executable names on real XP (e.g. `msmsgs` for Windows Messenger). Matched case-insensitively, with or without `.exe` or a leading path. Required so every new app decides; use `[]` for windows that can't be launched on their own.
	 */
	runNames: readonly string[];
	/** Dialog chrome like XP's Run box and message boxes: no minimize/maximize, an optional help button, and no taskbar button. */
	dialog?: { help: boolean };
	/** Payload every new window of this app needs (e.g. a console's session id), used when the launcher doesn't pass one. */
	newWindowData?: () => AppInstance['data'];
}

/**
 * Small 16x16 wrapper so callers don't repeat the sizing classes. Imported
 * from the single largest source PNG and downscaled by Qwik's image optimizer.
 */
const MseTaskbarIcon = component$<{ class?: string }>(({ class: cls }) => <MseIcon class={cls} />);
const MessengerTaskbarIcon = component$<{ class?: string }>(({ class: cls }) => <MessengerIcon class={cls} />);
const PowerShellTaskbarIcon = component$<{ class?: string }>(({ class: cls }) => <PowerShellIcon class={cls} />);
const CommandPromptTaskbarIcon = component$<{ class?: string }>(({ class: cls }) => <CommandPromptIcon class={cls} />);
const RunTaskbarIcon = component$<{ class?: string }>(({ class: cls }) => <RunIcon class={cls} />);
/** XP message boxes have no titlebar icon. */
const NoIcon = component$<{ class?: string }>(() => <></>);

export const appRegistry: Record<AppKey, AppRegistryEntry> = {
	[AppKey.SecurityEssentials]: {
		title: 'Microsoft Security Essentials',
		Icon: MseTaskbarIcon,
		Content: SecurityEssentials,
		defaultSize: { width: 720, height: 520 },
		singleInstance: true,
		resizable: true,
		runNames: ['msseces'],
	},
	[AppKey.Messenger]: {
		title: 'Windows Messenger',
		Icon: MessengerTaskbarIcon,
		Content: MessengerDirectory,
		defaultSize: { width: 350, height: 560 },
		singleInstance: true,
		resizable: true,
		runNames: ['msmsgs'],
	},
	[AppKey.MessengerRoom]: {
		title: 'Conversation',
		Icon: MessengerTaskbarIcon,
		Content: MessengerRoom,
		defaultSize: { width: 520, height: 480 },
		singleInstance: false,
		resizable: true,
		runNames: [],
	},
	[AppKey.PowerShell]: {
		title: 'Windows PowerShell',
		Icon: PowerShellTaskbarIcon,
		Content: PowerShellConsole,
		// The shortcut's 120x50 window at 8x12 cells, plus a scrollbar and the frame.
		defaultSize: { width: 985, height: 640 },
		singleInstance: false,
		resizable: true,
		runNames: ['powershell'],
		newWindowData: () => ({ windowId: uuidv7() }),
	},
	[AppKey.CommandPrompt]: {
		// XP titles a Command Prompt with the program it is running.
		title: 'C:\\WINDOWS\\system32\\cmd.exe - powershell',
		Icon: CommandPromptTaskbarIcon,
		Content: PowerShellConsole,
		// cmd.exe's default 80x25 window at 8x12 cells plus scrollbar and frame (measured on a real XP: 668x337).
		defaultSize: { width: 668, height: 337 },
		singleInstance: false,
		resizable: true,
		runNames: ['cmd'],
		newWindowData: () => ({ windowId: uuidv7() }),
	},
	[AppKey.Run]: {
		title: 'Run',
		Icon: RunTaskbarIcon,
		Content: RunDialog,
		// Measured on a real XP.
		defaultSize: { width: 347, height: 186 },
		singleInstance: true,
		resizable: false,
		runNames: [],
		dialog: { help: true },
	},
	[AppKey.RunError]: {
		// Replaced by the name that wasn't found, like XP.
		title: '',
		Icon: NoIcon,
		Content: RunError,
		// Measured on a real XP.
		defaultSize: { width: 785, height: 124 },
		singleInstance: true,
		resizable: false,
		runNames: [],
		dialog: { help: false },
	},
};

/** Resolve what was typed into Run to an app: trims, ignores case, drops a leading path and a trailing `.exe` (so `C:\WINDOWS\system32\cmd.exe` works too). */
export function resolveRunName(input: string): AppKey | undefined {
	const name = input
		.trim()
		.replace(/^"(.*)"$/, '$1')
		.split(/[\\/]/)
		.at(-1)
		?.toLowerCase()
		.replace(/\.exe$/, '');
	if (!name) return undefined;
	return (Object.keys(appRegistry) as AppKey[]).find((key) => appRegistry[key].runNames.some((runName) => runName.toLowerCase() === name));
}
