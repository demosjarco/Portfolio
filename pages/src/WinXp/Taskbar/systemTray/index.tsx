import { component$ } from '@builder.io/qwik';

export default component$(() => {
	return (
		<div
			class="ml-2.5 border-l px-2.5"
			style={{
				background: 'linear-gradient(to bottom, #0c59b9 1%, #139ee9 6%, #18b5f2 10%, #139beb 14%, #1290e8 19%, #0d8dea 63%, #0d9ff1 81%, #0f9eed 88%, #119be9 91%, #1392e2 94%, #137ed7 97%, #095bc9 100%)',
				'border-left': '1px solid #1042af',
				'box-shadow': 'inset 1px 0 1px #18bbff',
			}}>
			Tray
		</div>
	);
});
