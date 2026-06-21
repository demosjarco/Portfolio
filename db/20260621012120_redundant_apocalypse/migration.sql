CREATE TABLE `chatrooms` (
	`do_id` blob PRIMARY KEY,
	`do_id_hex` text GENERATED ALWAYS AS (lower(hex("do_id"))) VIRTUAL,
	`name` text NOT NULL,
	`b_time` integer NOT NULL
) WITHOUT ROWID, STRICT;
--> statement-breakpoint
CREATE INDEX `chatrooms_name` ON `chatrooms` (`name`);--> statement-breakpoint
CREATE INDEX `chatrooms_b_time` ON `chatrooms` (`b_time`);