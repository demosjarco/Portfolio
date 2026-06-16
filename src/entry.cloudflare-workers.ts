import type { EnvVars } from '~/types';

export default {
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
