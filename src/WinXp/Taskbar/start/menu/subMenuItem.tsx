import { component$, Slot, type ClassList, type CSSProperties, type JSXOutput } from '@builder.io/qwik';
import Folder from '~/assets/windowsIcons/shell32_37-6.png?jsx';

export default component$<{ folder?: boolean; name: string }>(({ folder = false, ...props }) => {
	const rootClasses: ClassList = 'block h-6 w-full cursor-default px-2 py-1 pr-4 text-xs font-light';
	const rootStyle: CSSProperties = {
		'box-shadow': 'inset 3px 0 #4081ff',
	};
	const rootContent: JSXOutput = (
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
	);

	return (
		<>
			{folder ? (
				<div class={rootClasses} style={rootStyle}>
					{rootContent}
				</div>
			) : (
				<button class={rootClasses} style={rootStyle}>
					{rootContent}
				</button>
			)}
			<Slot name="submenu" />
		</>
	);
});
