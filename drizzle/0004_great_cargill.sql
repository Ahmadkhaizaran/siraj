CREATE TABLE `assessments` (
	`id` text PRIMARY KEY NOT NULL,
	`student_id` text NOT NULL,
	`day` text NOT NULL,
	`surah` integer NOT NULL,
	`memorization` integer NOT NULL,
	`retention` integer NOT NULL,
	`tajweed` integer NOT NULL,
	`performance` integer NOT NULL,
	`maximum` integer DEFAULT 4 NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_by` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `assessments_student` ON `assessments` (`student_id`,`day`);--> statement-breakpoint
CREATE TABLE `memorization` (
	`student_id` text NOT NULL,
	`surah` integer NOT NULL,
	`ranges` text DEFAULT '[]' NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `memory_student_surah` ON `memorization` (`student_id`,`surah`);--> statement-breakpoint
ALTER TABLE `students` ADD `english_name` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `nationality` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `joined_on` text;--> statement-breakpoint
ALTER TABLE `students` ADD `contact_mode` text DEFAULT 'parent' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `student_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_student_id_unique` ON `users` (`student_id`);