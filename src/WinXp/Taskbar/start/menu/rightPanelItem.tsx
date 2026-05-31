import { component$, Slot } from '@builder.io/qwik';

export default component$<{ name: string; bold?: boolean }>(({ bold = false, ...props }) => {
	return (
		<li class="w-full cursor-default p-px text-[#00136b] hover:bg-[#2f71cd] hover:text-white">
			<button class="flex h-7 w-full cursor-default items-center">
				<div class="mx-1 h-6 w-6">
					<Slot />
				</div>
				<span
					class="ml-1 text-xs"
					style={{
						'font-weight': bold ? 'bold' : 'normal',
					}}>
					{props.name}
				</span>
			</button>
		</li>
	);
});
