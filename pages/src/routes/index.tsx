import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';

export default component$(() => {
	return (
		<>
			<h1>Hi 👋</h1>
			<p>
				Can't wait to see what you build with qwik!
				<br />
				Happy coding.
			</p>
		</>
	);
});

export const head: DocumentHead = ({ url }) => {
	const title = 'TODO';
	const description = 'TODO';

	return {
		title,
		meta: [
			{
				name: 'description',
				content: description,
			},
			{
				name: 'theme-color',
				media: '#388E3C',
			},
			/**
			 * OpenGraph
			 * @url https://ogp.me/
			 */
			{
				property: 'og:title',
				content: title,
			},
			{
				property: 'og:type',
				content: 'website',
			},
			{
				property: 'og:url',
				content: url.toString(),
			},
			{
				name: 'og:description',
				content: description,
			},
			{
				name: 'og:locale',
				content: 'en_US',
			},
			{
				name: 'og:site_name ',
				content: title,
			},
		],
	};
};
