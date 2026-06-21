/**
 * Local user profile + endpoint helpers for Windows Messenger.
 *
 * The profile is the same in every room the user joins. Only two things are
 * configurable: an optional display name and an optional Gravatar **hash**
 * (derived from an email that is *never* stored).
 */

export interface MessengerProfile {
	/** Optional friendly name shown next to messages. */
	displayName?: string;
	/** SHA-256 hex of the trimmed/lowercased email. The email itself is dropped. */
	gravatarHash?: string;
}

const STORAGE_KEY = 'msmsgs.profile';

/**
 * REST + WebSocket origins. Hardcoded to live; swap to the commented-out
 * localhost pair when developing locally (Hono worker on :8787, Vite UI on
 * :5173).
 */
export const apiBase = 'https://demosjarco.dev';
export const wsBase = 'wss://demosjarco.dev';
// export const apiBase = 'http://localhost:8787';
// export const wsBase = 'ws://localhost:8787';

/** Read the saved profile (empty object if none / unavailable). */
export function loadProfile(): MessengerProfile {
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? (JSON.parse(raw) as MessengerProfile) : {};
	} catch {
		return {};
	}
}

/** Persist the profile. */
export function saveProfile(profile: MessengerProfile): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
	} catch {
		/* storage unavailable - non-fatal */
	}
}

/**
 * Compute the Gravatar hash for an email. Modern Gravatar uses the lowercase,
 * trimmed email hashed with SHA-256 (hex). Returns `undefined` for empty input
 * so callers can clear the avatar.
 */
export async function gravatarHash(email: string): Promise<string | undefined> {
	const normalized = email.trim().toLowerCase();
	if (!normalized) return undefined;
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(normalized));
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Build a Gravatar image URL from a hash. Falls back to an identicon. */
export function gravatarUrl(hash: string, size = 32, rating: 'g' | 'pg' | 'r' | 'x' = 'pg', defaultIcon: 'initials' | 'color' | 'mp' | 'identicon' | 'monsterid' | 'wavatar' | 'retro' | 'robohash' | 'blank' = 'identicon'): string {
	const gravatarImage = new URL(['avatar', hash].join('/'), 'https://gravatar.com');
	gravatarImage.searchParams.set('r', rating);
	gravatarImage.searchParams.set('d', defaultIcon);
	gravatarImage.searchParams.set('s', size.toString());

	return gravatarImage.href;
}
