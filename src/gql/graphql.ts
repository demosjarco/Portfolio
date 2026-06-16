/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type EventsQueryVariables = Exact<{
	zone_id: string;
	limit: ReturnType<typeof parseInt>;
	start: `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`;
	not_in?: Array<string> | string | null | undefined;
}>;

export type EventsQuery = { viewer: { zones: Array<{ firewallEventsAdaptive: Array<{ action: string; clientIPClass: string; clientRequestPath: string; datetime: `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`; description: string; ja3Hash: string; leakedCredentialCheckResult: string; matchIndex: ReturnType<typeof parseInt>; rayName: string; ruleId: string; rulesetId: string; source: string; userAgent: string; verifiedBotCategory: string; wafAttackScoreClass: string; wafSqliAttackScore: ReturnType<typeof parseInt>; wafXssAttackScore: ReturnType<typeof parseInt>; wafRceAttackScore: ReturnType<typeof parseInt>; wafPathTraversalAttackScore: ReturnType<typeof parseInt> }> }> } | null };

export const EventsDocument = {
	kind: 'Document',
	definitions: [
		{
			kind: 'OperationDefinition',
			operation: 'query',
			name: { kind: 'Name', value: 'events' },
			variableDefinitions: [
				{ kind: 'VariableDefinition', variable: { kind: 'Variable', name: { kind: 'Name', value: 'zone_id' } }, type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'string' } } } },
				{ kind: 'VariableDefinition', variable: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } }, type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'uint64' } } } },
				{ kind: 'VariableDefinition', variable: { kind: 'Variable', name: { kind: 'Name', value: 'start' } }, type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'Time' } } } },
				{ kind: 'VariableDefinition', variable: { kind: 'Variable', name: { kind: 'Name', value: 'not_in' } }, type: { kind: 'ListType', type: { kind: 'NonNullType', type: { kind: 'NamedType', name: { kind: 'Name', value: 'string' } } } } },
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
									name: { kind: 'Name', value: 'zones' },
									arguments: [{ kind: 'Argument', name: { kind: 'Name', value: 'filter' }, value: { kind: 'ObjectValue', fields: [{ kind: 'ObjectField', name: { kind: 'Name', value: 'zoneTag' }, value: { kind: 'Variable', name: { kind: 'Name', value: 'zone_id' } } }] } }],
									selectionSet: {
										kind: 'SelectionSet',
										selections: [
											{
												kind: 'Field',
												name: { kind: 'Name', value: 'firewallEventsAdaptive' },
												arguments: [
													{ kind: 'Argument', name: { kind: 'Name', value: 'limit' }, value: { kind: 'Variable', name: { kind: 'Name', value: 'limit' } } },
													{
														kind: 'Argument',
														name: { kind: 'Name', value: 'filter' },
														value: {
															kind: 'ObjectValue',
															fields: [
																{ kind: 'ObjectField', name: { kind: 'Name', value: 'datetime_geq' }, value: { kind: 'Variable', name: { kind: 'Name', value: 'start' } } },
																{ kind: 'ObjectField', name: { kind: 'Name', value: 'action_notin' }, value: { kind: 'Variable', name: { kind: 'Name', value: 'not_in' } } },
															],
														},
													},
													{ kind: 'Argument', name: { kind: 'Name', value: 'orderBy' }, value: { kind: 'ListValue', values: [{ kind: 'EnumValue', value: 'datetime_DESC' }] } },
												],
												selectionSet: {
													kind: 'SelectionSet',
													selections: [
														{ kind: 'Field', name: { kind: 'Name', value: 'action' } },
														{ kind: 'Field', name: { kind: 'Name', value: 'clientIPClass' } },
														{ kind: 'Field', name: { kind: 'Name', value: 'clientRequestPath' } },
														{ kind: 'Field', name: { kind: 'Name', value: 'datetime' } },
														{ kind: 'Field', name: { kind: 'Name', value: 'description' } },
														{ kind: 'Field', name: { kind: 'Name', value: 'ja3Hash' } },
														{ kind: 'Field', name: { kind: 'Name', value: 'leakedCredentialCheckResult' } },
														{ kind: 'Field', name: { kind: 'Name', value: 'matchIndex' } },
														{ kind: 'Field', name: { kind: 'Name', value: 'rayName' } },
														{ kind: 'Field', name: { kind: 'Name', value: 'ruleId' } },
														{ kind: 'Field', name: { kind: 'Name', value: 'rulesetId' } },
														{ kind: 'Field', name: { kind: 'Name', value: 'source' } },
														{ kind: 'Field', name: { kind: 'Name', value: 'userAgent' } },
														{ kind: 'Field', name: { kind: 'Name', value: 'verifiedBotCategory' } },
														{ kind: 'Field', name: { kind: 'Name', value: 'wafAttackScoreClass' } },
														{ kind: 'Field', name: { kind: 'Name', value: 'wafSqliAttackScore' } },
														{ kind: 'Field', name: { kind: 'Name', value: 'wafXssAttackScore' } },
														{ kind: 'Field', name: { kind: 'Name', value: 'wafRceAttackScore' } },
														{ kind: 'Field', name: { kind: 'Name', value: 'wafPathTraversalAttackScore' } },
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
			},
		},
	],
} as unknown as DocumentNode<EventsQuery, EventsQueryVariables>;
