import { component$ } from '@builder.io/qwik';

/**
 * Update tab — shows definition version + last-updated info with an
 * "Update" action button, matching the real MSE layout.
 */
export const UpdateTab = component$(() => (
	<div class="flex h-full flex-col text-[12px]">
		<div class="flex flex-1 gap-6 p-4">
			<div class="flex-1">
				<div class="text-[13px] font-bold text-[#1b3a5e]">
					Virus &amp; spyware definitions status - <span class="text-[#1b6b16]">Up to date</span>
				</div>
				<p class="mt-2 text-[#444]">Microsoft Security Essentials updates your virus &amp; spyware definitions automatically to help protect your computer.</p>

				<div class="mt-5 grid grid-cols-[190px_1fr] gap-y-1.5">
					<span class="text-[#444]">Definitions created on:</span>
					<span>5/31/2025 at 6:02 AM</span>
					<span class="text-[#444]">Virus definitions version:</span>
					<span>1.401.218.0</span>
					<span class="text-[#444]">Spyware definitions version:</span>
					<span>1.401.218.0</span>
				</div>
			</div>

			<div class="w-40 shrink-0 pt-1">
				<button type="button" class="w-full rounded-[3px] border border-[#88a4c4] bg-linear-to-b from-[#fdfeff] via-[#eef4fb] to-[#d6e3f2] px-3 py-1.5 text-[12px] font-bold text-[#1b3a5e] shadow-[inset_0_1px_0_#fff] hover:from-[#eaf3ff] hover:to-[#cfe0f5] active:from-[#cfe0f5] active:to-[#eaf3ff]">
					Update
				</button>
			</div>
		</div>

		{/* Did you know? footer */}
		<div class="flex items-start gap-2 border-t border-[#dbe6f1] bg-[#f6f9fd] px-4 py-2 text-[11px]">
			<svg viewBox="0 0 16 16" class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true">
				<circle cx="8" cy="8" r="7" fill="#1b6fc4" />
				<rect x="7" y="7" width="2" height="5" rx="1" fill="#fff" />
				<circle cx="8" cy="4.5" r="1.1" fill="#fff" />
			</svg>
			<div>
				<div class="font-bold text-[#1b3a5e]">Did you know?</div>
				<div class="text-[#444]">Virus &amp; spyware definitions are files that Microsoft Security Essentials uses to identify malicious or potentially unwanted software on your computer.</div>
				<div class="text-[#444]">You should always keep these definitions up to date to help protect your computer against the latest threats.</div>
			</div>
		</div>
	</div>
));
