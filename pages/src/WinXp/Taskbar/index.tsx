import { component$ } from '@builder.io/qwik';
import QuickLaunch from './quickLaunch';
import Start from './start';
import SystemTray from './systemTray';
import TaskbarWindows from './taskbarWindows';

export default component$(() => {
	return (
		<footer
			class="absolute bottom-0 flex h-8 w-full text-white"
			style={{
				background: 'linear-gradient(to bottom, #1f2f86 0, #3165c4 3%, #3682e5 6%, #4490e6 10%, #3883e5 12%, #2b71e0 15%, #2663da 18%, #235bd6 20%, #2258d5 23%, #2157d6 38%, #245ddb 54%, #2562df 86%, #245fdc 89%, #2158d4 92%, #1d4ec0 95%, #1941a5 98%)',
			}}>
			<Start />
			<QuickLaunch />
			<TaskbarWindows />
			<SystemTray />
		</footer>
	);
});
