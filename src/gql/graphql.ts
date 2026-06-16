/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type SpentQueryVariables = Exact<{
	account_id: string;
	start: `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`;
	end: `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`;
	gateways: Array<string> | string;
	dataspaces: Array<string> | string;
}>;

export type SpentQuery = { viewer: { accounts: Array<{ aiGatewayRequestsAdaptiveGroups: Array<{ sum: { cost: ReturnType<typeof parseFloat> } | null }> }> } | null };

export const SpentDocument = {
	kind: 'Document',
	definitions: [
		{
			kind: 'OperationDefinition',
			operation: 'query',
			name: { kind: 'Name', value: 'spent' },
			variableDefinitions: [
				{ kind: 'VariableDefinition', variable: { kind: 'Variable', name: { kind: 'Name', value: 'account_id' } }, type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'string' } } } },
				{ kind: 'VariableDefinition', variable: { kind: 'Variable', name: { kind: 'Name', value: 'start' } }, type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Time' } } } },
				{ kind: 'VariableDefinition', variable: { kind: 'Variable', name: { kind: 'Name', value: 'end' } }, type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Time' } } } },
				{ kind: 'VariableDefinition', variable: { kind: 'Variable', name: { kind: 'Name', value: 'gateways' } }, type: { kind: 'NonNullType', type: { kind: 'ListType', type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'string' } } } } } },
				{ kind: 'VariableDefinition', variable: { kind: 'Variable', name: { kind: 'Name', value: 'dataspaces' } }, type: { kind: 'NonNullType', type: { kind: 'ListType', type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'string' } } } } } },
			],
			selectionSet: {
				kind: 'SelectionSet',
				selections: [
					{
						kind: 'Field',
						name: { kind: 'Name', value: 'viewer' },
						selectionSet: {
							kind: 'SelectionSet',
							selections: [
								{
									kind: 'Field',
									name: { kind: 'Name', value: 'accounts' },
									arguments: [{ kind: 'Argument', name: { kind: 'Name', value: 'filter' }, value: { kind: 'ObjectValue', fields: [{ kind: 'ObjectField', name: { kind: 'Name', value: 'accountTag' }, value: { kind: 'Variable', name: { kind: 'Name', value: 'account_id' } } }] } }],
									selectionSet: {
										kind: 'SelectionSet',
										selections: [
											{
												kind: 'Field',
												name: { kind: 'Name', value: 'aiGatewayRequestsAdaptiveGroups' },
												arguments: [
													{ kind: 'Argument', name: { kind: 'Name', value: 'limit' }, value: { kind: 'IntValue', value: '10000' } },
													{
														kind: 'Argument',
														name: { kind: 'Name', value: 'filter' },
														value: {
															kind: 'ObjectValue',
															fields: [
																{ kind: 'ObjectField', name: { kind: 'Name', value: 'gateway_in' }, value: { kind: 'Variable', name: { kind: 'Name', value: 'gateways' } } },
																{ kind: 'ObjectField', name: { kind: 'Name', value: 'metadataValues_hasany' }, value: { kind: 'Variable', name: { kind: 'Name', value: 'dataspaces' } } },
																{ kind: 'ObjectField', name: { kind: 'Name', value: 'datetimeHour_geq' }, value: { kind: 'Variable', name: { kind: 'Name', value: 'start' } } },
																{ kind: 'ObjectField', name: { kind: 'Name', value: 'datetimeHour_leq' }, value: { kind: 'Variable', name: { kind: 'Name', value: 'end' } } },
															],
														},
													},
												],
												selectionSet: { kind: 'SelectionSet', selections: [{ kind: 'Field', name: { kind: 'Name', value: 'sum' }, selectionSet: { kind: 'SelectionSet', selections: [{ kind: 'Field', name: { kind: 'Name', value: 'cost' } }] } }] },
											},
										],
									},
								},
							],
						},
					},
				],
			},
		},
	],
} as unknown as DocumentNode<SpentQuery, SpentQueryVariables>;
