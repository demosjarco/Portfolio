import { cloudflarePagesAdapter } from '@builder.io/qwik-city/adapters/cloudflare-pages/vite';
import { extendConfig } from '@builder.io/qwik-city/vite';
import type { UserConfig } from 'vite';
import baseConfig from '../../vite.config';

export default extendConfig(baseConfig, (): UserConfig => {
	return {
		build: {
			ssr: true,
			ssrManifest: true,
			rollupOptions: {
				input: ['src/entry.cloudflare-pages.tsx', '@qwik-city-plan'],
			},
		},
		plugins: [cloudflarePagesAdapter()],
	};
});
