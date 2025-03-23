import { component$, noSerialize, Slot, useSignal, useVisibleTask$, type NoSerialize } from '@builder.io/qwik';
import { Dropdown } from 'flowbite';
import SubMenuItem from './subMenuItem';

export default component$<{ empty?: boolean }>(({ empty = false, ...props }) => {
	const rootButton = useSignal<HTMLButtonElement>();
	const rootMenuDiv = useSignal<HTMLDivElement>();
	const rootMenuRef = useSignal<NoSerialize<Dropdown>>();

	useVisibleTask$(({ track, cleanup }) => {
		track(() => rootButton.value);
		track(() => rootMenuDiv.value);

		if (rootButton.value && rootMenuDiv.value) {
			rootMenuRef.value = noSerialize(
				new Dropdown(rootMenuDiv.value, rootButton.value, {
					placement: 'right-start',
					triggerType: 'hover',
					offsetSkidding: 0,
					offsetDistance: 0,
				}),
			);
			// For debug
			// rootMenuRef.value?.show();
		}

		cleanup(() => rootMenuRef.value?.destroyAndRemoveInstance());
	});

	return (
		// block h-6 w-full cursor-default px-2 py-1 pr-4 text-xs font-light
		<li class="block w-full text-black hover:bg-[#316ac5] hover:text-white">
			<button ref={rootButton} class="flex h-6 w-full cursor-default">
				<Slot name="root" />
			</button>
			<div
				ref={rootMenuDiv}
				class="z-10 hidden bg-white pl-px text-black shadow"
				style={{
					'box-shadow': 'inset 0 0 0 1px #72ade9, 2px 3px 3px rgb(0, 0, 0, 0.5)',
				}}>
				<ul class="text-sm whitespace-nowrap">{empty ? <SubMenuItem name="(Empty)" /> : <Slot />}</ul>
			</div>
		</li>
	);
});
