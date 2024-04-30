import { staticAdapter } from '@builder.io/qwik-city/adapters/static/vite';
import { extendConfig } from '@builder.io/qwik-city/vite';
import baseConfig from '../../vite.config';

export default extendConfig(baseConfig, () => {
	return {
		build: {
			rollupOptions: {
				input: ['@qwik-city-plan'],
			},
			ssrManifest: true,
			ssr: true,
		},
		plugins: [
			staticAdapter({
				origin: 'https://demosjarco.dev',
			}),
		],
	};
});
