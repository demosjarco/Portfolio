import { component$ } from '@builder.io/qwik';
import { ShieldOk, ShieldWarn } from '~/WinXp/apps/SecurityEssentials/StatusIcons';

/**
 * Home tab — the protected status summary that greets the user when MSE opens.
 * Mirrors the real product: a large shield with the status headline, the
 * protection status rows, scan options on the right, and a scan-details strip
 * pinned to the bottom.
 */
export const HomeTab = component$(() => (
	<div class="flex h-full flex-col text-[12px]">
		<div class="flex flex-1 gap-6 p-4">
			{/* Left: big shield + headline + status rows */}
			<div class="flex flex-1 flex-col">
				<div class="flex items-start gap-4">
					<div class="flex flex-col items-center">
						<div class="rounded-[3px] border border-[#9bb8d6] bg-linear-to-b from-[#fbfdff] to-[#e4eef9] p-2">
							<ShieldOk size={52} />
						</div>
						<div class="mt-1 h-1.5 w-14 rounded-b-sm bg-linear-to-b from-[#c7d6e6] to-[#9fb4cb]" />
					</div>
					<div class="flex-1 pt-1">
						<div class="text-[13px] font-bold text-[#1b6b16]">Microsoft Security Essentials is monitoring your computer and helping to protect it.</div>
						<p class="mt-1 text-[#444]">Real-time WAF protection is active. Incoming web traffic is inspected and malicious requests are blocked automatically.</p>
					</div>
				</div>

				{/* Status rows */}
				<div class="mt-6 space-y-2">
					<StatusRow icon="ok" label="Real-time protection:" value="On" />
					<StatusRow icon="ok" label="Virus &amp; spyware definitions:" value="Up to date" />
				</div>
			</div>

			{/* Right: scan options panel */}
			<div class="w-44 shrink-0 border-l border-[#dbe6f1] pl-4">
				<div class="mb-2 font-bold text-[#15518f]">Scan options:</div>
				<label class="mb-1 flex items-center gap-2">
					<input type="radio" name="scan" checked />
					<span>Quick</span>
				</label>
				<label class="mb-1 flex items-center gap-2">
					<input type="radio" name="scan" />
					<span>Full</span>
				</label>
				<label class="mb-4 flex items-center gap-2">
					<input type="radio" name="scan" />
					<span>Custom</span>
				</label>
				<button type="button" class="w-full rounded-[3px] border border-[#88a4c4] bg-linear-to-b from-[#fdfeff] via-[#eef4fb] to-[#d6e3f2] px-3 py-1.5 text-[12px] font-bold text-[#1b3a5e] shadow-[inset_0_1px_0_#fff] hover:from-[#eaf3ff] hover:to-[#cfe0f5] active:from-[#cfe0f5] active:to-[#eaf3ff]">
					Scan now
				</button>
			</div>
		</div>

		{/* Bottom scan-details strip */}
		<div class="flex items-start gap-2 border-t border-[#dbe6f1] bg-[#f6f9fd] px-4 py-2 text-[11px]">
			<svg viewBox="0 0 16 16" class="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true">
				<circle cx="7" cy="7" r="5" fill="none" stroke="#5a6b7b" stroke-width="1.5" />
				<line x1="10.5" y1="10.5" x2="14" y2="14" stroke="#5a6b7b" stroke-width="2" stroke-linecap="round" />
			</svg>
			<div>
				<div class="font-bold text-[#1b3a5e]">Scheduled scan settings</div>
				<div class="text-[#444]">
					Next scan: <span class="font-bold">Sunday around 2:00 AM (Quick scan)</span> <span class="px-1 text-[#9fb0c2]">|</span>
					<button type="button" class="text-[#15518f] underline-offset-2 hover:underline">
						Change my scan schedule
					</button>
				</div>
			</div>
		</div>
	</div>
));

const StatusRow = component$<{ icon: 'ok' | 'warn'; label: string; value: string }>(({ icon, label, value }) => (
	<div class="flex items-center gap-2">
		{icon === 'ok' ? <ShieldOk size={18} /> : <ShieldWarn size={18} />}
		<span class="text-[#444]">{label}</span>
		<span class="font-bold text-[#1b6b16]">{value}</span>
	</div>
));
