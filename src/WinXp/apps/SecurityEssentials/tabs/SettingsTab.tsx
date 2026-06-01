import { component$ } from '@builder.io/qwik';

/**
 * Settings tab — a representative subset of the real MSE settings, enough to
 * read as authentic without being interactive plumbing we don't need yet.
 */
export const SettingsTab = component$(() => (
	<div class="flex h-full flex-col text-[12px]">
		<div class="flex flex-1 p-3">
			{/* Settings category list */}
			<div class="w-44 shrink-0 border border-[#c2d5ec] bg-white py-1">
				{['Scheduled scan', 'Default actions', 'Real-time protection', 'Excluded files & locations', 'Excluded file types', 'Excluded processes', 'Advanced', 'Microsoft SpyNet'].map((item, i) => (
					<div key={item} class={['mx-1 cursor-default px-2 py-0.5', i === 2 ? 'border border-dotted border-[#1b4f8a] bg-[#dcebfb] text-[#1b4f8a]' : 'text-[#1b4f8a] hover:bg-[#eef4fb]']}>
						{item}
					</div>
				))}
			</div>

			{/* Real-time protection settings pane */}
			<div class="flex-1 space-y-3 border-y border-r border-[#c2d5ec] bg-white p-4">
				<label class="flex items-center gap-2">
					<input type="checkbox" checked />
					<span class="font-bold">Turn on real-time protection (recommended)</span>
				</label>
				<p class="max-w-md text-[#444]">
					Real-time protection alerts you when viruses, spyware, or other potentially unwanted software attempts to install itself or run on your computer.{' '}
					<button type="button" class="text-[#15518f] underline-offset-2 hover:underline">
						Tell me more about real-time protection.
					</button>
				</p>

				<div class="pt-1 text-[#444]">Select real-time protection options:</div>
				<label class="flex items-center gap-2">
					<input type="checkbox" checked />
					<span>Monitor file and program activity on your computer</span>
				</label>
				<label class="flex items-center gap-2">
					<input type="checkbox" checked />
					<span>Scan all downloaded files and attachments</span>
				</label>
			</div>
		</div>

		{/* Action bar */}
		<div class="flex justify-end gap-2 px-4 py-2">
			<button type="button" disabled class="flex items-center gap-1 rounded-[3px] border border-[#b9c4d2] bg-linear-to-b from-[#f7f9fb] to-[#e6ebf1] px-4 py-1 font-bold text-[#9aa4b0]">
				Save changes
			</button>
			<button type="button" class="rounded-[3px] border border-[#88a4c4] bg-linear-to-b from-[#fdfeff] via-[#eef4fb] to-[#d6e3f2] px-4 py-1 text-[#1b3a5e] shadow-[inset_0_1px_0_#fff] hover:from-[#eaf3ff] hover:to-[#cfe0f5] active:from-[#cfe0f5] active:to-[#eaf3ff]">
				Cancel
			</button>
		</div>
	</div>
));
