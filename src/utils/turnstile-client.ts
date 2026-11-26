import type { TurnstileObject } from 'turnstile-types';

/**
 * `window.turnstile` is typed as always-present by `turnstile-types`, but the script loads asynchronously, so read it through this accessor that admits `undefined` until it's ready.
 */
export function turnstileApi(): TurnstileObject | undefined {
	return (window as Window & { turnstile?: TurnstileObject }).turnstile;
}

/** Resolve once `window.turnstile` is available (or give up after ~10s). */
export function waitForTurnstile(): Promise<TurnstileObject | undefined> {
	return new Promise((resolve) => {
		const ready = turnstileApi();
		if (ready) {
			resolve(ready);
			return;
		}
		let tries = 0;
		const iv = setInterval(() => {
			const ts = turnstileApi();
			if (ts) {
				clearInterval(iv);
				resolve(ts);
			} else if (++tries > 100) {
				clearInterval(iv);
				resolve(undefined);
			}
		}, 100);
	});
}
