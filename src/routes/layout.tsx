import { component$, Slot, useContextProvider, useSignal, useStore } from '@builder.io/qwik';
import { type DocumentHead, type RequestHandler, routeLoader$ } from '@builder.io/qwik-city';
import { IconStateContext, PowerStateContext, TurnstileSiteKeyContext, WallpaperContext, WindowManagerContext } from '~/contexts';
import { defaultIconState, defaultState, defaultWindowManagerState } from '~/contexts/signals';

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

/**
 * Dummy keys:
 * 1x00000000000000000000AA - test key to always pass (visible)
 * 1x00000000000000000000BB - test key to always pass (invisible)
 * 3x00000000000000000000FF - test key to always force interactive challenge
 */
export const useTurnstileSiteKey = routeLoader$(({ env }) => env.get('TURNSTILE_SITE_KEY')!);

export default component$(() => {
	// Setup contexts
	useContextProvider(WallpaperContext, useSignal());
	useContextProvider(IconStateContext, useSignal(defaultIconState));
	useContextProvider(PowerStateContext, useSignal(defaultState));
	// Desktop Window Manager store (running windows, focus, z-index)
	useContextProvider(WindowManagerContext, useStore(structuredClone(defaultWindowManagerState), { deep: true }));
	// SSG-hardcoded Turnstile site key for the messenger room creator
	useContextProvider(TurnstileSiteKeyContext, useTurnstileSiteKey());

	// UI
	return <Slot />;
});
