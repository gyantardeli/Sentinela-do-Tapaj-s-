CREATE TABLE `watchdog_checks` (
	`id` text PRIMARY KEY NOT NULL,
	`checked_at` integer NOT NULL,
	`mode` text NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `watchdog_checks_time_idx` ON `watchdog_checks` (`checked_at`);