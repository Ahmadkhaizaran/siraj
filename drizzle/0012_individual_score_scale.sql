ALTER TABLE circle_records ADD COLUMN score_max integer CHECK (score_max IN (25,30));
--> statement-breakpoint
ALTER TABLE motivational_scores ADD COLUMN score_max integer CHECK (score_max IN (25,30));
