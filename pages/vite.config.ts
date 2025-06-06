import { qwikCity } from '@builder.io/qwik-city/vite';
import { qwikVite } from '@builder.io/qwik/optimizer';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import type { EnvVars } from './src/types';

// https://developers.cloudflare.com/workers/runtime-apis/nodejs
const cloudflareNodeRuntimes: `node:${string}`[] = ['node:assert', 'node:async_hooks', 'node:buffer', 'node:crypto', 'node:diagnostics_channel', 'node:events', 'node:path', 'node:process', 'node:stream', 'node:string_decoder', 'node:test', 'node:util'];
const cloudflareRuntimes: `cloudflare:${string}`[] = ['cloudflare:email'];

export default defineConfig(() => {
	return {
		plugins: [
			tailwindcss(),
			qwikCity(),
			qwikVite(),
			tsconfigPaths(),
			nodeResolve({
				browser: true,
				modulesOnly: true,
				preferBuiltins: true,
			}),
		],
		server: {
			headers: {
				// Don't cache the server response in dev mode
				'Cache-Control': 'public, max-age=0',
			},
		},
		preview: {
			headers: {
				// Do cache the server response in preview (non-adapter production build)
				'Cache-Control': 'public, max-age=600',
			},
		},
		build: {
			target: 'esnext',
			sourcemap: (process.env as EnvVars).NODE_ENV !== 'production',
			emptyOutDir: true,
			rollupOptions: {
				external: [...cloudflareNodeRuntimes, ...cloudflareRuntimes],
			},
			manifest: true,
		},
		worker: {
			rollupOptions: {
				external: [...cloudflareNodeRuntimes, ...cloudflareRuntimes],
			},
		},
		ssr: {
			external: [...cloudflareNodeRuntimes, ...cloudflareRuntimes],
		},
		// This tells Vite which dependencies to pre-build in dev mode.
		optimizeDeps: {
			// Put problematic deps that break bundling here, mostly those with binaries.
			// For example ['better-sqlite3'] if you use that in server functions.
			exclude: [...cloudflareNodeRuntimes, ...cloudflareRuntimes],
		},
	};
});
