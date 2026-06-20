import { drizzle } from 'drizzle-orm/d1';
import { Hono } from 'hono';
import { contextStorage } from 'hono/context-storage';
import { cors } from 'hono/cors';
import { timing } from 'hono/timing';
import baseApp from '~/api-routes/index.js';
import { DB_MSE_D1_ID, type ContextVariables, type EnvVars } from '~/types';
import { SQLCache } from '~/utils/sqlCache';
import * as mseSchema from '~db/mse/index.js';

// Re-export Workflows since workerd can only find from from `wrangler.jsonc`'s `main` file
export { Cleanup } from '~wf/cleanup.js';
export { UpdateWaf } from '~wf/updateWaf.js';

const app = new Hono<{ Bindings: EnvVars; Variables: ContextVariables }>();

// Variable Setup
app.use('*', contextStorage());
app.use('*', async (c, next) => {
	const cacheControl = new Set((c.req.header('Cache-Control')?.split(',') ?? []).map((directive) => directive.trim().toLowerCase()));
	// RFC 7234: no-store forbids storing; no-cache/zero max-age require revalidation so we skip reads
	const antiCacheHeader = cacheControl.has('no-store') || cacheControl.has('no-cache') || cacheControl.has('max-age=0');
	c.set('browserCachePolicy', !antiCacheHeader);

	c.set('db_mseSession', c.env.DB_MSE.withSession(c.req.header('X-D1-Bookmark') ?? 'first-unconstrained'));

	c.set(
		'db_mse',
		drizzle(c.var.db_mseSession, {
			schema: mseSchema,
			cache: new SQLCache({
				dbName: DB_MSE_D1_ID,
				dbType: 'd1',
				cacheTTL: parseInt(c.env.SQL_TTL, 10),
				strategy: c.var.browserCachePolicy ? 'all' : 'explicit',
			}),
		}),
	);

	await next();

	const d1bookmark = c.var.db_mseSession.getBookmark();
	if (d1bookmark) c.header('X-D1-Bookmark', d1bookmark);
});

// Security
app.use('*', cors({ origin: 'https://demosjarco.dev', maxAge: 300 }));

// Debug
app.use('*', timing());

app.route('/', baseApp);

export default app;
