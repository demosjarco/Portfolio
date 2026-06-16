import type { TimingVariables } from 'hono/timing';

export interface EnvVars extends Secrets, Omit<Cloudflare.Env, ''>, TypedBindings {
	GIT_HASH?: string;
	CF_ZONE_ID: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Secrets {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface TypedBindings {}

export const DB_MSE_D1_ID = '59912d5a-9a3f-472d-89a7-9309f7f45f4f' as const;

export interface ContextVariables extends TimingVariables {}
