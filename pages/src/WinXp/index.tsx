import { component$, useContext, useTask$ } from '@builder.io/qwik';
import '@fontsource/noto-sans';
import { PowerStateContext } from '../contexts';
import { PowerState } from '../contexts/types';
import IconsContainer from './Icons/IconsContainer';

export default component$<{ icons }>(({ icons }) => {
	const power = useContext(PowerStateContext);

	useTask$(({ track }) => {
		track(() => power.value);
	});

	return (
		<div
			class={[
				'font-sans',
				'h-full',
				'overflow-hidden',
				'relative',
				"bg-[url('/assets/Wallpaper/Bliss.jpg')]",
				'bg-cover',
				{
					'animate-[powerOffAnimation_5s_forwards]': power.value === PowerState.logOff || power.value === PowerState.turnOff,
				},
			]}>
			<IconsContainer />
		</div>
	);
});
