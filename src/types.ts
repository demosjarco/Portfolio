export interface EnvVars extends Omit<Cloudflare.Env, ''>, TypedBindings {
	GIT_HASH?: string;
	CF_ZONE_ID: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface TypedBindings {}
