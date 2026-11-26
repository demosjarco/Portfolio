import { Hono } from 'hono';
import messenger from '~/api-routes/messenger/index.js';
import mse from '~/api-routes/mse/index.js';
import powershell from '~/api-routes/powershell/index.js';
import type { ContextVariables, EnvVars } from '~/types';

const app = new Hono<{ Bindings: EnvVars; Variables: ContextVariables }>();

app.route('/api/messenger', messenger);
app.route('/api/mse', mse);
app.route('/api/powershell', powershell);

export default app;
