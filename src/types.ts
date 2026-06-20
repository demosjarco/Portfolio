import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { TimingVariables } from 'hono/timing';
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
