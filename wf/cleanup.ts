import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { drizzle } from 'drizzle-orm/d1';
import { lt } from 'drizzle-orm/sql';
import { DB_D1_ID, type EnvVars } from '~/types';
import { SQLCache } from '~/utils/sqlCache';
import * as schema from '~db/index.js';

export class Cleanup extends WorkflowEntrypoint<EnvVars> {
	override async run(event: Readonly<WorkflowEvent<unknown>>, step: WorkflowStep) {
		await Promise.allSettled([
			step.do('Delete old WAF events', () => {
				const db = drizzle(this.env.DB.withSession('first-unconstrained'), {
					schema,
					cache: new SQLCache({
						dbName: DB_D1_ID,
						dbType: 'd1',
						cacheTTL: parseInt(this.env.SQL_TTL, 10),
						strategy: 'explicit',
					}),
				});

				return db
					.delete(schema.waf_events)
					.where(
						lt(
							schema.waf_events.b_time,
							new Date(
								Date.now() -
									// days * hours * minutes * seconds * ms
									31 * 24 * 60 * 60 * 1000,
							),
						),
					)
					.then((result) => {
						if (result.success) {
							// eslint-disable-next-line @typescript-eslint/no-unsafe-return
							return JSON.parse(JSON.stringify(result));
						} else {
							// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
							throw (result.error as unknown) instanceof Error ? result.error : new Error(result.error ?? 'Unknown error inserting locations into database');
						}
					});
			}),
		]);
	}
}
