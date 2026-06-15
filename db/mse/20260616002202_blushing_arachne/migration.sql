CREATE TABLE `events` (
	`ray_id` blob NOT NULL,
	`rule_id` blob NOT NULL,
	`match_index` integer NOT NULL,
	`b_time` integer NOT NULL,
	`threat_name` text NOT NULL,
	`status` integer NOT NULL,
	CONSTRAINT `events_pk` PRIMARY KEY(`rule_id`, `match_index`, `ray_id`)
) WITHOUT ROWID, STRICT;
--> statement-breakpoint
CREATE INDEX `events_b_time` ON `events` (`b_time`);--> statement-breakpoint
CREATE INDEX `events_threat_name` ON `events` (`threat_name`);