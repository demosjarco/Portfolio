import { Hono } from 'hono';
import mse from '~/api-routes/mse/index.js';
import type { ContextVariables, EnvVars } from '~/types';

const app = new Hono<{ Bindings: EnvVars; Variables: ContextVariables }>();

app.route('/api/mse', mse);

export default app;
