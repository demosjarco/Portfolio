import { $, component$, useContext, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import { WindowManagerContext } from '~/contexts';
import type { AppInstance } from '~/contexts/types';
import { openRun } from '~/WinXp/apps/Run/run';
import { closeApp } from '~/WinXp/dwm/actions';

/** XP's red "error" message box icon. */
const ErrorIcon = component$(() => (
	<svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true" class="shrink-0">
		<defs>
			<radialGradient id="xp-error-icon" cx="40%" cy="35%" r="70%">
				<stop offset="0%" stop-color="#ff8a7a" />
				<stop offset="55%" stop-color="#e0301e" />
				<stop offset="100%" stop-color="#a50f05" />
			</radialGradient>
		</defs>
		<circle cx="16" cy="16" r="14.5" fill="url(#xp-error-icon)" stroke="#8a0d04" />
		<path d="M10.5 10.5l11 11M21.5 10.5l-11 11" stroke="#fff" stroke-width="3.2" stroke-linecap="round" />
	</svg>
));

/**
 * "Windows cannot find '…'" — what XP shows when Run doesn't know a name. OK closes it and reopens Run with the same text, like XP.
 */
export const RunError = component$<{ app?: AppInstance }>(({ app }) => {
	const wm = useContext(WindowManagerContext);
	const appId = app?.id ?? -1;
	const missing = app?.data && 'missing' in app.data ? app.data.missing : '';
	const okButton = useSignal<HTMLButtonElement>();

	useVisibleTask$(() => okButton.value?.focus());

	const ok = $(() => {
		closeApp(wm, appId);
		openRun(wm, missing);
	});

	return (
		<div
			class="flex h-full flex-col bg-[#ece9d8] px-[12px] pt-[14px] pb-[11px] font-[Tahoma,sans-serif] text-[11px] text-black select-none"
			onKeyDown$={(e) => {
				if (e.key === 'Escape' || e.key === 'Enter') void ok();
			}}>
			<div class="flex items-start gap-[14px]">
				<ErrorIcon />
				<p class="pt-[8px] leading-[13px]">Windows cannot find &apos;{missing}&apos;. Make sure you typed the name correctly, and then try again. To search for a file, click the Start button, and then click Search.</p>
			</div>
			<div class="mt-auto flex justify-center">
				<button ref={okButton} type="button" class="h-[23px] w-[75px] rounded-[3px] border border-[#003c74] bg-linear-to-b from-white to-[#ece9d8] text-[11px] outline-1 outline-offset-[-4px] outline-black outline-dotted focus:outline" onClick$={ok}>
					OK
				</button>
			</div>
		</div>
	);
});
