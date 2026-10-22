CREATE TABLE `environment_observations` (
	`kind` text NOT NULL,
	`place_id` text NOT NULL,
	`valid_at` integer NOT NULL,
	`collected_at` integer NOT NULL,
	`value` text NOT NULL,
	PRIMARY KEY(`kind`, `place_id`, `valid_at`)
);
--> statement-breakpoint
CREATE INDEX `environment_observations_time_idx` ON `environment_observations` (`valid_at`);--> statement-breakpoint
CREATE TABLE `fire_archive_days` (
	`day_utc` text PRIMARY KEY NOT NULL,
	`collected_at` integer NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_health_history` (
	`source_id` text NOT NULL,
	`checked_at` integer NOT NULL,
	`value` text NOT NULL,
	PRIMARY KEY(`source_id`, `checked_at`)
);
--> statement-breakpoint
CREATE INDEX `source_health_time_idx` ON `source_health_history` (`checked_at`);