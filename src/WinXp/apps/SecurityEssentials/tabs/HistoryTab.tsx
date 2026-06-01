import { $, component$, Slot, useComputed$, useSignal } from '@builder.io/qwik';
import { AlertLevel, DetectionAction, detectionHistory, type DetectionEvent } from '~/WinXp/apps/SecurityEssentials/historyData';
import { ShieldDanger, ShieldOk, ShieldWarn } from '~/WinXp/apps/SecurityEssentials/StatusIcons';

/** Map an alert level to the small status shield shown in the list. */
const AlertIcon = component$<{ level: AlertLevel }>(({ level }) => {
	switch (level) {
		case AlertLevel.severe:
		case AlertLevel.high:
			return <ShieldDanger size={16} />;
		case AlertLevel.medium:
			return <ShieldWarn size={16} />;
		case AlertLevel.low:
			return <ShieldOk size={16} />;
	}
});

const formatWhen = (epoch: number) =>
	new Date(epoch).toLocaleString(undefined, {
		month: 'numeric',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	});

/** Recommendation text shown in the detail pane, keyed off severity. */
const recommendationFor = (level: AlertLevel): string => {
	switch (level) {
		case AlertLevel.severe:
		case AlertLevel.high:
			return 'Remove this software immediately.';
		case AlertLevel.medium:
			return 'Review this item and remove it if you do not recognize it.';
		case AlertLevel.low:
			return 'This item is low risk. No action is required.';
	}
};

/**
 * History tab — the primary surface of this MSE recreation.
 *
 * Lists detected items (currently {@link detectionHistory} dummy data, later
 * live WAF events from the Cloudflare API rendered as on-device security
 * events). Supports the classic MSE filter radios and a detail pane for the
 * selected item.
 */
export const HistoryTab = component$(() => {
	const filter = useSignal<'all' | 'quarantined' | 'allowed'>('all');
	const selectedId = useSignal<string | undefined>(detectionHistory[0]?.id);

	const rows = useComputed$<DetectionEvent[]>(() => {
		const all = [...detectionHistory].sort((a, b) => b.detected - a.detected);
		switch (filter.value) {
			case 'quarantined':
				return all.filter((e) => e.action === DetectionAction.quarantined || e.action === DetectionAction.removed);
			case 'allowed':
				return all.filter((e) => e.action === DetectionAction.allowed);
			default:
				return all;
		}
	});

	const selected = useComputed$(() => detectionHistory.find((e) => e.id === selectedId.value));

	return (
		<div class="flex h-full flex-col text-[12px]">
			<div class="px-4 pt-3 pb-1">
				<p class="text-[#333]">View the items Microsoft Security Essentials detected as potentially harmful and the action that you took on each item.</p>
			</div>

			{/* Filter radios with descriptions */}
			<div class="space-y-0.5 px-4 py-2">
				<FilterRadio current={filter.value} value="all" label="All detected items" hint="View all the items that were detected on your computer" filter={filter} />
				<FilterRadio current={filter.value} value="quarantined" label="Quarantined items" hint="Items that were disabled and prevented from running but not removed" filter={filter} />
				<FilterRadio current={filter.value} value="allowed" label="Allowed items" hint="Items that you've allowed to run on your computer" filter={filter} />
			</div>

			{/* Detected items table */}
			<div class="mx-4 min-h-0 flex-1 overflow-auto border border-[#c2d5ec] bg-white">
				<table class="w-full border-collapse">
					<thead class="sticky top-0 bg-linear-to-b from-[#f4f9ff] to-[#dcebfb] text-left">
						<tr class="text-[#1b4f8a]">
							<Th class="w-7"></Th>
							<Th>Detected item</Th>
							<Th class="w-24">Alert level</Th>
							<Th class="w-40">Date</Th>
							<Th class="w-24">Action taken</Th>
						</tr>
					</thead>
					<tbody>
						{rows.value.map((e) => {
							const isSel = e.id === selectedId.value;
							return (
								<tr
									key={e.id}
									onClick$={$(() => {
										selectedId.value = e.id;
									})}
									class={['cursor-default border-b border-[#eef3f9]', isSel ? 'bg-[#2f71cd] text-white' : 'hover:bg-[#dcebfb]']}>
									<Td>
										<AlertIcon level={e.alertLevel} />
									</Td>
									<Td class="font-bold">{e.name}</Td>
									<Td>{e.alertLevel}</Td>
									<Td>{formatWhen(e.detected)}</Td>
									<Td>{e.action}</Td>
								</tr>
							);
						})}
						{rows.value.length === 0 && (
							<tr>
								<Td class="text-[#777]" colSpan={5}>
									No items to display.
								</Td>
							</tr>
						)}
					</tbody>
				</table>
			</div>

			{/* Detail pane for the selected item */}
			{selected.value && (
				<div class="mx-4 mt-2 border border-[#c2d5ec] bg-white px-3 py-2">
					<div class="space-y-1">
						<div>
							<span class="font-bold">Category: </span>
							<span>{selected.value.category}</span>
						</div>
						<div>
							<span class="font-bold">Description: </span>
							<span>{selected.value.description}</span>
						</div>
						<div>
							<span class="font-bold">Recommendation: </span>
							<span>{recommendationFor(selected.value.alertLevel)}</span>
						</div>
					</div>
				</div>
			)}

			{/* Bottom action bar */}
			<div class="flex justify-end gap-2 px-4 py-2">
				<button type="button" class="flex items-center gap-1 rounded-[3px] border border-[#88a4c4] bg-linear-to-b from-[#fdfeff] via-[#eef4fb] to-[#d6e3f2] px-4 py-1 font-bold text-[#1b3a5e] shadow-[inset_0_1px_0_#fff] hover:from-[#eaf3ff] hover:to-[#cfe0f5] active:from-[#cfe0f5] active:to-[#eaf3ff]">
					Delete history
				</button>
			</div>
		</div>
	);
});

const FilterRadio = component$<{ current: string; value: 'all' | 'quarantined' | 'allowed'; label: string; hint: string; filter: { value: 'all' | 'quarantined' | 'allowed' } }>(({ current, value, label, hint, filter }) => (
	<label class="flex items-baseline gap-1.5">
		<input
			type="radio"
			name="history-filter"
			checked={current === value}
			onChange$={$(() => {
				filter.value = value;
			})}
		/>
		<span>
			<span class="font-bold">{label}</span>
			<span class="text-[#555]"> - {hint}</span>
		</span>
	</label>
));

const Th = component$<{ class?: string }>(({ class: cls }) => (
	<th class={['border-b border-[#c2d5ec] px-2 py-1 font-bold', cls]}>
		<Slot />
	</th>
));

const Td = component$<{ class?: string; colSpan?: number }>(({ class: cls, colSpan }) => (
	<td class={['px-2 py-1', cls]} colSpan={colSpan}>
		<Slot />
	</td>
));
