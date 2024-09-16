import { component$, useContext, useTask$ } from '@builder.io/qwik';
import '@fontsource/noto-sans';
import { PowerStateContext } from '../contexts';
import { PowerState } from '../contexts/types';
import Background from './background';
import Taskbar from './Taskbar';

export default component$(() => {
	const power = useContext(PowerStateContext);

	useTask$(({ track }) => {
		track(() => power.value);
	});

	return (
		<div
			class={[
				'font-sans',
				'h-screen',
				'w-screen',
				'overflow-hidden',
				'relative',
				{
					'animate-[powerOffAnimation_5s_forwards]': power.value === PowerState.logOff || power.value === PowerState.turnOff,
				},
			]}>
			<Background />
			<Taskbar />
		</div>
	);
});
