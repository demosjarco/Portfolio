import { sql, type SQL } from 'drizzle-orm/sql';
import { index, primaryKey, snakeCase } from 'drizzle-orm/sqlite-core';
import type { MSEStatus } from './types';

export const waf_events = snakeCase.table(
	'waf_events',
	(we) => ({
		ray_id: we.blob({ mode: 'buffer' }).notNull(),
		rule_id: we.blob({ mode: 'buffer' }).notNull(),
		// If the same rule appears in the same chain
		match_index: we.integer({ mode: 'number' }).notNull(),
		// `datetime` from gql
		b_time: we.integer({ mode: 'timestamp_ms' }).notNull(),
		// MSE style threat name
		threat_name: we.text({ mode: 'text' }).notNull(),
		description: we.text({ mode: 'text' }).notNull(),
		ja3: we.blob({ mode: 'buffer' }),
		status: we.integer({ mode: 'number' }).notNull().$type<MSEStatus>(),
	}),
	(we) => [
		// Dedup guard
		primaryKey({ columns: [we.rule_id, we.match_index, we.ray_id] }),
		// For cursor pagination
		index('events_ray_id').on(we.ray_id),
		// For `ORDER BY` calls
		index('events_b_time').on(we.b_time),
		// For threat name grouping
		index('events_threat_name').on(we.threat_name),
	],
);

export const chatrooms = snakeCase.table(
	'chatrooms',
	(c) => ({
		// Durable Object id
		do_id: c.blob({ mode: 'buffer' }).primaryKey().notNull(),
		/**
		 * @deprecated DO NOT USE (Only for debuging)
		 */
		do_id_hex: c.text().generatedAlwaysAs((): SQL => sql`lower(hex(${chatrooms.do_id}))`, { mode: 'virtual' }),
		// Display name of the chatroom
		name: c.text({ mode: 'text' }).notNull(),
		// Creation time (linux `b_time` terminology), epoch ms
		b_time: c.integer({ mode: 'timestamp_ms' }).notNull(),
	}),
	(c) => [
		// For searching by name
		index('chatrooms_name').on(c.name),
		// For `ORDER BY` calls
		index('chatrooms_b_time').on(c.b_time),
	],
);
