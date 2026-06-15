import { index, primaryKey, snakeCase } from 'drizzle-orm/sqlite-core';
import type { MSEStatus } from './types';

export const events = snakeCase.table(
	'events',
	(e) => ({
		ray_id: e.blob({ mode: 'buffer' }).notNull(),
		rule_id: e.blob({ mode: 'buffer' }).notNull(),
		// If the same rule appears in the same chain
		match_index: e.integer({ mode: 'number' }).notNull(),
		// `datetime` from gql
		b_time: e.integer({ mode: 'timestamp_ms' }).notNull(),
		// MSE style threat name
		threat_name: e.text({ mode: 'text' }).notNull(),
		status: e.integer({ mode: 'number' }).notNull().$type<MSEStatus>(),
	}),
	(e) => [
		// Dedup guard
		primaryKey({ columns: [e.rule_id, e.match_index, e.ray_id] }),
		// For cursor pagination
		index('events_ray_id').on(e.ray_id),
		// For `ORDER BY` calls
		index('events_b_time').on(e.b_time),
		// For threat name grouping
		index('events_threat_name').on(e.threat_name),
	],
);
