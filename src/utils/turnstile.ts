import type { TurnstileRequest, TurnstileResponse } from '~/types';

/**
 * Validate a Turnstile token against Cloudflare's siteverify endpoint.
 * Returns `true` only when the challenge solved successfully.
 */
export async function verifyTurnstile(token: string, secret: string, remoteip?: string): Promise<boolean> {
	try {
		const res = await fetch(new URL('https://challenges.cloudflare.com/turnstile/v0/siteverify'), {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				secret,
				response: token,
				remoteip,
			} satisfies TurnstileRequest),
		});
		if (!res.ok) return false;
		const outcome = await res.json<TurnstileResponse>();
		return outcome.success;
	} catch {
		return false;
	}
}
