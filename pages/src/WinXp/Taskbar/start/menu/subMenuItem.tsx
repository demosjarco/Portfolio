import { component$, Slot } from '@builder.io/qwik';
import Folder from '~/assets/windowsIcons/shell32_37-6.png?jsx';

export default component$<{ folder?: boolean; name: string }>(({ folder = false, ...props }) => {
	return (
		<>
			<button
				class="block h-6 w-full px-2 py-1 pr-4 text-xs font-light"
				style={{
					'box-shadow': 'inset 3px 0 #4081ff',
				}}>
				<span class="my-auto flex">
					<div class="h-4 w-4">{folder ? <Folder /> : <Slot name="icon" />}</div>
					<span class="my-auto pl-2">{props.name}</span>
					<div class="grow"></div>
					{folder ? (
						<svg class="my-auto ms-3 h-2 w-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
							<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 9 4-4-4-4" />
						</svg>
					) : undefined}
				</span>
			</button>
			<Slot name="submenu" />
		</>
	);
});
