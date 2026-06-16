import type { EnvVars } from '~/types';

export default {
	scheduled: async (controller, env, ctx) => {
		switch (controller.cron) {
			// Update cf data
			case '*/5 * * * *': {
				const { operation, data, error } = await import('@urql/core')
					.then(
						({ Client, cacheExchange, fetchExchange }) =>
							new Client({
								url: new URL('client/v4/graphql', 'https://api.cloudflare.com').toString(),
								preferGetMethod: false,
								exchanges: [cacheExchange, fetchExchange],
								fetchOptions: {
									headers: {
										Authorization: `Bearer ${env.CF_API_TOKEN}`,
									},
								},
							}),
					)
					.then((gqlClient) =>
						import('./gql/index.ts').then(({ graphql }) =>
							gqlClient
								.query(
									graphql(`
										query events($zone_id: string!, $limit: uint64!, $start: Time!) {
											viewer {
												zones(filter: { zoneTag: $zone_id }) {
													firewallEventsAdaptive(limit: $limit, filter: { datetime_geq: $start, action_notin: ["skip", "log"] }, orderBy: [datetime_DESC]) {
														rayName
														action
														source
														ruleId
														rulesetId
														clientIPClass
														clientCountryName
														clientRequestPath
														datetime
														matchIndex
													}
												}
											}
										}
									`),
									{
										zone_id: env.CF_ZONE_ID,
										// Max limit by Cloudflare is 10k
										limit: 10000,
										start: new Date('2026-06-01T00:00:00.000Z').toISOString() as `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`,
									},
								)
								.toPromise(),
						),
					);

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
