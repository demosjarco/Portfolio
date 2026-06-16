import { OpenAPIHono } from '@hono/zod-openapi';
import type { oas30, oas31 } from 'openapi3-ts';
import mse from '~/api-routes/mse/index.js';
import type { ContextVariables, EnvVars } from '~/types';

const app = new OpenAPIHono<{ Bindings: EnvVars; Variables: ContextVariables }>();

const title = 'DemosJarco Portfolio API';
const description = 'todo';
const contact: oas30.ContactObject | oas31.ContactObject = { name: 'GitHub Issues', url: 'https://github.com/demosjarco/Portfolio/issues' };
const license: oas30.LicenseObject | oas31.LicenseObject = { name: 'MIT', url: 'https://opensource.org/license/apache-2.0' };

app.doc31('/generate/openapi31', (c) => ({
	openapi: '3.1.0',
	info: {
		title,
		description,
		contact,
		license,
		version: 'main',
	},
}));
app.doc('/generate/openapi', (c) => ({
	openapi: '3.0.0',
	info: {
		title,
		description,
		contact,
		license,
		version: 'main',
	},
}));
app.doc('/generate/dns.cf-apig.openapi', (c) => ({
	openapi: '3.0.0',
	info: {
		title,
		description,
		contact,
		license,
		version: 'main',
	},
	servers: [
		{
			url: 'https://demosjarco.dev',
		},
	],
}));

app.route('/api/mse', mse);

export default app;
