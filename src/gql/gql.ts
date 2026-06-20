/* eslint-disable */
import * as types from './graphql.js';
import type { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
	'\n\t\t\t\t\t\tquery events($zone_id: string!, $limit: uint64!, $start: Time!, $not_in: [string!]) {\n\t\t\t\t\t\t\tviewer {\n\t\t\t\t\t\t\t\tzones(filter: { zoneTag: $zone_id }) {\n\t\t\t\t\t\t\t\t\tfirewallEventsAdaptive(limit: $limit, filter: { datetime_geq: $start, action_notin: $not_in }, orderBy: [datetime_ASC]) {\n\t\t\t\t\t\t\t\t\t\taction\n\t\t\t\t\t\t\t\t\t\tclientIPClass\n\t\t\t\t\t\t\t\t\t\tclientRequestPath\n\t\t\t\t\t\t\t\t\t\tdatetime\n\t\t\t\t\t\t\t\t\t\tdescription\n\t\t\t\t\t\t\t\t\t\tja3Hash\n\t\t\t\t\t\t\t\t\t\tleakedCredentialCheckResult\n\t\t\t\t\t\t\t\t\t\tmatchIndex\n\t\t\t\t\t\t\t\t\t\trayName\n\t\t\t\t\t\t\t\t\t\truleId\n\t\t\t\t\t\t\t\t\t\trulesetId\n\t\t\t\t\t\t\t\t\t\tsource\n\t\t\t\t\t\t\t\t\t\tuserAgent\n\t\t\t\t\t\t\t\t\t\tverifiedBotCategory\n\t\t\t\t\t\t\t\t\t\twafAttackScoreClass\n\t\t\t\t\t\t\t\t\t\twafSqliAttackScore\n\t\t\t\t\t\t\t\t\t\twafXssAttackScore\n\t\t\t\t\t\t\t\t\t\twafRceAttackScore\n\t\t\t\t\t\t\t\t\t\twafPathTraversalAttackScore\n\t\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t': typeof types.EventsDocument;
};
const documents: Documents = {
	'\n\t\t\t\t\t\tquery events($zone_id: string!, $limit: uint64!, $start: Time!, $not_in: [string!]) {\n\t\t\t\t\t\t\tviewer {\n\t\t\t\t\t\t\t\tzones(filter: { zoneTag: $zone_id }) {\n\t\t\t\t\t\t\t\t\tfirewallEventsAdaptive(limit: $limit, filter: { datetime_geq: $start, action_notin: $not_in }, orderBy: [datetime_ASC]) {\n\t\t\t\t\t\t\t\t\t\taction\n\t\t\t\t\t\t\t\t\t\tclientIPClass\n\t\t\t\t\t\t\t\t\t\tclientRequestPath\n\t\t\t\t\t\t\t\t\t\tdatetime\n\t\t\t\t\t\t\t\t\t\tdescription\n\t\t\t\t\t\t\t\t\t\tja3Hash\n\t\t\t\t\t\t\t\t\t\tleakedCredentialCheckResult\n\t\t\t\t\t\t\t\t\t\tmatchIndex\n\t\t\t\t\t\t\t\t\t\trayName\n\t\t\t\t\t\t\t\t\t\truleId\n\t\t\t\t\t\t\t\t\t\trulesetId\n\t\t\t\t\t\t\t\t\t\tsource\n\t\t\t\t\t\t\t\t\t\tuserAgent\n\t\t\t\t\t\t\t\t\t\tverifiedBotCategory\n\t\t\t\t\t\t\t\t\t\twafAttackScoreClass\n\t\t\t\t\t\t\t\t\t\twafSqliAttackScore\n\t\t\t\t\t\t\t\t\t\twafXssAttackScore\n\t\t\t\t\t\t\t\t\t\twafRceAttackScore\n\t\t\t\t\t\t\t\t\t\twafPathTraversalAttackScore\n\t\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t': types.EventsDocument,
};

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = graphql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function graphql(source: string): unknown;

/**
 * The graphql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function graphql(source: '\n\t\t\t\t\t\tquery events($zone_id: string!, $limit: uint64!, $start: Time!, $not_in: [string!]) {\n\t\t\t\t\t\t\tviewer {\n\t\t\t\t\t\t\t\tzones(filter: { zoneTag: $zone_id }) {\n\t\t\t\t\t\t\t\t\tfirewallEventsAdaptive(limit: $limit, filter: { datetime_geq: $start, action_notin: $not_in }, orderBy: [datetime_ASC]) {\n\t\t\t\t\t\t\t\t\t\taction\n\t\t\t\t\t\t\t\t\t\tclientIPClass\n\t\t\t\t\t\t\t\t\t\tclientRequestPath\n\t\t\t\t\t\t\t\t\t\tdatetime\n\t\t\t\t\t\t\t\t\t\tdescription\n\t\t\t\t\t\t\t\t\t\tja3Hash\n\t\t\t\t\t\t\t\t\t\tleakedCredentialCheckResult\n\t\t\t\t\t\t\t\t\t\tmatchIndex\n\t\t\t\t\t\t\t\t\t\trayName\n\t\t\t\t\t\t\t\t\t\truleId\n\t\t\t\t\t\t\t\t\t\trulesetId\n\t\t\t\t\t\t\t\t\t\tsource\n\t\t\t\t\t\t\t\t\t\tuserAgent\n\t\t\t\t\t\t\t\t\t\tverifiedBotCategory\n\t\t\t\t\t\t\t\t\t\twafAttackScoreClass\n\t\t\t\t\t\t\t\t\t\twafSqliAttackScore\n\t\t\t\t\t\t\t\t\t\twafXssAttackScore\n\t\t\t\t\t\t\t\t\t\twafRceAttackScore\n\t\t\t\t\t\t\t\t\t\twafPathTraversalAttackScore\n\t\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t'): (typeof documents)['\n\t\t\t\t\t\tquery events($zone_id: string!, $limit: uint64!, $start: Time!, $not_in: [string!]) {\n\t\t\t\t\t\t\tviewer {\n\t\t\t\t\t\t\t\tzones(filter: { zoneTag: $zone_id }) {\n\t\t\t\t\t\t\t\t\tfirewallEventsAdaptive(limit: $limit, filter: { datetime_geq: $start, action_notin: $not_in }, orderBy: [datetime_ASC]) {\n\t\t\t\t\t\t\t\t\t\taction\n\t\t\t\t\t\t\t\t\t\tclientIPClass\n\t\t\t\t\t\t\t\t\t\tclientRequestPath\n\t\t\t\t\t\t\t\t\t\tdatetime\n\t\t\t\t\t\t\t\t\t\tdescription\n\t\t\t\t\t\t\t\t\t\tja3Hash\n\t\t\t\t\t\t\t\t\t\tleakedCredentialCheckResult\n\t\t\t\t\t\t\t\t\t\tmatchIndex\n\t\t\t\t\t\t\t\t\t\trayName\n\t\t\t\t\t\t\t\t\t\truleId\n\t\t\t\t\t\t\t\t\t\trulesetId\n\t\t\t\t\t\t\t\t\t\tsource\n\t\t\t\t\t\t\t\t\t\tuserAgent\n\t\t\t\t\t\t\t\t\t\tverifiedBotCategory\n\t\t\t\t\t\t\t\t\t\twafAttackScoreClass\n\t\t\t\t\t\t\t\t\t\twafSqliAttackScore\n\t\t\t\t\t\t\t\t\t\twafXssAttackScore\n\t\t\t\t\t\t\t\t\t\twafRceAttackScore\n\t\t\t\t\t\t\t\t\t\twafPathTraversalAttackScore\n\t\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t\t}\n\t\t\t\t\t\t\t}\n\t\t\t\t\t\t}\n\t\t\t\t\t'];

export function graphql(source: string) {
	return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<infer TType, any> ? TType : never;
