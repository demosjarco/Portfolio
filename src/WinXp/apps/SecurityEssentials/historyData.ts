/**
 * Dummy detection history for Microsoft Security Essentials.
 *
 * These entries stand in for real data: eventually the History tab will be
 * wired (via the Cloudflare API) to the live WAF events for the domain, then
 * surfaced here *as if* they were security events detected on this computer.
 * The shape below mirrors how a WAF event maps onto an MSE "detected item".
 */

export enum AlertLevel {
	severe = 'Severe',
	high = 'High',
	medium = 'Medium',
	low = 'Low',
}

export enum DetectionAction {
	quarantined = 'Quarantined',
	removed = 'Removed',
	blocked = 'Blocked',
	allowed = 'Allowed',
}

export interface DetectionEvent {
	id: string;
	/** Threat name, styled like an MSE signature (Category:Platform/Name). */
	name: string;
	alertLevel: AlertLevel;
	/** Epoch millis for when the item was detected. */
	detected: number;
	action: DetectionAction;
	/** Extra detail shown when an item is selected. */
	category: string;
	description: string;
}

const HOUR = 60 * 60 * 1000;
const now = Date.UTC(2025, 4, 31, 14, 18, 0);

export const detectionHistory: DetectionEvent[] = [
	{
		id: 'd1',
		name: 'Exploit:SQL/Injection.A',
		alertLevel: AlertLevel.severe,
		detected: now - 0.4 * HOUR,
		action: DetectionAction.blocked,
		category: 'Exploit',
		description: 'A SQL injection attempt was detected in an HTTP request and blocked before it could reach protected resources.',
	},
	{
		id: 'd2',
		name: 'Exploit:Script/XSS.Reflected',
		alertLevel: AlertLevel.high,
		detected: now - 1.2 * HOUR,
		action: DetectionAction.blocked,
		category: 'Exploit',
		description: 'A reflected cross-site scripting payload was identified in a query parameter and neutralized.',
	},
	{
		id: 'd3',
		name: 'Behavior:Web/PathTraversal',
		alertLevel: AlertLevel.high,
		detected: now - 3 * HOUR,
		action: DetectionAction.quarantined,
		category: 'Behavior',
		description: 'A request attempted to traverse outside of the permitted directory using "../" sequences.',
	},
	{
		id: 'd4',
		name: 'Tool:Recon/Scanner.Nikto',
		alertLevel: AlertLevel.medium,
		detected: now - 6 * HOUR,
		action: DetectionAction.blocked,
		category: 'Tool',
		description: 'Automated vulnerability scanner activity matching the Nikto signature was detected and rate-limited.',
	},
	{
		id: 'd5',
		name: 'Flood:Network/HTTP.RequestRate',
		alertLevel: AlertLevel.medium,
		detected: now - 9 * HOUR,
		action: DetectionAction.blocked,
		category: 'Flood',
		description: 'An abnormally high request rate from a single origin was throttled to protect availability.',
	},
	{
		id: 'd6',
		name: 'Probe:Web/AdminLogin',
		alertLevel: AlertLevel.low,
		detected: now - 26 * HOUR,
		action: DetectionAction.allowed,
		category: 'Probe',
		description: 'A request probed a common administrative path. The request was allowed but logged for review.',
	},
	{
		id: 'd7',
		name: 'Exploit:Web/CommandInjection.B',
		alertLevel: AlertLevel.severe,
		detected: now - 49 * HOUR,
		action: DetectionAction.removed,
		category: 'Exploit',
		description: 'A shell command injection attempt was detected in a form field and removed from the request.',
	},
];
