CREATE TABLE `circle_enrollments` (
	`circle_id` text NOT NULL,
	`student_id` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`circle_id`, `student_id`),
	FOREIGN KEY (`circle_id`) REFERENCES `circles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `circle_enrollment_student` ON `circle_enrollments` (`student_id`);--> statement-breakpoint
CREATE TABLE `circle_records` (
	`session_id` text NOT NULL,
	`student_id` text NOT NULL,
	`status` text NOT NULL,
	`attendance` integer NOT NULL,
	`quran` integer NOT NULL,
	`religion` integer NOT NULL,
	`conduct` integer NOT NULL,
	`activity` integer NOT NULL,
	`points` integer NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`session_id`, `student_id`),
	FOREIGN KEY (`session_id`) REFERENCES `circle_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `circle_record_student_history` ON `circle_records` (`student_id`);--> statement-breakpoint
CREATE INDEX `circle_record_updated_by` ON `circle_records` (`updated_by`);--> statement-breakpoint
CREATE TABLE `circle_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`circle_id` text NOT NULL,
	`day` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`write_token` text NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`circle_id`) REFERENCES `circles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `circle_session_day` ON `circle_sessions` (`circle_id`,`day`);--> statement-breakpoint
CREATE INDEX `circle_session_updated_by` ON `circle_sessions` (`updated_by`);