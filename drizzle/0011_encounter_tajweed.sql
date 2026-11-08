ALTER TABLE circle_records ADD COLUMN tajweed integer CHECK (tajweed BETWEEN 0 AND 5);
--> statement-breakpoint
ALTER TABLE motivational_scores ADD COLUMN tajweed integer CHECK (tajweed BETWEEN 0 AND 5);
