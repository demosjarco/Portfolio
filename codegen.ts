import type { CodegenConfig } from '@graphql-codegen/cli';

const { CICD_CF_API_TOKEN } = process.env;

export default {
	schema: {
		[new URL('client/v4/graphql', 'https://api.cloudflare.com').toString()]: {
			headers: {
				Authorization: `Bearer ${CICD_CF_API_TOKEN}`,
			},
		},
	},
	documents: ['wf/*.ts'],
	emitLegacyCommonJSImports: false,
	generates: {
		'./src/gql/': {
			preset: 'client',
			config: {
				scalars: {
					Int: 'ReturnType<typeof parseInt>',
					Float: 'ReturnType<typeof parseFloat>',
					Date: '`${number}-${number}-${number}`',
					Time: '`${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`',
					bool: 'boolean',
					bytes: 'ReturnType<typeof parseInt>[]',
					float32: 'ReturnType<typeof parseFloat>',
					float64: 'ReturnType<typeof parseFloat>',
					int8: 'ReturnType<typeof parseInt>',
					int16: 'ReturnType<typeof parseInt>',
					int32: 'ReturnType<typeof parseInt>',
					int64: 'ReturnType<typeof parseInt>',
					string: 'string',
					uint8: 'ReturnType<typeof parseInt>',
					uint16: 'ReturnType<typeof parseInt>',
					uint32: 'ReturnType<typeof parseInt>',
					uint64: 'ReturnType<typeof parseInt>',
				},
				useTypeImports: true,
				dedupeFragments: true,
			},
			plugins: [],
		},
	},
} satisfies CodegenConfig;
