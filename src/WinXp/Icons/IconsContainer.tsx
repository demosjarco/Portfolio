import { component$, useContext, useTask$ } from '@builder.io/qwik';
import { IconStateContext } from '../../contexts';
import StyledIcon from './StyledIcon';

/**
 * Desktop icon grid. Icons live in a top-left column (the classic XP layout)
 * and float above the wallpaper but below the windows.
 */
export default component$(() => {
	const icons = useContext(IconStateContext);

	useTask$(({ track }) => {
		track(() => icons.value);
	});

	return (
		<div class="absolute top-2 left-2 flex flex-col flex-wrap gap-1">
			{icons.value.map((icon) => (
				<StyledIcon key={icon.id} {...icon} />
			))}
		</div>
	);
});
