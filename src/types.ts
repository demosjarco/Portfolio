import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { TimingVariables } from 'hono/timing';
import type { UUID } from 'node:crypto';
import type * as schema from '~db/index.js';

export interface EnvVars extends Secrets, Omit<Cloudflare.Env, ''>, TypedBindings {
	GIT_HASH?: string;
	CF_ZONE_ID: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Secrets {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface TypedBindings {}

export const DB_D1_ID = '68d59ff7-c521-4e4e-97e5-07df08d185ec' as const;

export interface ContextVariables extends TimingVariables {
	browserCachePolicy: boolean;
	dbSession: D1DatabaseSession;
	db: DrizzleD1Database<typeof schema>;
}

/**
 * @link https://developers.cloudflare.com/turnstile/get-started/server-side-validation/#accepted-parameters
 */
export interface TurnstileRequest {
	secret: string;
	response: string;
	remoteip?: string;
	idempotency_key?: UUID;
}

/**
 * @link https://developers.cloudflare.com/turnstile/get-started/server-side-validation/#accepted-parameters
 */
export interface TurnstileResponse {
	success: boolean;
	/**
	 * the ISO timestamp for the time the challenge was solved
	 */
	challenge_ts: ReturnType<Date['toISOString']>;
	/**
	 * the hostname for which the challenge was served
	 */
	hostname: URL['hostname'];
	/**
	 * the customer widget identifier passed to the widget on the client side. This is used to differentiate widgets using the same sitekey in analytics. Its integrity is protected by modifications from an attacker. It is recommended to validate that the action matches an expected value
	 */
	action: string;
	/**
	 * the customer data passed to the widget on the client side. This can be used by the customer to convey state. It is integrity protected by modifications from an attacker
	 */
	cdata: string;
	/**
	 * a list of errors that occurred
	 */
	'error-codes': string[];
}
