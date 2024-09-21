import { component$, noSerialize, useSignal, useVisibleTask$, type NoSerialize } from '@builder.io/qwik';
import { Dropdown } from 'flowbite';
import XpLogo from '~/assets/xp.svg?jsx';
import Menu from './menu';

export default component$(() => {
	const startButton = useSignal<HTMLButtonElement>();
	const startMenuDiv = useSignal<HTMLDivElement>();
	const startMenuRef = useSignal<NoSerialize<Dropdown>>();

	useVisibleTask$(({ track, cleanup }) => {
		track(() => startButton.value);
		track(() => startMenuDiv.value);

		if (startButton.value && startMenuDiv.value) {
			startMenuRef.value = noSerialize(
				new Dropdown(startMenuDiv.value, startButton.value, {
					placement: 'top',
					offsetSkidding: 0,
					offsetDistance: 0,
				}),
			);
			// For debug
			// startMenuRef.value?.show();
		}

		cleanup(() => startMenuRef.value?.destroyAndRemoveInstance());
	});

	return (
		<>
			<button
				ref={startButton}
				class="flex cursor-default flex-col rounded-r-lg pl-2 pr-3"
				style={{
					background: 'linear-gradient(180deg, #5ca05c 3%, #8cbe8b 6%, #75b275 10%, #64ab64 12%, #4e9f4d 15%, #499e48 18%, #469e46 20%, #45a045 23%, #43a543 38%, #48aa41 86%, #47b747 89%, #46b246 92%, #44ad44 95%, #3c963c 98%)',
					'border-right': '1px solid #1042af',
					'box-shadow': 'inset -1px 0 1px #206320, inset 1px 1px 2px rgba(255, 255, 255, 0.5)',
					'text-shadow': '1px 1px 1px rgba(0,0,0,0.5)',
				}}>
				<span>
					<XpLogo
						class="inline-block h-5 align-bottom"
						style={{
							filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.5))',
						}}
					/>
					<span class="inline-block align-sub text-sm font-bold italic">start</span>
				</span>
			</button>
			<div ref={startMenuDiv} class="z-10 hidden w-44">
				<Menu />
			</div>
		</>
	);
});
