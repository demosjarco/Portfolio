import type { EnvVars } from '~/types';

export default {
	scheduled: (controller, env, ctx) => {
		switch (controller.cron) {
			// Update cf data
			case '*/5 * * * *': {
				break;
			}
			// Cleanup
			case '0 * * * *': {
				break;
			}
			default: {
				break;
			}
		}
	},
} satisfies ExportedHandler<EnvVars>;
