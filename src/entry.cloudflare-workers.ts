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
			await next();
		});

		// Security
		app.use('*', (c, next) =>
			import('hono/cors').then(({ cors }) =>
				cors({
					origin: [
						'https://demosjarco.dev', // prod
						'http://localhost:5173', // qwik dev server
					],
					maxAge: 300,
				})(c, next),
			),
		);

		// Performance
		app.use('*', (c, next) => import('hono/etag').then(({ etag }) => etag()(c, next)));

		// Debug
		app.use('*', (c, next) => import('hono/timing').then(({ timing }) => timing()(c, next)));

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
