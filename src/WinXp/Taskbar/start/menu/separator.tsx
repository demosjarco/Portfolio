import { component$ } from '@builder.io/qwik';

export default component$(() => {
	return (
		<div
			class="h-px w-full"
			style={{
				background: `linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,${44 / 255}) 50%, rgba(0,0,0,0) 100%)`,
			}}></div>
	);
});
