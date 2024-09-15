import { component$, Slot, useContextProvider, useSignal } from '@builder.io/qwik';
import type { DocumentHead, RequestHandler } from '@builder.io/qwik-city';
import { IconStateContext, PowerStateContext } from '../contexts';
import { defaultIconState, defaultState } from '../contexts/signals';

export const head: DocumentHead = {
	title: 'TODO',
	meta: [
		{
			name: 'description',
			content: 'TODO',
		},
	],
};

/**
 * @link https://qwik.dev/docs/middleware/#locale
 */
export const onRequest: RequestHandler = async ({ locale, request }) => {
	const acceptLanguage = request.headers.get('accept-language');
	const [languages] = acceptLanguage?.split(';') || ['?', '?'];
	const [preferredLanguage] = languages!.split(',');
	locale(preferredLanguage);
};

export const onGet: RequestHandler = async ({ cacheControl }) => {
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
	/**
	 * @todo apps
	 */
	/**
	 * @todo next app id
	 */
	/**
	 * @todo next z index
	 */
	useContextProvider(IconStateContext, useSignal(defaultIconState));
	/**
	 * @todo selecting
	 */
	useContextProvider(PowerStateContext, useSignal(defaultState));

	// UI
	return <Slot />;
});
