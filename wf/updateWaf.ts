import { cacheExchange, Client, fetchExchange } from '@urql/core';
import { Cloudflare } from 'cloudflare';
import type { RulesetGetResponse } from 'cloudflare/resources/rulesets/rulesets.mjs';
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers';
import { NonRetryableError } from 'cloudflare:workflows';
import { drizzle } from 'drizzle-orm/d1';
import { sql } from 'drizzle-orm/sql';
import { createHash } from 'node:crypto';
import * as zm from 'zod/mini';
import type { EventsQuery } from '~/gql/graphql';
import { graphql } from '~/gql/index.js';
import { DB_MSE_D1_ID, type EnvVars } from '~/types';
import { SQLCache } from '~/utils/sqlCache';
import * as mseSchema from '~db/mse/index.js';
import { MSEStatus } from '~db/mse/types';

const updateWafParams = zm.object({
	/**
	 * @link https://developers.cloudflare.com/firewall/cf-firewall-rules/actions/#supported-actions
	 */
	not_in: zm._default(zm.array(zm.enum(['skip', 'log', 'bypass', 'allow', 'challenge', 'managed_challenge', 'js_challenge', 'block'])).check(zm.minLength(1)), ['skip', 'log']),
});

export class UpdateWaf extends WorkflowEntrypoint<EnvVars, zm.input<typeof updateWafParams>> {
	override async run(event: Readonly<WorkflowEvent<zm.input<typeof updateWafParams>>>, step: WorkflowStep) {
		const parsedPayload = await step.do('zod parse payload', () =>
			updateWafParams.safeParseAsync(typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload).then((result) => {
				if (result.success) {
					return result.data;
				} else {
					throw new NonRetryableError(`${result.error.message}: ${zm.prettifyError(result.error)}`);
				}
			}),
		);

		const db_mse = drizzle(this.env.DB_MSE.withSession('first-unconstrained'), {
			schema: mseSchema,
			cache: new SQLCache({
				dbName: DB_MSE_D1_ID,
				dbType: 'd1',
				cacheTTL: parseInt(this.env.SQL_TTL, 10),
				strategy: 'explicit',
			}),
		});

		const maxTime = await step.do('Get newest saved event', async () => {
			const [row] = await db_mse
				.select({
					maxTime: sql<number | null>`max(${mseSchema.events.b_time})`,
				})
				.from(mseSchema.events);

			return row?.maxTime ?? 0;
		});

		const gqlClient = new Client({
			url: new URL('client/v4/graphql', 'https://api.cloudflare.com').toString(),
			preferGetMethod: false,
			exchanges: [cacheExchange, fetchExchange],
			fetchOptions: {
				headers: {
					Authorization: `Bearer ${this.env.CF_API_TOKEN}`,
				},
			},
		});
		const maxOldest = new Date(
			Date.now() -
				// days * hours * minutes * seconds * ms
				31 * 24 * 60 * 60 * 1000 +
				// Account for duration from now until api server received request (seconds * ms)
				5 * 1000,
		);

		const eventsBody = await step.do('Fetch events', { sensitive: 'output' }, async () => {
			const { data, error } = await gqlClient
				.query(
					graphql(`
						query events($zone_id: string!, $limit: uint64!, $start: Time!, $not_in: [string!]) {
							viewer {
								zones(filter: { zoneTag: $zone_id }) {
									firewallEventsAdaptive(limit: $limit, filter: { datetime_geq: $start, action_notin: $not_in }, orderBy: [datetime_ASC]) {
										action
										clientIPClass
										clientRequestPath
										datetime
										description
										ja3Hash
										leakedCredentialCheckResult
										matchIndex
										rayName
										ruleId
										rulesetId
										source
										userAgent
										verifiedBotCategory
										wafAttackScoreClass
										wafSqliAttackScore
										wafXssAttackScore
										wafRceAttackScore
										wafPathTraversalAttackScore
									}
								}
							}
						}
					`),
					{
						zone_id: this.env.CF_ZONE_ID,
						// Max limit by Cloudflare is 10k
						limit: 10000,
						// Newest saved entry, or last 31 days (CF plan limit) if none / older
						start: (maxTime > maxOldest.getTime() ? new Date(maxTime) : maxOldest).toISOString() as `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`,
						not_in: parsedPayload.not_in,
					},
				)
				.toPromise();

			if (data) {
				return new Response(JSON.stringify(data.viewer?.zones[0]?.firewallEventsAdaptive ?? [])).body!;
			} else {
				throw error;
			}
		});
		const events = await new Response(eventsBody).json<Exclude<EventsQuery['viewer'], null>['zones'][number]['firewallEventsAdaptive']>();

		// Get ruleset data from CF
		const uniqueRulesets = new Set(events.map((event) => event.rulesetId).filter((id) => id.trim() !== ''));
		const cf = new Cloudflare({
			apiToken: this.env.CF_API_TOKEN,
			fetch: async (url, init) => {
				if (init?.method === 'GET') {
					const cache = caches.default;

					// Clean headers
					const cacheHeaders = new Headers(init.headers);
					cacheHeaders.delete('Authorization');

					const cacheKey = new Request(url, {
						...init,
						headers: cacheHeaders,
					});

					// Find the cache key in the cache
					let response = await cache.match(cacheKey);

					if (!response) {
						response = await fetch(url, init);

						if (response.ok) {
							const [eBody, cBody] = response.clone().body!.tee();

							// Clean and cache headers
							const mutableHeaders = new Headers(response.headers);
							mutableHeaders.delete('Set-Cookie');
							if (!mutableHeaders.has('ETag')) {
								mutableHeaders.set(
									'ETag',
									await (async () => {
										const hash = createHash('sha512');

										async function* streamAsyncIterable(stream: ReadableStream<Uint8Array>) {
											const reader = stream.getReader();
											try {
												// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
												while (true) {
													const { done, value } = await reader.read();
													if (done) return;
													yield value;
												}
											} finally {
												reader.releaseLock();
											}
										}

										for await (const chunk of streamAsyncIterable(eBody)) {
											hash.update(chunk);
										}
										return `"${hash.digest('hex')}"`;
									})(),
								);
							}
							if (!mutableHeaders.has('Cache-Control')) mutableHeaders.set('Cache-Control', ['public', `max-age=${5 * 60}`, `s-maxage=${5 * 60}`].join(', '));

							// Save it with the first body copy
							this.ctx.waitUntil(cache.put(cacheKey, new Response(cBody, { ...response, headers: mutableHeaders })));
						}
					}

					return response;
				} else {
					return fetch(url, init);
				}
			},
		});
		const rulesets = await Array.from(uniqueRulesets).reduce(
			async (accPromise, rulesetId) => {
				const acc = await accPromise;
				// Must `async () => await` the promise because `APIPromise` is a lazy promise
				// @ts-expect-error - Object is Serializable just fine. TS is tripping over `unknown`
				acc[rulesetId] = await step.do(`Get ruleset ${rulesetId}`, { sensitive: 'output' }, async () => await cf.rulesets.get(rulesetId, { zone_id: this.env.CF_ZONE_ID }));
				return acc;
			},
			Promise.resolve({} as Record<string, RulesetGetResponse>),
		);

		const generator = new MseThreatNameGenerator(rulesets);
		const hexCheck = zm.hex();
		await step.do('Insert events into database', async () =>
			db_mse
				.batch([
					// Batch types needs at least 1 guaranteed query, so we do the first insert separately and then `map()` the rest
					(() => {
						const event = events[0]!;
						const { mseThreatName, mseStatus } = generator.generate(event);

						return db_mse
							.insert(mseSchema.events)
							.values({
								ray_id: sql`unhex(${event.rayName})`,
								rule_id: sql`unhex(${hexCheck.safeParse(event.ruleId).success ? event.ruleId : Buffer.from(event.ruleId, 'utf8').toString('hex')})`,
								match_index: event.matchIndex,
								b_time: new Date(event.datetime),
								threat_name: mseThreatName,
								description: event.description,
								...(event.ja3Hash.trim() !== '' && { ja3: sql`unhex(${event.ja3Hash})` }),
								status: mseStatus,
							})
							.onConflictDoNothing();
					})(),
					...events.slice(1).map((event) => {
						const { mseThreatName, mseStatus } = generator.generate(event);

						return db_mse
							.insert(mseSchema.events)
							.values({
								ray_id: sql`unhex(${event.rayName})`,
								rule_id: sql`unhex(${hexCheck.safeParse(event.ruleId).success ? event.ruleId : Buffer.from(event.ruleId, 'utf8').toString('hex')})`,
								match_index: event.matchIndex,
								b_time: new Date(event.datetime),
								threat_name: mseThreatName,
								description: event.description,
								...(event.ja3Hash.trim() !== '' && { ja3: sql`unhex(${event.ja3Hash})` }),
								status: mseStatus,
							})
							.onConflictDoNothing();
					}),
				])
				.then((results) => ({
					averageMeta: {
						changes: results.reduce((sum, result) => sum + result.meta.changes, 0) / results.length,
						duration: results.reduce((sum, result) => sum + result.meta.duration, 0) / results.length,
						rows_read: results.reduce((sum, result) => sum + result.meta.rows_read, 0) / results.length,
						rows_written: results.reduce((sum, result) => sum + result.meta.rows_written, 0) / results.length,
						timings: { sql_duration_ms: results.reduce((sum, result) => sum + (result.meta.timings?.sql_duration_ms ?? 0), 0) / results.length },
						total_attempts: results.reduce((sum, result) => sum + (result.meta.total_attempts ?? 0), 0) / results.length,
					},
					cumulativeMeta: {
						changed_db: results.some((result) => result.meta.changed_db),
						size_after: results[results.length - 1]!.meta.size_after,
					},
					// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
					raw: JSON.parse(JSON.stringify(results)),
				})),
		);

		await step.do('Optimize database', () =>
			this.env.DB_MSE.withSession('first-unconstrained')
				.prepare('PRAGMA optimize')
				.run()
				.then((result) => {
					if (result.success) {
						// eslint-disable-next-line @typescript-eslint/no-unsafe-return
						return JSON.parse(JSON.stringify(result));
					} else {
						// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
						throw (result.error as unknown) instanceof Error ? result.error : new Error(result.error ?? 'Unknown error optimizing database');
					}
				}),
		);
	}
}

// --- Types --------------------------------------------------------------------

type FirewallEvent = Exclude<EventsQuery['viewer'], null>['zones'][0]['firewallEventsAdaptive'][0];

/** Catalog entry resolved from the ruleset API - only `categories` is still needed,
 *  since `description` now arrives on the event itself. */
interface ResolvedRule {
	categories: string[];
	phase: string; // http_request_firewall_managed | http_ratelimit | http_request_firewall_custom
	rulesetKind: string; // managed | custom | zone | root
}

// --- Tunables -----------------------------------------------------------------

/** WAF ML sub-scores AT OR BELOW this are a confident attack (lower = more malicious). */
const WAF_ML_ATTACK_THRESHOLD = 20;

/** leakedCredentialCheckResult values that mean "clean / no hit". */
const LEAKED_CRED_CLEAN_VALUES = new Set(['none', 'clean', '', 'no_record']);

// --- Category → MSE name tables -----------------------------------------------

const CATEGORY_SET_MAP = [
	{ required: ['wordpress', 'dos'], name: 'Exploit:CMS/WordPress.XMLRPC' },
	{ required: ['wordpress', 'file-inclusion'], name: 'Exploit:CMS/WordPress.FileInclusion' },
	{ required: ['drupal', 'header'], name: 'Exploit:CMS/Drupal.HeaderSpoof' },
	{ required: ['information-disclosure', 'version-control'], name: 'Probe:Web/SourceDisclosure.A' },
	{ required: ['user-agent', 'referer'], name: 'Tool:Recon/Scanner.Headless' },
	{ required: ['path', 'url'], name: 'Behavior:Web/PathTraversal.Encoded' },
] as const;

const SINGLE_CATEGORY_MAP = {
	xss: 'Exploit:Script/XSS.Reflected',
	'html-injection': 'Exploit:Web/HTMLInjection.A',
	sqli: 'Exploit:SQL/Injection.A',
	rce: 'Exploit:Web/CommandExec.A',
	'command-injection': 'Exploit:Web/CommandExec.A',
	'code-injection': 'Exploit:Web/CodeInjection.A',
	ssrf: 'Exploit:Web/SSRF.A',
	xxe: 'Exploit:Web/XXE.A',
	ssti: 'Exploit:Web/TemplateInjection.A',
	'parameter-pollution': 'Exploit:Web/ParamPollution.A',
	'broken-access-control': 'Exploit:Web/BrokenAccess.A',
	'file-inclusion': 'Behavior:Web/FileInclusion.A',
	traversal: 'Behavior:Web/PathTraversal.A',
	dos: 'Flood:Network/HTTP.DoS',
	'information-disclosure': 'Probe:Web/SensitiveFile.A',
	wordpress: 'Probe:CMS/WordPress.A',
	drupal: 'Exploit:CMS/Drupal.A',
	dotnetnuke: 'Exploit:CMS/DotNetNuke.A',
	plone: 'Tool:Probe/CMSScanner.Plone',
	'generic-system': 'Behavior:Web/FileInclusion.A',
	method: 'Behavior:Net/AnomalousMethod.A',
	port: 'Behavior:Net/NonStandardPort.A',
	body: 'Behavior:Net/LargeBody.A',
	accept: 'Behavior:Net/HTTPAnomaly.Accept',
	header: 'Behavior:Net/HTTPAnomaly.A',
	'user-agent': 'Behavior:Net/HTTPAnomaly.UserAgent',
} as const;

const SINGLE_CATEGORY_PRIORITY = ['xss', 'html-injection', 'sqli', 'rce', 'command-injection', 'code-injection', 'ssrf', 'xxe', 'ssti', 'parameter-pollution', 'broken-access-control', 'file-inclusion', 'traversal', 'dos', 'information-disclosure', 'wordpress', 'drupal', 'dotnetnuke', 'plone', 'generic-system', 'method', 'port', 'body', 'accept', 'user-agent', 'header'] as const;

const ATTACK_CATEGORIES = new Set(['xss', 'html-injection', 'sqli', 'rce', 'command-injection', 'code-injection', 'ssrf', 'xxe', 'ssti', 'parameter-pollution', 'broken-access-control'] as const);
type SetValue<T extends Set<unknown>> = T extends Set<infer V> ? V : never;

const FAKE_BOT_NAMES = [
	[/google/i, 'Google'],
	[/bing|msn/i, 'Bing'],
	[/baidu/i, 'Baidu'],
	[/yandex/i, 'Yandex'],
	[/facebook/i, 'Facebook'],
] as const;

const SCANNER_UA_PATTERNS = [
	[/nikto/i, 'Nikto'],
	[/sqlmap/i, 'SQLMap'],
	[/masscan/i, 'Masscan'],
	[/nmap/i, 'Nmap'],
	[/nessus/i, 'Nessus'],
	[/nuclei/i, 'Nuclei'],
	[/zgrab/i, 'ZGrab'],
	[/dirbuster/i, 'DirBuster'],
	[/gobuster/i, 'GoBuster'],
	[/wfuzz/i, 'WFuzz'],
	[/acunetix/i, 'Acunetix'],
	[/burpsuite/i, 'BurpSuite'],
] as const;

class MseThreatNameGenerator {
	private readonly ruleMap: Map<string, ResolvedRule>;

	constructor(rulesets: Record<string, RulesetGetResponse>) {
		this.ruleMap = this.buildRuleMap(rulesets);
	}

	generate(event: FirewallEvent) {
		return {
			mseThreatName: this.resolveThreatName(event),
			mseStatus: this.resolveStatus(event.action),
		};
	}

	// -- Rule map construction ---------------------------------------------------

	private buildRuleMap(rulesets: Record<string, RulesetGetResponse>) {
		const map = new Map<string, ResolvedRule>();

		for (const ruleset of Object.values(rulesets)) {
			for (const rule of ruleset.rules ?? []) {
				if (!rule.id) continue;
				const ruleWithCategories = rule;
				map.set(rule.id, {
					categories: ruleWithCategories.categories ?? [],
					phase: ruleset.phase,
					rulesetKind: ruleset.kind,
				});
			}
		}

		return map;
	}

	// -- Resolution waterfall ----------------------------------------------------

	private resolveThreatName(event: FirewallEvent) {
		const rule = this.ruleMap.get(event.ruleId);
		const categories = rule?.categories ?? [];

		// 0. Verified good bot tripped a rule - surface distinctly (caller may hide these)
		if (event.verifiedBotCategory) {
			return `Behavior:Net/VerifiedBot.${this.sanitizeLabel(event.verifiedBotCategory)}` as const;
		}

		// 1. Leaked-credential hit - highest-signal real attack
		if (this.isLeakedCredentialHit(event.leakedCredentialCheckResult)) {
			return 'Exploit:Web/CredentialStuffing.A' as const;
		}

		// 2. Bot Fight Mode - no description, ruleId === "bic"; classify by path
		if (event.source === 'bic') {
			return this.fromBotFight(event.clientRequestPath);
		}

		// 3. Rate-limit phase - always a flood. NOTE source is lowercase "ratelimit".
		if (event.source === 'ratelimit' || rule?.phase === 'http_ratelimit') {
			return this.fromRateLimit(event.description);
		}

		// 4. Custom rules - no categories; trust WAF ML sub-scores, then description, then path
		if (event.source === 'firewallCustom' || rule?.rulesetKind === 'custom') {
			return this.fromCustomRule(event);
		}

		// 5. CVE-tagged managed rules - most specific
		const cveName = this.fromCve(categories);
		if (cveName) return cveName;

		// 6. Fake-bot impersonation
		if (categories.includes('user-agent') && /fake/i.test(event.description)) {
			return this.fromFakeBot(event.description);
		}

		// 7. WAF ML sub-scores override vague anomaly rules (only if rule isn't already an attack tag)
		if (!this.hasAttackCategory(categories)) {
			const mlName = this.fromWafMlScores(event);
			if (mlName) return mlName;
		}

		// 8. Category-set, then single-category
		const categorySetName = this.fromCategorySet(categories);
		if (categorySetName) return categorySetName;

		const singleCategoryName = this.fromSingleCategory(categories);
		if (singleCategoryName) return singleCategoryName;

		// 9. Description heuristics (covers rules not in the catalog map yet)
		const descriptionName = this.fromDescription(event.description);
		if (descriptionName) return descriptionName;

		// 10. clientIPClass + UA
		const ipClassName = this.fromIpClass(event.clientIPClass, event.userAgent);
		if (ipClassName) return ipClassName;

		return this.fromFallback(event);
	}

	// -- Resolvers ---------------------------------------------------------------

	private fromCve(categories: string[]) {
		const cves = categories.filter((c) => c.startsWith('cve-'));
		if (!cves.length) return null;

		const cveId = cves[0]!.toUpperCase(); // e.g. CVE-2018-14774
		const cms = categories.find((c) => ['wordpress', 'drupal', 'joomla', 'plone', 'dotnetnuke'].includes(c));
		const prefix = cms ? (`Exploit:CMS/${this.capitalize(cms)}` as const) : ('Exploit:Web/CVE' as const);

		return `${prefix}.${cveId}` as const;
	}

	private fromFakeBot(description: string) {
		for (const [pattern, label] of FAKE_BOT_NAMES) {
			if (pattern.test(description)) return `Tool:Impersonation/FakeBot.${label}` as const;
		}
		return 'Tool:Impersonation/FakeBot.Generic' as const;
	}

	/** Lowest non-trivial WAF ML sub-score (most malicious) → typed attack name. */
	private fromWafMlScores(event: FirewallEvent) {
		const typed = [
			[event.wafSqliAttackScore, 'Exploit:SQL/Injection.A'],
			[event.wafXssAttackScore, 'Exploit:Script/XSS.Reflected'],
			[event.wafRceAttackScore, 'Exploit:Web/CommandExec.A'],
			[event.wafPathTraversalAttackScore, 'Behavior:Web/PathTraversal.A'],
		] as const;

		let best: { score: number; name: string } | null = null;
		for (const [score, name] of typed) {
			if (score <= WAF_ML_ATTACK_THRESHOLD && (!best || score < best.score)) {
				best = { score, name };
			}
		}
		if (best) return best.name;

		if (event.wafAttackScoreClass === 'attack') return 'Exploit:Web/Generic.A' as const;
		return null;
	}

	private fromCategorySet(categories: string[]) {
		const catSet = new Set(categories);
		for (const { required, name } of CATEGORY_SET_MAP) {
			if (required.every((r) => catSet.has(r))) return name;
		}
		return null;
	}

	private fromSingleCategory(categories: string[]) {
		const catSet = new Set(categories);
		for (const cat of SINGLE_CATEGORY_PRIORITY) {
			if (catSet.has(cat)) return SINGLE_CATEGORY_MAP[cat];
		}
		return null;
	}

	private fromDescription(description: string) {
		const desc = description.toLowerCase();

		if (/graphql.*introspect|introspect/i.test(desc)) return 'Probe:Web/GraphQLIntrospection.A' as const;
		if (/code.inject/i.test(desc)) return 'Exploit:Web/CodeInjection.A' as const;
		if (/xss|cross.site.script/i.test(desc)) return 'Exploit:Script/XSS.Reflected' as const;
		if (/sql.inject/i.test(desc)) return 'Exploit:SQL/Injection.A' as const;
		if (/command.inject|rce|remote.code/i.test(desc)) return 'Exploit:Web/CommandExec.A' as const;
		if (/path.travers|directory.travers/i.test(desc)) return 'Behavior:Web/PathTraversal.A' as const;
		if (/file.inclus|web-inf/i.test(desc)) return 'Behavior:Web/FileInclusion.A' as const;
		if (/xmlrpc/i.test(desc)) return 'Exploit:CMS/WordPress.XMLRPC' as const;
		if (/dotnetnuke/i.test(desc)) return 'Exploit:CMS/DotNetNuke.A' as const;
		if (/wp.config|wordpress.*config/i.test(desc)) return 'Probe:CMS/WordPress.Config' as const;
		if (/wordpress/i.test(desc)) return 'Probe:CMS/WordPress.A' as const;
		if (/plone/i.test(desc)) return 'Tool:Probe/CMSScanner.Plone' as const;
		if (/information.disclos|sensitive.file|common.files/i.test(desc)) return 'Probe:Web/SensitiveFile.A' as const;
		if (/version.control|\.git/i.test(desc)) return 'Probe:Web/SourceDisclosure.A' as const;
		if (/anomaly.*method|method.*anomaly|not get or post/i.test(desc)) return 'Behavior:Net/AnomalousMethod.A' as const;
		if (/anomaly.*port|non.standard.port/i.test(desc)) return 'Behavior:Net/NonStandardPort.A' as const;
		if (/anomaly.*body|body.*large/i.test(desc)) return 'Behavior:Net/LargeBody.A' as const;
		if (/anomaly.*accept|accept.*missing/i.test(desc)) return 'Behavior:Net/HTTPAnomaly.Accept' as const;
		if (/anomaly.*user.agent|user.agent.*missing/i.test(desc)) return 'Tool:Recon/Scanner.Headless' as const;
		if (/anomaly.*header|header.*anomaly/i.test(desc)) return 'Behavior:Net/HTTPAnomaly.A' as const;
		if (/anomaly.*url|multiple.slashes/i.test(desc)) return 'Behavior:Web/PathTraversal.Encoded' as const;
		if (/parameter.pollution|http.param/i.test(desc)) return 'Exploit:Web/ParamPollution.A' as const;
		if (/dos|denial.of.service/i.test(desc)) return 'Flood:Network/HTTP.DoS' as const;

		return null;
	}

	private fromRateLimit(description: string) {
		const desc = description.toLowerCase();
		if (/burst|rapid/i.test(desc)) return 'Flood:Network/HTTP.Burst' as const;
		if (/long|sustained|extended/i.test(desc)) return 'Flood:Network/HTTP.Sustained' as const;
		if (/suspicious/i.test(desc)) return 'Flood:Network/HTTP.SuspiciousBurst' as const;
		return 'Flood:Network/HTTP.RequestRate' as const;
	}

	private fromCustomRule(event: FirewallEvent) {
		const desc = event.description.toLowerCase();

		// A score-gate custom rule ("Block Bad Actors") fires on real attacks - let the
		// WAF ML sub-scores name the actual technique when they're confidently low.
		const mlName = this.fromWafMlScores(event);
		if (mlName) return mlName;

		if (/bad.actor|high.risk|score.le/i.test(desc)) return 'Behavior:Net/HighRiskScore.A' as const;
		if (/suspicious|score.gt/i.test(desc)) return 'Behavior:Net/SuspiciousScore.A' as const;
		if (/deny|fallthrough|default.deny/i.test(desc)) return 'Behavior:Web/APIPolicyViolation.A' as const;
		if (/api/i.test(desc)) return 'Behavior:Web/APIViolation.A' as const;
		if (/mtls|cert/i.test(desc)) return 'Behavior:Net/CertViolation.A' as const;

		return this.fromPath(event.clientRequestPath);
	}

	/** Bot Fight Mode - empty description, ruleId "bic". Classify by what's being probed. */
	private fromBotFight(path: string) {
		const named = this.fromPath(path);
		// fromPath returns the generic catch-all only when nothing matched; otherwise keep it
		return named === ('Behavior:Web/AnomalousRequest.A' as const) ? ('Tool:Recon/BotProbe.A' as const) : named;
	}

	private fromIpClass(ipClass: string, userAgent: string) {
		if (ipClass === 'securityScanner') return this.scannerNameFromUa(userAgent) ?? ('Tool:Recon/Scanner.Generic' as const);
		if (ipClass === 'tor') return 'Behavior:Net/TorEgress.A' as const;
		if (ipClass === 'badHost') return 'Behavior:Net/MaliciousHost.A' as const;
		return null;
	}

	private fromPath(path: string) {
		const p = path.toLowerCase();
		if (/\.(git|github|svn|hg)(\/|$)/i.test(p)) return 'Probe:Web/SourceDisclosure.A' as const;
		if (/\.env|credentials|secrets|\.aws|\.ssh|keys\.json|key\.json/i.test(p)) return 'Probe:Web/SensitiveFile.A' as const;
		if (/\.ya?ml|\.config|\.ini|nginx|\.conf/i.test(p)) return 'Probe:Web/ConfigDisclosure.A' as const;
		if (/wp-config|wp-login|xmlrpc/i.test(p)) return 'Probe:CMS/WordPress.A' as const;
		if (/admin|phpmyadmin|cpanel|webmin/i.test(p)) return 'Probe:Web/AdminPanel.A' as const;
		if (/phpinfo|debug|\.php$/i.test(p)) return 'Tool:Probe/CMSScanner.PHP' as const;
		if (/\.\.(\/|%2f|%5c)/i.test(p)) return 'Behavior:Web/PathTraversal.A' as const;
		if (/\.ds_store/i.test(p)) return 'Probe:Web/SensitiveFile.A' as const;
		return 'Behavior:Web/AnomalousRequest.A' as const;
	}

	private fromFallback(event: FirewallEvent) {
		return this.scannerNameFromUa(event.userAgent) ?? this.fromPath(event.clientRequestPath);
	}

	// -- Helpers -----------------------------------------------------------------

	private scannerNameFromUa(userAgent: string) {
		if (!userAgent) return null;
		for (const [pattern, label] of SCANNER_UA_PATTERNS) {
			if (pattern.test(userAgent)) return `Tool:Recon/Scanner.${label}` as const;
		}
		return null;
	}

	private isLeakedCredentialHit(result: string) {
		if (!result) return false;
		return !LEAKED_CRED_CLEAN_VALUES.has(result.toLowerCase());
	}

	private hasAttackCategory(categories: string[]) {
		return categories.some((c) => ATTACK_CATEGORIES.has(c as SetValue<typeof ATTACK_CATEGORIES>));
	}

	private resolveStatus(action: string) {
		switch (action) {
			case 'block':
				return MSEStatus.Blocked;
			case 'challenge':
			case 'managed_challenge':
			case 'jschallenge':
				return MSEStatus.Detected;
			case 'allow':
				return MSEStatus.Allowed;
			default:
				return MSEStatus.Detected;
		}
	}

	private capitalize(str: string) {
		return str.charAt(0).toUpperCase() + str.slice(1);
	}

	private sanitizeLabel(label: string) {
		return label.replace(/[^a-z0-9]+/gi, '');
	}
}
