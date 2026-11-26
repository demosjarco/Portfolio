import { v7 as uuidv7 } from 'uuid';
import { AppKey, type WindowManagerState } from '~/contexts/types';
import { appRegistry, resolveRunName } from '~/WinXp/apps/registry';
import { launchApp } from '~/WinXp/dwm/actions';

/** Taskbar height (px) and the gap XP leaves between it and the Run dialog. */
const TASKBAR_H = 30;
const RUN_MARGIN = 6;

/** localStorage key for Run's history (XP keeps the last 26, most recent first). */
const MRU_KEY = 'run.mru';
const MRU_MAX = 26;

/* ------------------------------------------------------------- history */

export function loadRunHistory(): string[] {
	try {
		const parsed: unknown = JSON.parse(localStorage.getItem(MRU_KEY) ?? '[]');
		return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === 'string').slice(0, MRU_MAX) : [];
	} catch {
		return [];
	}
}

/** Remember a command that ran, moving it to the top (case-insensitive dedupe, like XP). */
function rememberRun(command: string): void {
	const history = [command, ...loadRunHistory().filter((entry) => entry.toLowerCase() !== command.toLowerCase())].slice(0, MRU_MAX);
	try {
		localStorage.setItem(MRU_KEY, JSON.stringify(history));
	} catch {
		/* storage unavailable: Run still works, it just won't remember */
	}
}

/* ------------------------------------------------------------- windows */

/** Open Start → Run: bottom-left, just above the Start button, like XP. */
export function openRun(state: WindowManagerState, text?: string): void {
	const { height } = appRegistry[AppKey.Run].defaultSize;
	launchApp(state, AppKey.Run, {
		position: { x: RUN_MARGIN, y: Math.max(0, window.innerHeight - TASKBAR_H - height - RUN_MARGIN) },
		data: text === undefined ? undefined : { text },
	});
}

/**
 * Run what was typed. Returns false when no app answers to that name (the caller shows XP's "Windows cannot find" box).
 *
 * PowerShell started from Run gets the console's default look and its full path as the title: the blue window comes from the Start menu shortcut's properties, which don't apply when the exe is run directly.
 */
export function runProgram(state: WindowManagerState, command: string): boolean {
	const appKey = resolveRunName(command);
	if (!appKey) return false;
	rememberRun(command.trim());
	if (appKey === AppKey.PowerShell) {
		launchApp(state, appKey, { title: 'C:\\WINDOWS\\system32\\WindowsPowerShell\\v1.0\\powershell.exe', data: { windowId: uuidv7(), consoleDefaults: true } });
	} else {
		launchApp(state, appKey);
	}
	return true;
}

/** XP's "Windows cannot find" message box, centred, titled with what was typed. */
export function showRunError(state: WindowManagerState, missing: string): void {
	const { width, height } = appRegistry[AppKey.RunError].defaultSize;
	launchApp(state, AppKey.RunError, {
		title: missing,
		data: { missing },
		position: { x: Math.max(0, Math.round((window.innerWidth - width) / 2)), y: Math.max(0, Math.round((window.innerHeight - TASKBAR_H - height) / 2)) },
	});
}
