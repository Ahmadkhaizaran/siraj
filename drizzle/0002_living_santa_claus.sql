CREATE TABLE `student_codes` (
	`number` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `student_codes_student_id_unique` ON `student_codes` (`student_id`);--> statement-breakpoint
ALTER TABLE `circles` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `circles` ADD `start_date` text;