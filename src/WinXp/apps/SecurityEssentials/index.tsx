import { $, component$, useSignal } from '@builder.io/qwik';
import type { AppInstance } from '~/contexts/types';
import { HistoryTab } from './tabs/HistoryTab';
import { HomeTab } from './tabs/HomeTab';
import { SettingsTab } from './tabs/SettingsTab';
import { UpdateTab } from './tabs/UpdateTab';

const TABS = ['Home', 'Update', 'History', 'Settings'] as const;
type Tab = (typeof TABS)[number];

/**
 * Microsoft Security Essentials main window content.
 *
 * Single-instance application (enforced by the window manager via the app
 * registry). Renders the classic four-tab MSE layout; the History tab is the
 * primary surface and will later be backed by live WAF data.
 */
export const SecurityEssentials = component$<{ app?: AppInstance }>(() => {
	const activeTab = useSignal<Tab>('History');

	return (
		<div class="flex h-full w-full flex-col bg-white text-black select-none" style={{ 'font-family': 'Tahoma, "Segoe UI", sans-serif' }}>
			{/* Status banner — green when protected (mirrors the real MSE bar) */}
			<div class="flex shrink-0 items-center px-3 py-1 text-white" style={{ background: 'linear-gradient(to bottom,#7bb12c 0%,#69a013 45%,#5a8f0a 55%,#4e8000 100%)', 'box-shadow': 'inset 0 1px 0 rgba(255,255,255,0.35)' }}>
				<span class="text-[12px] font-bold" style={{ 'text-shadow': '0 1px 1px rgba(0,0,0,0.4)' }}>
					Computer status - Protected
				</span>
			</div>

			{/* Tab strip with Help on the right */}
			<div class="flex items-end gap-[2px] bg-linear-to-b from-[#eef4fb] to-[#cfddee] px-2 pt-1.5">
				{TABS.map((tab) => {
					const selected = activeTab.value === tab;
					return (
						<button
							key={tab}
							type="button"
							onClick$={$(() => {
								activeTab.value = tab;
							})}
							class={['relative -mb-px flex items-center gap-1.5 border border-b-0 px-4 py-1 text-[12px] transition-colors', selected ? 'z-10 rounded-t-[3px] border-[#9bb8d6] bg-white font-bold text-[#15518f]' : 'rounded-t-[3px] border-transparent bg-[#bcd2ea]/50 text-[#2a5b8f] hover:bg-[#d6e6f7]']}>
							{/* Orange accent on the active tab, like real MSE */}
							{selected && <span class="absolute inset-x-0 top-0 h-[3px] rounded-t-[3px] bg-linear-to-r from-[#ff9d2e] to-[#ff7a00]" />}
							<TabIcon tab={tab} />
							{tab}
						</button>
					);
				})}
				<div class="flex flex-1 items-center justify-end border-b border-[#9bb8d6] pr-1 pb-1">
					<button type="button" class="flex items-center gap-1 rounded-sm px-2 py-0.5 text-[11px] text-[#15518f] hover:bg-[#d6e6f7]">
						<span class="flex h-4 w-4 items-center justify-center rounded-full bg-[#1b6fc4] text-[10px] font-bold text-white">?</span>
						<span>Help</span>
						<span class="text-[8px]">▼</span>
					</button>
				</div>
			</div>

			{/* Tab body */}
			<div class="min-h-0 flex-1 overflow-auto border-t border-[#9bb8d6] bg-white">
				{activeTab.value === 'Home' && <HomeTab />}
				{activeTab.value === 'Update' && <UpdateTab />}
				{activeTab.value === 'History' && <HistoryTab />}
				{activeTab.value === 'Settings' && <SettingsTab />}
			</div>
		</div>
	);
});

/** Small per-tab glyph, mirroring the icons on the real MSE tabs. */
const TabIcon = component$<{ tab: Tab }>(({ tab }) => {
	const common = { width: 14, height: 14, viewBox: '0 0 16 16', 'aria-hidden': true } as const;
	switch (tab) {
		case 'Home':
			return (
				<svg {...common}>
					<path d="M8 2 1 8h2v6h3v-4h4v4h3V8h2z" fill="#3a7d20" stroke="#2c5e18" stroke-width="0.5" />
				</svg>
			);
		case 'Update':
			return (
				<svg {...common}>
					<path d="M8 2a6 6 0 1 0 5.7 7.9h-2.1A4 4 0 1 1 8 4v2.5l3.5-3L8 0z" fill="#1b6fc4" />
				</svg>
			);
		case 'History':
			return (
				<svg {...common}>
					<circle cx="8" cy="8" r="6" fill="none" stroke="#1b6fc4" stroke-width="1.4" />
					<path d="M8 4v4l3 2" fill="none" stroke="#1b6fc4" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" />
				</svg>
			);
		case 'Settings':
			return (
				<svg {...common}>
					<path d="M8 5.5A2.5 2.5 0 1 0 8 10.5 2.5 2.5 0 0 0 8 5.5zm6-.2-1.3-.5a4.9 4.9 0 0 0-.4-1l.6-1.2-1.1-1.1-1.2.6a4.9 4.9 0 0 0-1-.4L9.2 0H7.8l-.5 1.3a4.9 4.9 0 0 0-1 .4l-1.2-.6L4 2.2l.6 1.2a4.9 4.9 0 0 0-.4 1L2.9 4.9v1.4l1.3.5a4.9 4.9 0 0 0 .4 1l-.6 1.2 1.1 1.1 1.2-.6a4.9 4.9 0 0 0 1 .4l.5 1.3h1.4l.5-1.3a4.9 4.9 0 0 0 1-.4l1.2.6 1.1-1.1-.6-1.2a4.9 4.9 0 0 0 .4-1l1.3-.5z" fill="#5a6b7b" />
				</svg>
			);
	}
});
