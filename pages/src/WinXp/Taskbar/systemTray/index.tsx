import { component$, useSignal, useVisibleTask$ } from '@builder.io/qwik';

export default component$(() => {
	const clockRef = useSignal<HTMLSpanElement>();

	// Must be `useVisibleTask()` because `useTask()` doesn't update on SSG
	useVisibleTask$(({ track, cleanup }) => {
		track(() => clockRef.value);

		const clockTimer = setInterval(
			() => {
				if (clockRef.value) {
					const date = new Date();
					clockRef.value.innerText = date.toLocaleTimeString().replace(/(?<=\d+:\d+):\d+/i, '');
					clockRef.value.title = date.toDateString();
				}
			},
			// seconds * milliseconds
			1 * 1000,
		);

		cleanup(() => clearInterval(clockTimer));
	});

	return (
		<div
			class="ml-2.5 flex border-l px-2.5"
			style={{
				background: 'linear-gradient(to bottom, #0c59b9 1%, #139ee9 6%, #18b5f2 10%, #139beb 14%, #1290e8 19%, #0d8dea 63%, #0d9ff1 81%, #0f9eed 88%, #119be9 91%, #1392e2 94%, #137ed7 97%, #095bc9 100%)',
				'border-left': '1px solid #1042af',
				'box-shadow': 'inset 1px 0 1px #18bbff',
			}}>
			<div class="my-auto flex">
				<div class="flex">{/* Other taskbar items go here */}</div>
				<span ref={clockRef} class="pl-1 pr-2 text-sm font-light" title={new Date().toDateString()}>
					{new Date().toLocaleTimeString().replace(/(?<=\d+:\d+):\d+/i, '')}
				</span>
			</div>
		</div>
	);
});
