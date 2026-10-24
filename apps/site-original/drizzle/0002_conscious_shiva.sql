CREATE TABLE `alert_events` (
	`id` text PRIMARY KEY NOT NULL,
	`rule_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`value` text NOT NULL,
	`read_at` integer
);
--> statement-breakpoint
CREATE INDEX `alert_events_time_idx` ON `alert_events` (`created_at`);