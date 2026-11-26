import { component$, type CSSProperties } from '@builder.io/qwik';

/** One 1px-on / 1px-off white dash pattern per edge. */
const DOTS_H = 'repeating-linear-gradient(to right, #fff 0 1px, transparent 1px 2px)';
const DOTS_V = 'repeating-linear-gradient(to bottom, #fff 0 1px, transparent 1px 2px)';

const dottedEdges: CSSProperties = {
	background: [`${DOTS_H} top left / 100% 1px no-repeat`, `${DOTS_H} bottom left / 100% 1px no-repeat`, `${DOTS_V} top left / 1px 100% no-repeat`, `${DOTS_V} top right / 1px 100% no-repeat`].join(', '),
};

/**
 * Win32 `DrawFocusRect` look-alike: a 1px dotted rectangle that XORs the pixels underneath. XOR with white is colour inversion, which `mix-blend-mode: difference` against white reproduces exactly (sampled on the real desktop: #4F88F3 → #B0770C).
 *
 * Used for both the desktop rubber-band selection and the focused icon's label. Position it with `class`/`style` (absolute).
 */
export default component$<{ class?: string; style?: CSSProperties }>((props) => {
	return <div aria-hidden="true" class={['pointer-events-none absolute mix-blend-difference', props.class]} style={{ ...dottedEdges, ...props.style }} />;
});
