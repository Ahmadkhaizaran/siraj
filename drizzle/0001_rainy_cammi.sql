CREATE TABLE `calendar_events` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` integer,
	`mosque_id` text,
	`mosque_name` text NOT NULL,
	`title` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`lecturer` text DEFAULT '' NOT NULL,
	`kind` text DEFAULT 'activity' NOT NULL,
	`starts_on` text,
	`ends_on` text,
	`weekdays` text DEFAULT '' NOT NULL,
	`time_label` text DEFAULT '' NOT NULL,
	`source_url` text,
	`status` text DEFAULT 'active' NOT NULL,
	`content_hash` text NOT NULL,
	`published_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`source_id`) REFERENCES `calendar_sources`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`mosque_id`) REFERENCES `mosques`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `calendar_mosque_idx` ON `calendar_events` (`mosque_id`);--> statement-breakpoint
CREATE INDEX `calendar_source_idx` ON `calendar_events` (`source_id`);--> statement-breakpoint
CREATE TABLE `calendar_sources` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL,
	`url` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`checked_at` integer DEFAULT 0 NOT NULL,
	`success_at` integer,
	`error` text,
	`event_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `community_reads` (
	`user_id` text PRIMARY KEY NOT NULL,
	`seen_at` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
