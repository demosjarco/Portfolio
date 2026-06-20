CREATE TABLE `waf_events` (
	`ray_id` blob NOT NULL,
	`rule_id` blob NOT NULL,
	`match_index` integer NOT NULL,
	`b_time` integer NOT NULL,
	`threat_name` text NOT NULL,
	`description` text NOT NULL,
	`ja3` blob,
	`status` integer NOT NULL,
	CONSTRAINT `waf_events_pk` PRIMARY KEY(`rule_id`, `match_index`, `ray_id`)
) WITHOUT ROWID, STRICT;
--> statement-breakpoint
CREATE INDEX `events_ray_id` ON `waf_events` (`ray_id`);--> statement-breakpoint
CREATE INDEX `events_b_time` ON `waf_events` (`b_time`);--> statement-breakpoint
CREATE INDEX `events_threat_name` ON `waf_events` (`threat_name`);