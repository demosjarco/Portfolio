import { component$, Slot, type ClassList } from '@builder.io/qwik';
import Folder from '~/assets/windowsIcons/shell32_37-6.png?w=16&h=16&jsx';

export default component$<{ folder?: boolean; name: string; href?: string }>(({ folder = false, ...props }) => {
	const rootClasses: ClassList = 'block h-6 w-full cursor-default px-2 py-1 pr-4 text-xs font-light';
	const rootContent = (
		<span class="my-auto flex">
			<div class="h-4 w-4 shrink-0">{folder ? <Folder /> : <Slot name="icon" />}</div>
			<span class="my-auto pl-2">{props.name}</span>
			<div class="grow"></div>
			{folder ? (
				<svg class="my-auto ms-3 h-2 w-2" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 6 10">
					<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m1 9 4-4-4-4" />
				</svg>
			) : undefined}
		</span>
	);

	return folder ? (
		<div class={rootClasses}>{rootContent}</div>
	) : (
		<li class="block w-full text-black hover:bg-[#2f71cd] hover:text-white">
			{props.href ? (
				<a href={props.href} target="_blank" referrerPolicy="no-referrer" rel="noopener" class={[rootClasses, 'text-inherit no-underline']}>
					{rootContent}
				</a>
			) : (
				<button class={rootClasses}>{rootContent}</button>
			)}
			<Slot name="submenu" />
		</li>
	);
});
