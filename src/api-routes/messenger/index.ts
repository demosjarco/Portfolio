import { zValidator } from '@hono/zod-validator';
import { and, desc, eq, like, lt, sql } from 'drizzle-orm/sql';
import { Hono } from 'hono';
import * as z4 from 'zod/v4';
import type { ContextVariables, EnvVars } from '~/types';
import { verifyTurnstile } from '~/utils/turnstile';
import * as schema from '~db/index.js';

const app = new Hono<{ Bindings: EnvVars; Variables: ContextVariables }>();

/** List chatrooms (optionally filtered by name), newest first, cursor-paged. */
app.get(
	'/rooms',
	zValidator(
		'query',
		z4.object({
			search: z4
				.string()
				.trim()
				.min(3)
				.regex(/^[^%+]/)
				.optional(),
			limit: z4.coerce.number().int().positive().lte(100).default(50),
			// Cursor is the last seen Durable Object id (always 64-char hex).
			cursor: z4.hex().trim().length(64).optional(),
		}),
	),
	async (c) => {
		const { search, limit, cursor } = c.req.valid('query');

		// Look the cursor row up with a native drizzle subquery (not raw SQL).
		const cursorRow = cursor
			? c.var.db
					.select({ b_time: schema.chatrooms.b_time, do_id: schema.chatrooms.do_id })
					.from(schema.chatrooms)
					.where(eq(schema.chatrooms.do_id, sql`unhex(${cursor})`))
			: undefined;

		// Page by (b_time, do_id) so ties on the timestamp still advance.
		const rows = await c.var.db
			.select({ do_id: schema.chatrooms.do_id, name: schema.chatrooms.name, b_time: schema.chatrooms.b_time })
			.from(schema.chatrooms)
			.where(
				and(
					search ? like(schema.chatrooms.name, `${search}%`) : undefined,
					// cursorRow ? lt(sql`(${schema.chatrooms.b_time}, ${schema.chatrooms.do_id})`, sql`(${cursorRow})`) : undefined,
					cursorRow ? lt(sql`(${schema.chatrooms.b_time}, ${schema.chatrooms.do_id})`, cursorRow) : undefined,
				),
			)
			.orderBy(desc(schema.chatrooms.b_time), desc(schema.chatrooms.do_id))
			.limit(limit);

		const items = rows.map((row) => ({
			id: row.do_id.toString('hex'),
			name: row.name,
			b_time: row.b_time.getTime(),
		}));

		return c.json({
			rooms: items,
			// Only hand back a cursor when a full page suggests there may be more.
			nextCursor: items.length === limit ? (items.at(-1)?.id ?? null) : null,
		});
	},
);

/** Create a new chatroom. Returns the new room's id. */
app.post(
	'/rooms',
	zValidator(
		'json',
		z4.object({
			name: z4
				.string()
				.trim()
				.min(3)
				.regex(/^[^%+]/),
			// Turnstile token proving the creator is human.
			turnstile: z4.string().min(1),
		}),
	),
	async (c) => {
		const { name, turnstile } = c.req.valid('json');

		// Reject before doing any work if the human check fails.
		const human = await verifyTurnstile(turnstile, c.env.TURNSTILE_SECRET_KEY, c.req.header('CF-Connecting-IP'));
		if (!human) return c.json({ error: 'Turnstile verification failed' }, 403);

		const id = c.env.CHATROOM.newUniqueId();
		const hexId = id.toString();
		const stub = c.env.CHATROOM.get(id);
		await stub.init(name);

		const b_time = new Date();
		await c.var.db.insert(schema.chatrooms).values({
			// drizzle mis-serializes a raw Buffer on write, so go through unhex()
			do_id: sql`unhex(${hexId})`,
			name,
			b_time,
		});

		return c.json({ id: hexId, name, b_time: b_time.getTime() }, 201);
	},
);

/** Live socket count for a room - used by the directory's lazy per-row loader. */
app.get(
	'/rooms/:id/count',
	zValidator(
		'param',
		z4.object({
			id: z4.hex().length(64),
		}),
	),
	async (c) => {
		const hexId = c.req.param('id');
		try {
			const stub = c.env.CHATROOM.get(c.env.CHATROOM.idFromString(hexId));
			return c.json({ count: await stub.socketCount });
		} catch {
			return c.json({ error: 'Invalid room id' }, 400);
		}
	},
);

/** WebSocket upgrade - forwarded straight into the room's Durable Object. */
app.get(
	'/rooms/:id/ws',
	zValidator(
		'param',
		z4.object({
			id: z4.hex().length(64),
		}),
	),
	async (c) => {
		if (c.req.header('Upgrade')?.toLowerCase() !== 'websocket') return c.text('Expected websocket', 426);

		const hexId = c.req.param('id');
		let stub;
		try {
			stub = c.env.CHATROOM.get(c.env.CHATROOM.idFromString(hexId));
		} catch {
			return c.text('Invalid room id', 400);
		}

		const upgrade = await stub.fetch(c.req.raw);
		// Responses from a stub have immutable headers, and the global timing() middleware appends Server-Timing to every response.
		return new Response(null, { status: upgrade.status, statusText: upgrade.statusText, headers: new Headers(upgrade.headers), webSocket: upgrade.webSocket });
	},
);

export default app;
