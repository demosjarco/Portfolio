export interface EnvVars extends Bindings, Secrets, Partial<PagesEnvironmentvariables>, Record<string, any> {
	NODE_ENV: 'production' | 'development';
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Secrets {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface Bindings {}

interface PagesEnvironmentvariables {
	CF_PAGES: '0' | '1';
	CF_PAGES_COMMIT_SHA: string;
	CF_PAGES_BRANCH: string;
	CF_PAGES_URL: string;
}
