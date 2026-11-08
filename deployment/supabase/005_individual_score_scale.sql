ALTER TABLE siraj.circle_records ADD COLUMN IF NOT EXISTS score_max integer CHECK (score_max IN (25,30));
ALTER TABLE siraj.motivational_scores ADD COLUMN IF NOT EXISTS score_max integer CHECK (score_max IN (25,30));
