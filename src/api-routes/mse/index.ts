import { zValidator } from '@hono/zod-validator';
import { count, desc, lt, sql } from 'drizzle-orm/sql';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { Buffer } from 'node:buffer';
import * as zm from 'zod/mini';
import type { ContextVariables, EnvVars } from '~/types';
import * as mseSchema from '~db/mse/index.js';

const app = new Hono<{ Bindings: EnvVars; Variables: ContextVariables }>();
const defaultChunkSize = 500 as const;

app.get(
	'/',
	zValidator(
		'query',
		zm.object({
			firstChunkSize: zm._default(zm.coerce.number().check(zm.int(), zm.positive()), defaultChunkSize),
		}),
	),
	(c) => {
		const validated = c.req.valid('query');

		return streamSSE(c, async (stream) => {
			let lastRayId: Buffer | string | undefined;

			// Single upfront count; subtract after each batch to avoid a second query per loop
			const [countRow] = await c.var.db_mse.select({ count: count() }).from(mseSchema.events);
			let remaining = countRow?.count ?? 0;

			while (remaining > 0 && !stream.aborted && !stream.closed) {
				const rows = await c.var.db_mse
					.select()
					.from(mseSchema.events)
					.where(lastRayId ? lt(mseSchema.events.ray_id, sql`unhex(${typeof lastRayId === 'string' ? lastRayId : lastRayId.toString('hex')})`) : undefined)
					.limit(lastRayId ? defaultChunkSize : validated.firstChunkSize)
					.orderBy(desc(mseSchema.events.b_time));

				for (const row of rows) {
					await stream.writeSSE({
						id: Buffer.concat([
							row.rule_id,
							// Convert `match_index` to hex, then to Buffer to get real binary representation
							Buffer.from(row.match_index.toString(16).padStart(Math.ceil(row.match_index.toString(16).length / 2) * 2, '0'), 'hex'),
							row.ray_id,
						]).toString('base64url'),
						retry: 100,
						data: JSON.stringify({
							b_time: row.b_time.toISOString(),
							threat_name: row.threat_name,
							description: row.description,
							ja3: row.ja3?.toString('hex'),
							status: row.status,
						}),
					});
				}

				if (rows.length > 0) lastRayId = rows[rows.length - 1]!.ray_id;
				remaining -= rows.length;
			}

			// `EventSource` doesn't have `onclose` or similar, so termination of connection is assumed to be error. Send good close message to allow clean exit on client side.
			await stream.writeSSE({ event: 'done', data: c.var.db_mseSession.getBookmark() ?? '' });
			await stream.close();
		});
	},
);

export default app;
