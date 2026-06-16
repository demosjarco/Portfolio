import { drizzle } from 'drizzle-orm/d1';
import { DefaultLogger } from 'drizzle-orm/logger';
import { lt } from 'drizzle-orm/sql';
import { DB_MSE_D1_ID, type EnvVars } from '~/types';
import { SQLCache } from '~/utils/sqlCache';
import { DebugLogWriter } from '~db/mse/extras';
import * as mseSchema from '~db/mse/index.js';

export async function scheduled<Props = unknown>(controller: ScheduledController, env: EnvVars, ctx: ExecutionContext<Props>): Promise<void | Promise<void>> {
	await Promise.allSettled([
		(async () => {
			const db_mse = drizzle(env.DB_MSE.withSession('first-unconstrained'), {
				logger: new DefaultLogger({ writer: new DebugLogWriter() }),
				schema: mseSchema,
				cache: new SQLCache({
					dbName: DB_MSE_D1_ID,
					dbType: 'd1',
					cacheTTL: parseInt(env.SQL_TTL, 10),
					strategy: 'explicit',
				}),
			});

			await db_mse.delete(mseSchema.events).where(
				lt(
					mseSchema.events.b_time,
					new Date(
						Date.now() -
							// days * hours * minutes * seconds * ms
							31 * 24 * 60 * 60 * 1000,
					),
				),
			);
		})(),
	]);
}
