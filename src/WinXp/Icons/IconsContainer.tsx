import { component$, useContext, useTask$ } from '@builder.io/qwik';
import { IconStateContext } from '../../contexts';
import StyledIcon from './StyledIcon';

export default component$(() => {
	const icons = useContext(IconStateContext);

	useTask$(({ track }) => {
		track(() => icons.value);
	});

	return (
		<>
			{icons.value.map((icon) => (
				<StyledIcon key={icon.id} {...icon} />
			))}
		</>
	);
});
