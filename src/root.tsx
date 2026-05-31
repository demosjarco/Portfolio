import { component$, useComputed$, useServerData, useVisibleTask$ } from '@builder.io/qwik';
import { QwikCityProvider, RouterOutlet, ServiceWorkerRegister, useLocation } from '@builder.io/qwik-city';
import { initFlowbite } from 'flowbite';
import { RouterHead } from './components/router-head/router-head';

import './global.css';

export default component$(() => {
	const nonce = useServerData<string | undefined>('nonce');

	useVisibleTask$(() => {
		initFlowbite();
	});

	return (
		<QwikCityProvider>
			<head>
				<meta charSet="utf-8" />
				<link rel="manifest" href="/manifest.json" />
				<RouterHead />
			</head>
			<body lang="en">
				<RouterOutlet />
				<ServiceWorkerRegister nonce={nonce} />
				<PagesOnlyLoading />
			</body>
		</QwikCityProvider>
	);
});

const PagesOnlyLoading = component$(() => {
	const loc = useLocation();
	const isLive = useComputed$(() => loc.url.hostname.endsWith('demosjarco.dev'));

	if (!isLive.value) {
		return <script src="https://demosjarco.dev/cdn-cgi/zaraz/i.js" referrerPolicy="origin"></script>;
	}
	return undefined;
});
