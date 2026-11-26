import { $, component$, useContext, useSignal, useVisibleTask$ } from '@builder.io/qwik';
import RunIcon from '~/assets/windowsIcons/shell32_2_25-7.png?w=32&h=32&jsx';
import { WindowManagerContext } from '~/contexts';
import type { AppInstance } from '~/contexts/types';
import { loadRunHistory, runProgram, showRunError } from '~/WinXp/apps/Run/run';
import { closeApp } from '~/WinXp/dwm/actions';

/** Luna push button (OK / Cancel / Browse...). */
const BUTTON_CLASS = 'h-[23px] w-[75px] rounded-[3px] border border-[#003c74] bg-linear-to-b from-white to-[#ece9d8] text-[11px] text-black active:from-[#e5e4dd] active:to-[#f6f5f0] disabled:border-[#c9c7ba] disabled:text-[#aca899]';

/**
 * Start → Run. Type a program's run name (e.g. `msmsgs`, `cmd`) to open it, exactly like XP. Names come from each app's `runNames` in the app registry.
 */
export const RunDialog = component$<{ app?: AppInstance }>(({ app }) => {
	const wm = useContext(WindowManagerContext);
	const appId = app?.id ?? -1;
	const initial = app?.data && 'text' in app.data ? app.data.text : undefined;

	const text = useSignal(initial ?? '');
	const history = useSignal<string[]>([]);
	const showHistory = useSignal(false);
	const input = useSignal<HTMLInputElement>();

	// XP pre-fills the last command and selects it, so typing replaces it.
	useVisibleTask$(() => {
		history.value = loadRunHistory();
		if (initial === undefined) text.value = history.value[0] ?? '';
		requestAnimationFrame(() => {
			input.value?.focus();
			input.value?.select();
		});
	});

	const ok = $(() => {
		const command = text.value.trim();
		if (!command) return;
		closeApp(wm, appId);
		if (!runProgram(wm, command)) showRunError(wm, command);
	});
	const cancel = $(() => closeApp(wm, appId));

	return (
		<div
			class="flex h-full flex-col bg-[#ece9d8] px-[11px] pt-[11px] pb-[12px] font-[Tahoma,sans-serif] text-[11px] text-black select-none"
			onKeyDown$={(e) => {
				if (e.key === 'Escape') void cancel();
			}}>
			<div class="flex gap-[14px]">
				<RunIcon class="h-8 w-8 shrink-0" />
				<p class="leading-[13px]">Type the name of a program, folder, document, or Internet resource, and Windows will open it for you.</p>
			</div>

			<div class="mt-[16px] flex items-center gap-[10px]">
				<label for={`run-open-${appId}`} accessKey="o">
					<u>O</u>pen:
				</label>
				<div class="relative flex h-[21px] flex-1 border border-[#7f9db9] bg-white">
					<input
						ref={input}
						id={`run-open-${appId}`}
						class="min-w-0 flex-1 px-[2px] text-[11px] outline-none"
						bind:value={text}
						autoComplete="off"
						spellcheck={false}
						onKeyDown$={(e) => {
							if (e.key === 'Enter') void ok();
						}}
					/>
					{/* History drop-down, like XP's combo box. */}
					<button type="button" tabIndex={-1} aria-label="Show history" class="flex w-[17px] items-center justify-center border-l border-white bg-linear-to-b from-[#c1d3fb] to-[#aac3f7]" onClick$={() => (showHistory.value = !showHistory.value)}>
						<svg width="7" height="4" viewBox="0 0 7 4" aria-hidden="true">
							<path d="M0 0h7L3.5 4z" fill="#4d6185" />
						</svg>
					</button>
					{showHistory.value && history.value.length > 0 && (
						<ul class="absolute top-full right-[-1px] left-[-1px] z-10 max-h-[120px] overflow-y-auto border border-black bg-white">
							{history.value.map((entry) => (
								<li key={entry}>
									<button
										type="button"
										class="block w-full px-[2px] text-left hover:bg-[#316ac5] hover:text-white"
										onClick$={() => {
											text.value = entry;
											showHistory.value = false;
											input.value?.focus();
										}}>
										{entry}
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>

			<div class="mt-auto flex justify-end gap-[6px]">
				<button type="button" class={BUTTON_CLASS} disabled={!text.value.trim()} onClick$={ok}>
					OK
				</button>
				<button type="button" class={BUTTON_CLASS} onClick$={cancel}>
					Cancel
				</button>
				{/* There's no file system to browse. */}
				<button type="button" class={BUTTON_CLASS} accessKey="b">
					<u>B</u>rowse...
				</button>
			</div>
		</div>
	);
});
