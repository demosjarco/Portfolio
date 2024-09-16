import { component$ } from '@builder.io/qwik';

export default component$(() => {
	return (
		<div
			class="flex flex-col items-center rounded-r-lg px-2.5 font-bold italic"
			style={{
				background: 'linear-gradient(180deg, #5ca05c 3%, #8cbe8b 6%, #75b275 10%, #64ab64 12%, #4e9f4d 15%, #499e48 18%, #469e46 20%, #45a045 23%, #43a543 38%, #48aa41 86%, #47b747 89%, #46b246 92%, #44ad44 95%, #3c963c 98%)',
				'border-right': '1px solid #1042af',
				'box-shadow': 'inset -1px 0 1px #206320',
				'text-shadow': '1px 1px 1px rgba(0,0,0,0.5)',
			}}>
			<span class="my-auto">start</span>
		</div>
	);
});
