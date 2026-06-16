import type { ContextVariables, EnvVars } from '~/types';

export default {
	fetch: async (request, env, ctx) => {
		const app = await import('hono').then(({ Hono }) => new Hono<{ Bindings: EnvVars; Variables: ContextVariables }>());

		// Variable Setup
		app.use('*', (c, next) =>
			import('hono/context-storage').then(({ contextStorage }) =>
				contextStorage()(
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					c,
					next,
				),
			),
		);
		app.use('*', async (c, next) => {
			const cacheControl = new Set((c.req.header('Cache-Control')?.split(',') ?? []).map((directive) => directive.trim().toLowerCase()));
			// RFC 7234: no-store forbids storing; no-cache/zero max-age require revalidation so we skip reads
			const antiCacheHeader = cacheControl.has('no-store') || cacheControl.has('no-cache') || cacheControl.has('max-age=0');
			c.set('browserCachePolicy', !antiCacheHeader);

			c.set('db_mseSession', c.env.DB_MSE.withSession(c.req.header('X-D1-Bookmark') ?? 'first-unconstrained'));

			c.set(
				'db_mse',
				await import('drizzle-orm/d1').then(async ({ drizzle }) =>
					drizzle(c.var.db_mseSession, {
						schema: await import('~db/mse/index.js'),
						logger: await import('drizzle-orm/logger').then(async ({ DefaultLogger }) => new DefaultLogger({ writer: await import('~db/mse/extras').then(({ DebugLogWriter }) => new DebugLogWriter()) })),
						cache: await import('~/utils/sqlCache').then(
							async ({ SQLCache }) =>
								new SQLCache({
									dbName: await import('~/types.js').then(({ DB_MSE_D1_ID }) => DB_MSE_D1_ID),
									dbType: 'd1',
									cacheTTL: parseInt(env.SQL_TTL, 10),
									strategy: c.var.browserCachePolicy ? 'all' : 'explicit',
								}),
						),
					}),
				),
			);

			await next();

			const d1bookmark = c.var.db_mseSession.getBookmark();
			if (d1bookmark) c.header('X-D1-Bookmark', d1bookmark);
		});

		// Security
		app.use('*', (c, next) =>
			import('hono/cors').then(({ cors }) =>
				cors({
					origin: 'https://demosjarco.dev',
					maxAge: 300,
				})(
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					c,
					next,
				),
			),
		);

		// Debug
		app.use('*', (c, next) =>
			import('hono/timing').then(({ timing }) =>
				timing()(
					// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					c,
					next,
				),
			),
		);

		await import('~/api-routes/index.js').then(({ default: baseApp }) => app.route('/', baseApp));

		return app.fetch(request, env, ctx);
	},
	scheduled: async (controller, env, ctx) => {
		switch (controller.cron) {
			// Update cf data
			case '*/5 * * * *': {
				await import('~/scheduled/update.js').then(({ scheduled }) => scheduled(controller, env, ctx));
				break;
			}
			// Cleanup
			case '0 * * * *': {
				await import('~/scheduled/cleanup.js').then(({ scheduled }) => scheduled(controller, env, ctx));
				break;
			}
			default: {
				break;
			}
		}
	},
} satisfies ExportedHandler<EnvVars>;
