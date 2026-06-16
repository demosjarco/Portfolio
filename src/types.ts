import type { DrizzleD1Database } from 'drizzle-orm/d1';
import type { TimingVariables } from 'hono/timing';
import type * as mseSchema from '~db/mse/index.js';

export interface EnvVars extends Secrets, Omit<Cloudflare.Env, ''>, TypedBindings {
	GIT_HASH?: string;
	CF_ZONE_ID: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Secrets {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface TypedBindings {}

export const DB_MSE_D1_ID = '59912d5a-9a3f-472d-89a7-9309f7f45f4f' as const;

export interface ContextVariables extends TimingVariables {
	browserCachePolicy: boolean;
	db_mseSession: D1DatabaseSession;
	db_mse: DrizzleD1Database<typeof mseSchema>;
}
