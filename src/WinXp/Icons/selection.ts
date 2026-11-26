import type { IconStates } from '~/contexts/types';

/**
 * Pure helpers for desktop icon selection, mirroring the XP listview rules. Each returns a new array (or the same array when nothing changed, so the signal doesn't re-render needlessly).
 */

/** How a rubber-band (marquee) drag combines with the selection it started from. */
export enum MarqueeMode {
	/** Plain drag: selection is exactly what the rectangle touches. */
	replace = 'replace',
	/** Shift+drag: rectangle hits are added to the starting selection. */
	add = 'add',
	/** Ctrl+drag: rectangle hits toggle against the starting selection. */
	toggle = 'toggle',
}

// --- Queries ---------------------------------------------------------------

export function selectedIds(icons: IconStates): number[] {
	return icons.filter((i) => i.isSelected).map((i) => i.id);
}

function sameSelection(icons: IconStates, next: ReadonlySet<number>): boolean {
	return icons.every((i) => i.isSelected === next.has(i.id));
}

// --- Selection mutations ---------------------------------------------------

/** Replace the selection with exactly `ids`; leaves the focus item alone. */
export function withSelection(icons: IconStates, ids: Iterable<number>): IconStates {
	const next = new Set(ids);
	if (sameSelection(icons, next)) return icons;
	return icons.map((i) => ({ ...i, isSelected: next.has(i.id) }));
}

/** Move the focus (caret) item to `id`. */
export function withFocus(icons: IconStates, id: number | undefined): IconStates {
	if (icons.every((i) => i.isFocused === (i.id === id))) return icons;
	return icons.map((i) => ({ ...i, isFocused: i.id === id }));
}

export function toggled(icons: IconStates, id: number): IconStates {
	return icons.map((i) => (i.id === id ? { ...i, isSelected: !i.isSelected } : i));
}

/**
 * Shift+click: select every icon between the anchor and `id` (inclusive) in icon order. `additive` (Ctrl+Shift) keeps the existing selection.
 */
export function rangeSelected(icons: IconStates, anchorId: number, id: number, additive: boolean): IconStates {
	const a = icons.findIndex((i) => i.id === anchorId);
	const b = icons.findIndex((i) => i.id === id);
	if (a < 0 || b < 0) return withSelection(icons, [id]);

	const [lo, hi] = a < b ? [a, b] : [b, a];
	const range = icons.slice(lo, hi + 1).map((i) => i.id);
	return withSelection(icons, additive ? [...selectedIds(icons), ...range] : range);
}

/** Combine the marquee's current hits with the selection the drag started from. */
export function marqueeSelected(icons: IconStates, base: ReadonlySet<number>, hits: ReadonlySet<number>, mode: MarqueeMode): IconStates {
	switch (mode) {
		case MarqueeMode.replace:
			return withSelection(icons, hits);
		case MarqueeMode.add:
			return withSelection(icons, [...base, ...hits]);
		case MarqueeMode.toggle:
			return withSelection(
				icons,
				icons.filter((i) => base.has(i.id) !== hits.has(i.id)).map((i) => i.id),
			);
	}
}
