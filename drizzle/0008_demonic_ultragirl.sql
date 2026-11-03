CREATE TABLE `platform_achievements` (
	`number` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` text NOT NULL,
	`rank` integer NOT NULL,
	`points` integer NOT NULL,
	`marks` text NOT NULL,
	`meeting` text NOT NULL,
	`day` text NOT NULL,
	`created_at` text NOT NULL,
	`seen_by` text,
	`seen_at` text,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`seen_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `platform_achievement_student_rank` ON `platform_achievements` (`student_id`,`rank`);