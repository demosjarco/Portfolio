import { $, component$, type QRL, Resource, Slot, useComputed$, useResource$, useSignal, useStore, useVisibleTask$ } from '@builder.io/qwik';
import { isServer } from '@builder.io/qwik/build';
import { ShieldDanger, ShieldOk, ShieldWarn } from '~/WinXp/apps/SecurityEssentials/StatusIcons';

enum AlertLevel {
	severe = 'Severe',
	high = 'High',
	medium = 'Medium',
	low = 'Low',
}

enum DetectionAction {
	quarantined = 'Quarantined',
	removed = 'Removed',
	blocked = 'Blocked',
	allowed = 'Allowed',
}

interface DetectionEvent {
	id: string;
	/** Threat name, styled like an MSE signature (Category:Platform/Name). */
	name: string;
	alertLevel: AlertLevel;
	/** Date object for when the item was detected. */
	detected: Date;
	action: DetectionAction;
	/** Extra detail shown when an item is selected. */
	category: string;
	description: string;
	/** JA3 fingerprint hash, if available. Displayed visually only, not used for sorting. */
	ja3: string | null;
}

interface MseEventData {
	b_time: string;
	threat_name: string;
	description: string;
	ja3: string | null;
	status: number;
}

type SortColumn = 'name' | 'alertLevel' | 'detected' | 'action';

const statusToAction = (status: number): DetectionAction => {
	switch (status) {
		case 0:
			return DetectionAction.blocked;
		case 1:
			return DetectionAction.quarantined;
		case 2:
			return DetectionAction.allowed;
		default:
			return DetectionAction.blocked;
	}
};

const alertLevelFromThreatName = (threatName: string): AlertLevel => {
	const lc = threatName.toLowerCase();
	if (lc.startsWith('exploit:')) {
		if (lc.includes('/injection') || lc.includes('/commandexec') || lc.includes('/ssrf') || lc.includes('/xxe') || lc.includes('/credentialstuffing')) {
			return AlertLevel.severe;
		}
		return AlertLevel.high;
	}
	if (lc.startsWith('behavior:')) return AlertLevel.high;
	if (lc.startsWith('flood:')) return AlertLevel.medium;
	return AlertLevel.low;
};

const categoryFromThreatName = (threatName: string): string => threatName.split(':')[0] ?? 'Unknown';

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

const formatWhen = (epoch: Date) =>
	epoch.toLocaleString(undefined, {
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
 * Lists detected items (live WAF events from the Cloudflare API surfaced as
 * on-device security events via SSE). Supports the classic MSE filter radios
 * and a detail pane for the selected item. Polls every 5 minutes after the
 * initial stream completes.
 */
export const HistoryTab = component$(() => {
	const filter = useSignal<'all' | 'quarantined' | 'allowed'>('all');
	const selectedId = useSignal<string | undefined>(undefined);
	const store = useStore<Record<string, DetectionEvent>>({}, { deep: false });
	const sortCol = useSignal<SortColumn>('detected');
	const sortDir = useSignal<'asc' | 'desc'>('desc');
	const tableContainerRef = useSignal<HTMLDivElement>();
	const chunkSize = useSignal(20); // fallback until DOM is measured
	const refetchCounter = useSignal(0); // 0 = awaiting first measurement

	// Measure container height once the DOM is ready, then trigger the first fetch.
	useVisibleTask$(() => {
		const container = tableContainerRef.value;
		if (container) chunkSize.value = Math.max(1, Math.ceil(container.clientHeight / 24));
		refetchCounter.value = 1;
	});

	// SSE connection — re-runs on each refetch tick. Side-effects populate `store`.
	// eslint-disable-next-line @typescript-eslint/unbound-method
	useResource$(({ track, cleanup }) => {
		track(() => refetchCounter.value);

		if (isServer || refetchCounter.value === 0) return;

		selectedId.value = undefined;

		const url = new URL('https://demosjarco.dev/api/mse');
		url.searchParams.set('chunkSize', chunkSize.value.toString());

		const buffer: DetectionEvent[] = [];
		const es = new EventSource(url.toString());
		let timer: ReturnType<typeof setTimeout> | null = null;

		const flushBuffer = () => {
			if (buffer.length === 0) return;
			const wasEmpty = Object.keys(store).length === 0;
			for (const event of buffer.splice(0)) store[event.id] = event;
			if (wasEmpty) selectedId.value = Object.keys(store)[0];
		};

		es.addEventListener('message', (evt: MessageEvent) => {
			const data = JSON.parse(evt.data as string) as MseEventData;
			buffer.push({
				id: evt.lastEventId,
				name: data.threat_name,
				alertLevel: alertLevelFromThreatName(data.threat_name),
				detected: new Date(data.b_time),
				action: statusToAction(data.status),
				category: categoryFromThreatName(data.threat_name),
				description: data.description,
				ja3: data.ja3 ?? null,
			});
			if (buffer.length >= chunkSize.value) flushBuffer();
		});

		es.addEventListener(
			'done',
			() => {
				es.close();
				flushBuffer();
				// Re-measure for next refetch
				const container = tableContainerRef.value;
				if (container) chunkSize.value = Math.max(1, Math.ceil(container.clientHeight / 24));
				timer = setTimeout(
					() => {
						refetchCounter.value++;
					},
					5 * 60 * 1000,
				);
			},
			{ once: true },
		);

		cleanup(() => {
			es.close();
			if (timer !== null) clearTimeout(timer);
		});
	});

	const rows = useResource$(({ track }) => {
		track(() => Object.keys(store));
		const col = track(() => sortCol.value);
		track(() => sortDir.value);
		track(() => filter.value);

		const all = Object.values(store);
		const alertOrder: Record<AlertLevel, number> = { [AlertLevel.severe]: 3, [AlertLevel.high]: 2, [AlertLevel.medium]: 1, [AlertLevel.low]: 0 };
		all.sort((a, b) => {
			const cmp = col === 'name' ? a.name.localeCompare(b.name) : col === 'alertLevel' ? alertOrder[a.alertLevel] - alertOrder[b.alertLevel] : col === 'detected' ? a.detected.getTime() - b.detected.getTime() : a.action.localeCompare(b.action);
			return sortDir.value === 'asc' ? cmp : -cmp;
		});
		switch (filter.value) {
			case 'quarantined':
				return all.filter((e) => e.action === DetectionAction.quarantined || e.action === DetectionAction.removed);
			case 'allowed':
				return all.filter((e) => e.action === DetectionAction.allowed);
			default:
				return all;
		}
	});

	const selected = useComputed$(() => (selectedId.value !== undefined ? store[selectedId.value] : undefined));

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
			<div ref={tableContainerRef} class="mx-4 min-h-0 flex-1 overflow-auto border border-[#c2d5ec] bg-white">
				<table class="w-full border-collapse">
					<thead class="sticky top-0 bg-linear-to-b from-[#f4f9ff] to-[#dcebfb] text-left">
						<tr class="text-[#1b4f8a]">
							<Th class="w-7"></Th>
							<Th
								sortKey="name"
								sortCol={sortCol.value}
								sortDir={sortDir.value}
								onClick$={$(() => {
									if (sortCol.value === 'name') sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
									else {
										sortCol.value = 'name';
										sortDir.value = 'asc';
									}
								})}>
								Detected item
							</Th>
							<Th
								class="w-24"
								sortKey="alertLevel"
								sortCol={sortCol.value}
								sortDir={sortDir.value}
								onClick$={$(() => {
									if (sortCol.value === 'alertLevel') sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
									else {
										sortCol.value = 'alertLevel';
										sortDir.value = 'asc';
									}
								})}>
								Alert level
							</Th>
							<Th
								class="w-40"
								sortKey="detected"
								sortCol={sortCol.value}
								sortDir={sortDir.value}
								onClick$={$(() => {
									if (sortCol.value === 'detected') sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
									else {
										sortCol.value = 'detected';
										sortDir.value = 'asc';
									}
								})}>
								Date
							</Th>
							<Th
								class="w-24"
								sortKey="action"
								sortCol={sortCol.value}
								sortDir={sortDir.value}
								onClick$={$(() => {
									if (sortCol.value === 'action') sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc';
									else {
										sortCol.value = 'action';
										sortDir.value = 'asc';
									}
								})}>
								Action taken
							</Th>
						</tr>
					</thead>
					<tbody>
						<Resource
							value={rows}
							onPending={() => (
								<tr>
									<Td class="text-[#777]" colSpan={5}>
										Loading...
									</Td>
								</tr>
							)}
							onRejected={() => (
								<tr>
									<Td class="text-[#777]" colSpan={5}>
										Error loading items.
									</Td>
								</tr>
							)}
							onResolved={(resolvedRows) => (
								<>
									{resolvedRows.map((e) => {
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
												<Td class="font-bold">
													{e.name}
													{e.ja3 && <div class={['font-normal', isSel ? 'text-[rgba(255,255,255,0.7)]' : 'text-[#888]']}>{e.ja3}</div>}
												</Td>
												<Td>{e.alertLevel}</Td>
												<Td>{formatWhen(e.detected)}</Td>
												<Td>{e.action}</Td>
											</tr>
										);
									})}
									{resolvedRows.length === 0 && (
										<tr>
											<Td class="text-[#777]" colSpan={5}>
												No items to display.
											</Td>
										</tr>
									)}
								</>
							)}
						/>
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
						{selected.value.ja3 && (
							<div>
								<span class="font-bold">Hash: </span>
								<span>{selected.value.ja3}</span>
							</div>
						)}
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

const Th = component$<{ class?: string; sortKey?: string; sortCol?: string; sortDir?: 'asc' | 'desc'; onClick$?: QRL<() => void> }>(({ class: cls, sortKey, sortCol, sortDir, onClick$ }) => (
	<th class={['border-b border-[#c2d5ec] px-2 py-1 font-bold', onClick$ ? 'cursor-pointer select-none hover:bg-[#cde]' : '', cls]} onClick$={onClick$}>
		<Slot />
		{sortKey && sortCol === sortKey && (sortDir === 'asc' ? ' ▲' : ' ▼')}
	</th>
));

const Td = component$<{ class?: string; colSpan?: number }>(({ class: cls, colSpan }) => (
	<td class={['px-2 py-1', cls]} colSpan={colSpan}>
		<Slot />
	</td>
));
