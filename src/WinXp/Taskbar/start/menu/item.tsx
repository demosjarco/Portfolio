import { component$, Slot, type QRL } from '@builder.io/qwik';

interface BaseAppProps {
	name: string;
	href?: string;
	/** Launch handler for in-OS apps (mutually exclusive with `href`). */
	onClick$?: QRL<() => void>;
}
interface DefaultAppProps extends BaseAppProps {
	type: string;
}
interface RecentAppsProps extends BaseAppProps {}

function isDefaultAppProps(obj: BaseAppProps): obj is DefaultAppProps {
	return 'type' in obj;
}

// 44px
export default component$<DefaultAppProps | RecentAppsProps>((props) => {
	const inner = (
		<>
			<div class="mx-1 my-auto h-8 w-8 align-text-bottom">
				<Slot />
			</div>
			<div class="mx-1 flex flex-col">
				{isDefaultAppProps(props) ? <span class="text-xs font-bold">{props.type}</span> : undefined}
				<span class={['my-auto text-xs font-light group-hover:text-white', isDefaultAppProps(props) ? 'text-black/40' : 'text-black']}>{props.name}</span>
			</div>
		</>
	);

	return (
		<li class="group hover:bg-[#2f71cd] hover:text-white">
			{props.href ? (
				<a href={props.href} target="_blank" referrerPolicy="no-referrer" class="flex cursor-default p-1 text-inherit no-underline">
					{inner}
				</a>
			) : props.onClick$ ? (
				<button type="button" onClick$={props.onClick$} class="flex w-full cursor-default p-1 text-left">
					{inner}
				</button>
			) : (
				<div class="flex p-1">{inner}</div>
			)}
		</li>
	);
});
