CREATE TABLE `radar_items` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`published_at` integer NOT NULL,
	`first_seen` integer NOT NULL,
	`last_seen` integer NOT NULL,
	`mode` text NOT NULL,
	`places` text NOT NULL,
	`regions` text NOT NULL,
	`topic` text NOT NULL,
	`tags` text NOT NULL,
	`credit` text
);
--> statement-breakpoint
CREATE INDEX `radar_items_published_idx` ON `radar_items` (`published_at`);--> statement-breakpoint
CREATE INDEX `radar_items_source_idx` ON `radar_items` (`source_id`);--> statement-breakpoint
CREATE TABLE `radar_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`started_at` integer NOT NULL,
	`completed_at` integer NOT NULL,
	`checked` integer NOT NULL,
	`available` integer NOT NULL,
	`accepted` integer NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `radar_settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `radar_source_checks` (
	`source_id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`checked_at` integer NOT NULL,
	`last_ok_at` integer,
	`found` integer NOT NULL,
	`accepted` integer NOT NULL,
	`detail` text NOT NULL,
	`methods` text NOT NULL
);
