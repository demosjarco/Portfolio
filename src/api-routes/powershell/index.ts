import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import * as zm from 'zod/mini';
import type { ContextVariables, EnvVars } from '~/types';
import { verifyTurnstile } from '~/utils/turnstile';
import { bytesToHex, sandboxIdSchema, type CreatedSandbox } from '~/WinXp/apps/PowerShell/types';

const app = new Hono<{ Bindings: EnvVars; Variables: ContextVariables }>();

/** Raw length of a sandbox id. It's the Durable Object's name, so it has to be unguessable: it is the only credential for the sandbox. */
const SANDBOX_ID_BYTES = 32 as const;

/** Worker Previews don't support Durable Object-managed containers, so the binding doesn't exist there. */
app.use('*', async (c, next) => {
	if (!('POWERSHELL' in c.env) || !('POWERSHELL_LIMITER' in c.env)) return c.json({ error: 'PowerShell is not available in this environment' }, 503);
	return next();
});

/** Create a sandbox. Gated by Turnstile, then limited to one per IP per minute. Windows inside a sandbox are unlimited (up to the per-sandbox cap) and need neither. */
app.post(
	'/sandbox',
	zValidator(
		'json',
		zm.object({
			turnstile: zm.string().check(zm.minLength(1), zm.maxLength(2048)),
		}),
	),
	async (c) => {
		const ip = c.req.header('CF-Connecting-IP');

		// Turnstile first, so a failed challenge doesn't burn the caller's one sandbox per minute.
		const human = await verifyTurnstile(c.req.valid('json').turnstile, c.env.TURNSTILE_SECRET_KEY, ip);
		if (!human) return c.json({ error: 'Turnstile verification failed' }, 403);

		const { success } = await c.env.POWERSHELL_LIMITER.limit({ key: ip ?? 'unknown' });
		if (!success) return c.json({ error: 'Only one PowerShell sandbox can be created per minute. Try again shortly.' }, 429);

		const id = bytesToHex(crypto.getRandomValues(new Uint8Array(SANDBOX_ID_BYTES)));
		await c.env.POWERSHELL.getByName(id).init();

		return c.json({ id } satisfies CreatedSandbox, 201);
	},
);

/** The sandbox's single WebSocket. Forwarded into its Durable Object, which closes with 4404 if the sandbox doesn't exist (anymore). */
app.get(
	'/sandbox/:id/ws',
	zValidator(
		'param',
		zm.object({
			id: sandboxIdSchema,
		}),
	),
	async (c) => {
		if (c.req.header('Upgrade')?.toLowerCase() !== 'websocket') return c.text('Expected websocket', 426);

		const upgrade = await c.env.POWERSHELL.getByName(c.req.valid('param').id).fetch(c.req.raw);
		// Responses from a stub have immutable headers, and the global timing() middleware appends Server-Timing to every response.
		return new Response(null, { status: upgrade.status, statusText: upgrade.statusText, headers: new Headers(upgrade.headers), webSocket: upgrade.webSocket });
	},
);

export default app;
