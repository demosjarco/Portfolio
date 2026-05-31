export interface EnvVars extends Secrets, Omit<Cloudflare.Env, ''>, TypedBindings {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Secrets {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface TypedBindings {}
