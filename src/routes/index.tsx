import { component$ } from '@builder.io/qwik';
import type { DocumentHead } from '@builder.io/qwik-city';
import WinXp from '../WinXp';

export default component$(() => {
	return <WinXp />;
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
