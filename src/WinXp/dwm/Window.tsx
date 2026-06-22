import { $, component$, useSignal, useStore, type QRL } from '@builder.io/qwik';
import type { AppInstance } from '~/contexts/types';
import { appRegistry } from '../apps/registry';

interface WindowProps {
	app: AppInstance;
	isFocus: boolean;
	onFocus$: QRL<(id: number) => void>;
	onMinimize$: QRL<(id: number) => void>;
	onToggleMaximize$: QRL<(id: number) => void>;
	onClose$: QRL<(id: number) => void>;
	/** Persist a moved/resized geometry back into the store. */
	onGeometry$: QRL<(id: number, geo: { x: number; y: number; width: number; height: number }) => void>;
}

/** Minimum window size while resizing (px). */
const MIN_W = 320;
const MIN_H = 200;
/** Reserve space for the taskbar so windows can't hide behind it. */
const TASKBAR_H = 32;

/**
 * A single XP-style window: rounded blue chrome, draggable titlebar, edge
 * resize handles, and minimize/maximize/close buttons. Focus state drives the
 * titlebar gradient (vivid blue when focused, washed-out when not).
 *
 * Drag/resize are tracked in a local store and only committed to the global
 * window-manager store on pointer-up, so dragging stays smooth.
 */
export const Window = component$<WindowProps>(({ app, isFocus, onFocus$, onMinimize$, onToggleMaximize$, onClose$, onGeometry$ }) => {
	const entry = appRegistry[app.appKey];
	// Primitive copy so the drag/resize $ closures don't try to serialize the
	// whole registry entry (which holds non-serializable JSX components).
	const resizable = entry.resizable;

	// Live geometry during a drag/resize gesture; seeded from the store value.
	const geo = useStore({ x: app.x, y: app.y, width: app.width, height: app.height });

	const rootRef = useSignal<HTMLElement>();

	// Drag/resize uses document listeners attached imperatively on pointerdown.
	// We can't rely on `useOnDocument` here because a Window is mounted lazily
	// (after the user launches an app), and qwikloader only wires up the global
	// document listeners for events present at initial page load.
	const beginMove$ = $((e: PointerEvent) => {
		if (app.maximized) return;
		const startX = e.clientX;
		const startY = e.clientY;
		const origX = geo.x;
		const origY = geo.y;

		const onMove = (ev: PointerEvent) => {
			geo.x = Math.max(0, origX + (ev.clientX - startX));
			geo.y = Math.max(0, origY + (ev.clientY - startY));
		};
		const onUp = () => {
			document.removeEventListener('pointermove', onMove);
			document.removeEventListener('pointerup', onUp);
			void onGeometry$(app.id, { x: geo.x, y: geo.y, width: geo.width, height: geo.height });
		};
		document.addEventListener('pointermove', onMove);
		document.addEventListener('pointerup', onUp);
	});

	const beginResize$ = $((e: PointerEvent, edge: string) => {
		if (app.maximized || !resizable) return;
		e.stopPropagation();
		const startX = e.clientX;
		const startY = e.clientY;
		const origX = geo.x;
		const origY = geo.y;
		const origW = geo.width;
		const origH = geo.height;

		const onMove = (ev: PointerEvent) => {
			const dx = ev.clientX - startX;
			const dy = ev.clientY - startY;
			let x = origX;
			let y = origY;
			let w = origW;
			let h = origH;
			if (edge.includes('e')) w = Math.max(MIN_W, origW + dx);
			if (edge.includes('s')) h = Math.max(MIN_H, origH + dy);
			if (edge.includes('w')) {
				w = Math.max(MIN_W, origW - dx);
				x = origX + (origW - w);
			}
			if (edge.includes('n')) {
				h = Math.max(MIN_H, origH - dy);
				y = origY + (origH - h);
			}
			geo.x = x;
			geo.y = y;
			geo.width = w;
			geo.height = h;
		};
		const onUp = () => {
			document.removeEventListener('pointermove', onMove);
			document.removeEventListener('pointerup', onUp);
			void onGeometry$(app.id, { x: geo.x, y: geo.y, width: geo.width, height: geo.height });
		};
		document.addEventListener('pointermove', onMove);
		document.addEventListener('pointerup', onUp);
	});

	const Content = entry.Content;
	const Icon = entry.Icon;

	const maximized = app.maximized;

	return (
		<section
			ref={rootRef}
			class={['pointer-events-auto absolute flex flex-col rounded-t-lg p-[3px] shadow-[2px_2px_8px_rgba(0,0,0,0.45)] select-none', app.minimized ? 'hidden' : 'flex']}
			style={{
				left: maximized ? '0' : `${geo.x}px`,
				top: maximized ? '0' : `${geo.y}px`,
				width: maximized ? '100%' : `${geo.width}px`,
				height: maximized ? `calc(100% - ${TASKBAR_H}px)` : `${geo.height}px`,
				'z-index': `${app.zIndex}`,
				'background-color': isFocus ? '#0831d9' : '#6582f5',
				'touch-action': 'none',
			}}
			onPointerdown$={$(() => onFocus$(app.id))}>
			{/* Titlebar */}
			<header
				class="flex h-[26px] shrink-0 items-center rounded-t-md px-1 text-white"
				style={{
					background: isFocus ? 'linear-gradient(to bottom,#0058ee 0%,#3593ff 4%,#288eff 6%,#127dff 8%,#036ffc 10%,#0262ee 14%,#0057e5 20%,#0054e3 24%,#0055eb 56%,#005bf5 66%,#026afe 76%,#0062ef 86%,#0052d6 92%,#0040ab 94%,#003092 100%)' : 'linear-gradient(to bottom,#7697e7 0%,#7e9ee3 3%,#94afe8 6%,#97b4e9 8%,#82a5e4 14%,#7c9fe2 17%,#7996de 25%,#7b99e1 56%,#82a9e9 81%,#80a5e7 89%,#7b96e1 94%,#7a93df 97%,#abbae3 100%)',
					'text-shadow': '1px 1px #000',
				}}
				onPointerdown$={beginMove$}
				onDblclick$={$(() => resizable && onToggleMaximize$(app.id))}>
				<Icon class="mr-1 ml-0.5 h-4 w-4" />
				<span class="flex-1 truncate text-[12px] font-bold tracking-wide">{app.title}</span>
				<div class="flex items-center gap-[2px]">
					<button type="button" title="Minimize" class="h-[21px] w-[21px] rounded-[3px] border border-white/60 bg-[#3c81f3] text-black hover:brightness-110" onPointerdown$={$((e: PointerEvent) => e.stopPropagation())} onClick$={$(() => onMinimize$(app.id))}>
						<span class="relative -top-1 inline-block">_</span>
					</button>
					{entry.resizable && (
						<button type="button" title={maximized ? 'Restore' : 'Maximize'} class="h-[21px] w-[21px] rounded-[3px] border border-white/60 bg-[#3c81f3] text-[10px] text-white hover:brightness-110" onPointerdown$={$((e: PointerEvent) => e.stopPropagation())} onClick$={$(() => onToggleMaximize$(app.id))}>
							{maximized ? '❐' : '☐'}
						</button>
					)}
					<button type="button" title="Close" class="h-[21px] w-[21px] rounded-[3px] border border-white/60 bg-[#e0512f] text-[12px] font-bold text-white hover:brightness-110" onPointerdown$={$((e: PointerEvent) => e.stopPropagation())} onClick$={$(() => onClose$(app.id))}>
						✕
					</button>
				</div>
			</header>

			{/* Content area */}
			<div class="min-h-0 flex-1 overflow-hidden border border-t-0 border-[#0831d9] bg-white">
				<Content app={app} />
			</div>

			{/* Resize handles (only when restored + resizable) */}
			{!maximized && entry.resizable && (
				<>
					<div class="absolute top-0 right-0 left-0 h-[4px] cursor-ns-resize" onPointerdown$={$((e: PointerEvent) => beginResize$(e, 'n'))} />
					<div class="absolute right-0 bottom-0 left-0 h-[4px] cursor-ns-resize" onPointerdown$={$((e: PointerEvent) => beginResize$(e, 's'))} />
					<div class="absolute top-0 bottom-0 left-0 w-[4px] cursor-ew-resize" onPointerdown$={$((e: PointerEvent) => beginResize$(e, 'w'))} />
					<div class="absolute top-0 right-0 bottom-0 w-[4px] cursor-ew-resize" onPointerdown$={$((e: PointerEvent) => beginResize$(e, 'e'))} />
					<div class="absolute top-0 left-0 h-[8px] w-[8px] cursor-nwse-resize" onPointerdown$={$((e: PointerEvent) => beginResize$(e, 'nw'))} />
					<div class="absolute top-0 right-0 h-[8px] w-[8px] cursor-nesw-resize" onPointerdown$={$((e: PointerEvent) => beginResize$(e, 'ne'))} />
					<div class="absolute bottom-0 left-0 h-[8px] w-[8px] cursor-nesw-resize" onPointerdown$={$((e: PointerEvent) => beginResize$(e, 'sw'))} />
					<div class="absolute right-0 bottom-0 h-[8px] w-[8px] cursor-nwse-resize" onPointerdown$={$((e: PointerEvent) => beginResize$(e, 'se'))} />
				</>
			)}
		</section>
	);
});
