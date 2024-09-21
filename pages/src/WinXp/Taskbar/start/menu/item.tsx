import { component$, Slot } from '@builder.io/qwik';

interface BaseAppProps {
	name: string;
}
interface DefaultAppProps extends BaseAppProps {
	type: string;
}
interface RecentAppsProps extends BaseAppProps {}

function isDefaultAppProps(obj: BaseAppProps): obj is DefaultAppProps {
	return 'type' in obj;
}

function isRecentAppsProps(obj: BaseAppProps): obj is RecentAppsProps {
	return !('type' in obj);
}

// 44px
export default component$<DefaultAppProps | RecentAppsProps>((props) => {
	return (
		<li class="flex p-1">
			<div class="mx-1 my-auto h-7 w-7 align-text-bottom">
				<Slot />
			</div>
			<div class="mx-1 flex flex-col">
				{isDefaultAppProps(props) ? <span class="text-xs font-bold">{props.type}</span> : undefined}
				<span
					class="my-auto text-xs font-light"
					style={{
						color: isDefaultAppProps(props) ? 'rgba(0, 0, 0, 0.4)' : 'black',
					}}>
					{props.name}
				</span>
			</div>
		</li>
	);
});
