import { component$ } from '@builder.io/qwik';

/**
 * Shared status iconography for Microsoft Security Essentials, drawn as inline
 * SVG so we don't have to bundle extra raster icons (icon-copy budget is
 * limited). Colours match the classic MSE status palette.
 */

interface ShieldProps {
	/** Pixel size of the square shield. */
	size?: number;
	class?: string;
}

/** Green shield with a check — "protected" / healthy state. */
export const ShieldOk = component$<ShieldProps>(({ size = 20, class: cls }) => (
	<svg class={cls} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
		<path d="M12 1 3 4v7c0 5.2 3.6 9.6 9 11 5.4-1.4 9-5.8 9-11V4l-9-3Z" fill="#3a9e34" stroke="#2c7a27" stroke-width="0.75" />
		<path d="m7.5 12 3 3 6-6.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
	</svg>
));

/** Yellow shield with an exclamation — "potentially unprotected" state. */
export const ShieldWarn = component$<ShieldProps>(({ size = 20, class: cls }) => (
	<svg class={cls} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
		<path d="M12 1 3 4v7c0 5.2 3.6 9.6 9 11 5.4-1.4 9-5.8 9-11V4l-9-3Z" fill="#e6a817" stroke="#b9850f" stroke-width="0.75" />
		<path d="M12 6.5v6" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" />
		<circle cx="12" cy="16.5" r="1.3" fill="#fff" />
	</svg>
));

/** Red shield with an X — "at risk" / severe state. */
export const ShieldDanger = component$<ShieldProps>(({ size = 20, class: cls }) => (
	<svg class={cls} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
		<path d="M12 1 3 4v7c0 5.2 3.6 9.6 9 11 5.4-1.4 9-5.8 9-11V4l-9-3Z" fill="#c1352b" stroke="#94271f" stroke-width="0.75" />
		<path d="m8.5 8.5 7 7m0-7-7 7" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" />
	</svg>
));
