export interface EnvVars extends Secrets, Omit<Cloudflare.Env, ''>, TypedBindings {}

interface Secrets {}

interface TypedBindings {}

interface PagesEnvironmentvariables {
	CF_PAGES: '0' | '1';
	CF_PAGES_COMMIT_SHA: string;
	CF_PAGES_BRANCH: string;
	CF_PAGES_URL: string;
}
