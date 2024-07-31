import { staticAdapter } from '@builder.io/qwik-city/adapters/static/vite';
import { extendConfig } from '@builder.io/qwik-city/vite';
import type { UserConfig } from 'vite';
import baseConfig from '../../vite.config';

export default extendConfig(baseConfig, (): UserConfig => {
	return {
		build: {
			ssr: true,
			ssrManifest: true,
			rollupOptions: {
				input: ['@qwik-city-plan'],
			},
		},
		plugins: [
			staticAdapter({
				origin: 'https://demosjarco.dev',
			}),
		],
	};
});
