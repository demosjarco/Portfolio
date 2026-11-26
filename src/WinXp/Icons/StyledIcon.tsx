import { component$ } from '@builder.io/qwik';
import MseIcon from '~/assets/windowsIcons/Microsoft_Security_Essentials_icon.png?w=32&h=32&jsx';
import MessengerIcon from '~/assets/windowsIcons/msmsgs_1_1-6.png?w=32&h=32&jsx';
import { AppKey, type IconState } from '~/contexts/types';
import XorFocusRect from '~/WinXp/Icons/XorFocusRect';

/** Large 32px desktop icons keyed by the app they launch. */
const desktopIcons: Partial<Record<AppKey, typeof MseIcon>> = {
	[AppKey.SecurityEssentials]: MseIcon,
	[AppKey.Messenger]: MessengerIcon,
};

/** Luna COLOR_HIGHLIGHT, sampled from the real XP desktop selection. */
export const XP_HIGHLIGHT = '#316AC5';

/** Id of the SVG filter (defined in IconsContainer) that blends icon pixels 50% with the highlight. */
export const SELECTED_ICON_FILTER_ID = 'xp-icon-selected';

const ICON_SHADOW = 'drop-shadow(1px 1px 1px rgba(0,0,0,0.5))';

interface Props extends IconState {
	/** Draw the dotted focus rectangle (keyboard cues are on and this is the caret item). */
	showFocusRect: boolean;
}

/**
 * Presentational desktop icon. All pointer/keyboard behaviour lives in IconsContainer, which hit-tests via `data-icon-hit`.
 *
 * Like the real listview, only the icon image and the label are hit targets; the empty space around them in the grid cell belongs to the desktop (so a drag there starts a rubber band).
 */
export default component$<Props>(({ id, appKey, title, isSelected, showFocusRect }) => {
	const Icon = desktopIcons[appKey] ?? MseIcon;

	return (
		<div role="option" aria-selected={isSelected} class="pointer-events-none flex w-19 flex-col items-center gap-0.5 p-1 text-white">
			<span data-icon-hit={id} class="pointer-events-auto p-0.5">
				<Icon
					class="block h-8 w-8"
					draggable={false}
					style={{
						filter: isSelected ? `url(#${SELECTED_ICON_FILTER_ID}) ${ICON_SHADOW}` : ICON_SHADOW,
					}}
				/>
			</span>
			<span
				data-icon-hit={id}
				class="pointer-events-auto relative max-w-full px-1 text-center text-[11px] leading-tight"
				style={{
					'background-color': isSelected ? XP_HIGHLIGHT : undefined,
					'text-shadow': isSelected ? 'none' : '1px 1px 1px rgba(0,0,0,0.8)',
				}}>
				{title}
				{showFocusRect && <XorFocusRect class="inset-0" />}
			</span>
		</div>
	);
});
