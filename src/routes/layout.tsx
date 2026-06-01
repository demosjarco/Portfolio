import { component$, Slot, useContextProvider, useSignal, useStore } from '@builder.io/qwik';
import type { DocumentHead, RequestHandler } from '@builder.io/qwik-city';
import { IconStateContext, PowerStateContext, WallpaperContext, WindowManagerContext } from '../contexts';
import { defaultIconState, defaultState, defaultWindowManagerState } from '../contexts/signals';

export const head: DocumentHead = {
	title: 'DemosJarco Portfolio',
	meta: [
		{
			name: 'description',
			content: 'This portfolio runs on Internet Explorer 6, the best browser in the world!',
		},
	],
};

/**
 * @link https://qwik.dev/docs/middleware/#locale
 */
export const onRequest: RequestHandler = ({ locale, request }) => {
	const acceptLanguage = request.headers.get('accept-language');
	const [languages] = acceptLanguage?.split(';') ?? ['?', '?'];
	const [preferredLanguage] = languages!.split(',');
	locale(preferredLanguage);
};

export const onGet: RequestHandler = ({ cacheControl }) => {
	// Control caching for this request for best performance and to reduce hosting costs:
	// https://qwik.dev/docs/caching/
	cacheControl({
		// Always serve a cached response by default, up to a week stale
		staleWhileRevalidate: 60 * 60 * 24 * 7,
		// Max once every 5 seconds, revalidate on the server to get a fresh version of this page
		maxAge: 5,
	});
};

export default component$(() => {
	// Setup contexts
	useContextProvider(WallpaperContext, useSignal());
	useContextProvider(IconStateContext, useSignal(defaultIconState));
	useContextProvider(PowerStateContext, useSignal(defaultState));
	// Desktop Window Manager store (running windows, focus, z-index)
	useContextProvider(WindowManagerContext, useStore(structuredClone(defaultWindowManagerState), { deep: true }));

	// UI
	return <Slot />;
});
