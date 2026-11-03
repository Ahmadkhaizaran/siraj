CREATE TABLE `support_messages` (
	`number` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`mosque_id` text NOT NULL,
	`sender_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`mosque_id`) REFERENCES `mosques`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `support_messages_mosque` ON `support_messages` (`mosque_id`,`number`);--> statement-breakpoint
CREATE TABLE `support_reads` (
	`user_id` text NOT NULL,
	`mosque_id` text NOT NULL,
	`last_number` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`mosque_id`) REFERENCES `mosques`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `support_reads_user_mosque` ON `support_reads` (`user_id`,`mosque_id`);--> statement-breakpoint
ALTER TABLE `students` ADD `quran_level` text DEFAULT '' NOT NULL;