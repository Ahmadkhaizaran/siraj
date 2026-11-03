CREATE TABLE `motivational_scores` (
	`meeting` text DEFAULT 'اللقاء الأسبوعي' NOT NULL,
	`student_id` text NOT NULL,
	`day` text NOT NULL,
	`attendance` integer NOT NULL,
	`quran` integer NOT NULL,
	`religion` integer NOT NULL,
	`conduct` integer NOT NULL,
	`activity` integer NOT NULL,
	`points` integer NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `motivation_student_day` ON `motivational_scores` (`student_id`,`day`,`meeting`);