import { $, component$, sync$, useContext, useOnDocument, useSignal, useStore } from '@builder.io/qwik';
import { IconStateContext, WindowManagerContext } from '~/contexts';
import { Focusing } from '~/contexts/types';
import { focusDesktop, launchApp } from '~/WinXp/dwm/actions';
import { MarqueeMode, marqueeSelected, rangeSelected, selectedIds, toggled, withFocus, withSelection } from '~/WinXp/Icons/selection';
import StyledIcon, { SELECTED_ICON_FILTER_ID, XP_HIGHLIGHT } from '~/WinXp/Icons/StyledIcon';
import XorFocusRect from '~/WinXp/Icons/XorFocusRect';

/** Win32 SM_CXDRAG / SM_CYDRAG default: movement needed before a drag starts. */
const DRAG_THRESHOLD = 4;
/** Win32 default double-click time (ms). */
const DOUBLE_CLICK_MS = 500;
const MODIFIER_KEYS = ['Control', 'Shift', 'Meta'];

interface Rect {
	left: number;
	top: number;
	right: number;
	bottom: number;
}
interface HitRect extends Rect {
	id: number;
}

function intersects(a: Rect, b: Rect): boolean {
	return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function isTypingTarget(target: EventTarget | null): boolean {
	return target instanceof HTMLElement && (target.isContentEditable || ['input', 'textarea', 'select'].includes(target.tagName.toLowerCase()));
}

/**
 * The desktop surface: icon grid, selection, rubber band and keyboard.
 *
 * Mirrors the XP desktop listview (verified against a real XP VM):
 * - Click selects one icon; Ctrl+click toggles; Shift+click selects a range.
 * - Pressing on an already-selected icon keeps the multi-selection while the button is down and collapses to that icon on release.
 * - Pressing on empty desktop clears the selection; dragging draws a dotted XOR rectangle that selects every icon it touches, live. Ctrl+drag toggles, Shift+drag adds.
 * - Double-click or Enter opens every selected icon. Ctrl+A selects all.
 * - The dotted focus rectangle on the caret icon only appears once the keyboard has been used (XP hides keyboard cues for mouse users).
 * - Focusing a window or the taskbar leaves the selection as it was.
 */
export default component$(() => {
	const icons = useContext(IconStateContext);
	const wm = useContext(WindowManagerContext);

	const surfaceRef = useSignal<HTMLDivElement>();
	const marquee = useStore({ visible: false, left: 0, top: 0, width: 0, height: 0 });
	const ui = useStore({ anchorId: -1, showFocusCues: false });
	/** Selection right before a click collapsed it, so a double-click can still open all of it. */
	const collapsed = useStore({ id: -1, ids: [] as number[], time: 0 });

	const desktopFocused = wm.focusing !== Focusing.window;

	// --- Opening ----------------------------------------------------------

	const openIcons$ = $((ids: number[]) => {
		for (const icon of icons.value.filter((i) => ids.includes(i.id))) {
			launchApp(wm, icon.appKey);
		}
	});

	// --- Clicking an icon ---------------------------------------------------

	const pressIcon$ = $((e: PointerEvent, id: number) => {
		const icon = icons.value.find((i) => i.id === id);
		if (!icon) return;
		const anchor = ui.anchorId >= 0 ? ui.anchorId : id;
		let next = icons.value;

		if (e.button === 2) {
			// Right-click selects an unselected icon, keeps an existing selection.
			if (!icon.isSelected) next = withSelection(next, [id]);
		} else if (e.ctrlKey && e.shiftKey) {
			next = rangeSelected(next, anchor, id, true);
		} else if (e.ctrlKey) {
			next = toggled(next, id);
			ui.anchorId = id;
		} else if (e.shiftKey) {
			next = rangeSelected(next, anchor, id, false);
		} else if (!icon.isSelected) {
			next = withSelection(next, [id]);
			ui.anchorId = id;
		} else {
			// Already selected: collapse to this icon on release, unless the pointer moved (that would be an icon drag in real XP).
			const startX = e.clientX;
			const startY = e.clientY;
			let moved = false;
			const onMove = (ev: PointerEvent) => {
				moved ||= Math.abs(ev.clientX - startX) > DRAG_THRESHOLD || Math.abs(ev.clientY - startY) > DRAG_THRESHOLD;
			};
			const onUp = () => {
				document.removeEventListener('pointermove', onMove);
				document.removeEventListener('pointerup', onUp);
				if (moved) return;
				collapsed.id = id;
				collapsed.ids = selectedIds(icons.value);
				collapsed.time = performance.now();
				icons.value = withSelection(icons.value, [id]);
				ui.anchorId = id;
			};
			document.addEventListener('pointermove', onMove);
			document.addEventListener('pointerup', onUp);
		}

		icons.value = withFocus(next, id);
	});

	// --- Rubber band ----------------------------------------------------------

	const beginMarquee$ = $((e: PointerEvent, surface: HTMLDivElement) => {
		const mode = e.ctrlKey ? MarqueeMode.toggle : e.shiftKey ? MarqueeMode.add : MarqueeMode.replace;
		const base = new Set(mode === MarqueeMode.replace ? [] : selectedIds(icons.value));
		if (mode === MarqueeMode.replace) icons.value = withSelection(icons.value, []);

		const bounds = surface.getBoundingClientRect();
		const toLocal = (clientX: number, clientY: number) => ({
			x: Math.min(Math.max(clientX - bounds.left, 0), bounds.width),
			y: Math.min(Math.max(clientY - bounds.top, 0), bounds.height),
		});
		const start = toLocal(e.clientX, e.clientY);

		// Icons don't move during a drag, so measure their hit boxes once.
		const hitRects: HitRect[] = [...surface.querySelectorAll<HTMLElement>('[data-icon-hit]')].map((el) => {
			const r = el.getBoundingClientRect();
			return { id: Number(el.dataset['iconHit']), left: r.left - bounds.left, top: r.top - bounds.top, right: r.right - bounds.left, bottom: r.bottom - bounds.top };
		});

		let dragging = false;
		const onMove = (ev: PointerEvent) => {
			const p = toLocal(ev.clientX, ev.clientY);
			if (!dragging && Math.abs(p.x - start.x) <= DRAG_THRESHOLD && Math.abs(p.y - start.y) <= DRAG_THRESHOLD) return;
			dragging = true;

			const band: Rect = { left: Math.min(start.x, p.x), top: Math.min(start.y, p.y), right: Math.max(start.x, p.x), bottom: Math.max(start.y, p.y) };
			marquee.visible = true;
			marquee.left = band.left;
			marquee.top = band.top;
			marquee.width = band.right - band.left;
			marquee.height = band.bottom - band.top;

			const hits = new Set(hitRects.filter((r) => intersects(band, r)).map((r) => r.id));
			icons.value = marqueeSelected(icons.value, base, hits, mode);
		};
		const onUp = () => {
			document.removeEventListener('pointermove', onMove);
			document.removeEventListener('pointerup', onUp);
			marquee.visible = false;
		};
		document.addEventListener('pointermove', onMove);
		document.addEventListener('pointerup', onUp);
	});

	// --- Pointer entry points -----------------------------------------------

	const onPointerDown$ = $((e: PointerEvent) => {
		const surface = surfaceRef.value;
		if (!surface || (e.button !== 0 && e.button !== 2)) return;
		focusDesktop(wm);

		const hit = (e.target as Element).closest<HTMLElement>('[data-icon-hit]');
		if (hit) {
			void pressIcon$(e, Number(hit.dataset['iconHit']));
		} else if (e.button === 0) {
			void beginMarquee$(e, surface);
		}
	});

	const onDblClick$ = $((e: MouseEvent) => {
		const hit = (e.target as Element).closest<HTMLElement>('[data-icon-hit]');
		if (!hit) return;
		const id = Number(hit.dataset['iconHit']);

		// The first click of the double-click may have collapsed a multi-selection; XP still opens all of it.
		const recent = collapsed.id === id && performance.now() - collapsed.time < DOUBLE_CLICK_MS && collapsed.ids.includes(id);
		const ids = recent ? collapsed.ids : selectedIds(icons.value);
		if (recent) icons.value = withSelection(icons.value, ids);
		collapsed.id = -1;
		void openIcons$(ids.length > 0 ? ids : [id]);
	});

	// --- Keyboard -----------------------------------------------------------

	// Must run synchronously to stop the browser selecting the whole page.
	useOnDocument(
		'keydown',
		sync$((e: KeyboardEvent) => {
			const typing = e.target instanceof HTMLElement && (e.target.isContentEditable || ['input', 'textarea', 'select'].includes(e.target.tagName.toLowerCase()));
			const desktop = document.querySelector('[data-desktop-focused="true"]');
			if (desktop && !typing && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') e.preventDefault();
		}),
	);

	useOnDocument(
		'keydown',
		$((e: KeyboardEvent) => {
			if (wm.focusing === Focusing.window || isTypingTarget(e.target)) return;
			// Holding a modifier alone (e.g. for Ctrl+click) doesn't turn keyboard cues on.
			if (!MODIFIER_KEYS.includes(e.key)) ui.showFocusCues = true;

			if (e.key === 'Enter') {
				void openIcons$(selectedIds(icons.value));
			} else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
				icons.value = withSelection(
					icons.value,
					icons.value.map((i) => i.id),
				);
			}
		}),
	);

	return (
		<div ref={surfaceRef} role="listbox" aria-label="Desktop" aria-multiselectable="true" data-desktop-focused={desktopFocused ? 'true' : 'false'} class="absolute inset-x-0 top-0 bottom-8 select-none" onPointerDown$={onPointerDown$} onDblClick$={onDblClick$}>
			{/* 50% blend of opaque icon pixels with the highlight colour (comctl32 ILD_BLEND50). */}
			<svg aria-hidden="true" width="0" height="0" class="absolute">
				<filter id={SELECTED_ICON_FILTER_ID} style={{ 'color-interpolation-filters': 'sRGB' }}>
					<feFlood flood-color={XP_HIGHLIGHT} flood-opacity="0.5" />
					<feComposite in2="SourceAlpha" operator="in" />
					<feComposite in2="SourceGraphic" operator="over" />
				</filter>
			</svg>

			<div class="absolute top-2 left-2 flex flex-col flex-wrap gap-1">
				{icons.value.map((icon) => (
					<StyledIcon key={icon.id} {...icon} showFocusRect={icon.isFocused && ui.showFocusCues && desktopFocused} />
				))}
			</div>

			{marquee.visible && <XorFocusRect style={{ left: `${marquee.left}px`, top: `${marquee.top}px`, width: `${marquee.width}px`, height: `${marquee.height}px` }} />}
		</div>
	);
});
