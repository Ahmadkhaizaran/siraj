ALTER TABLE siraj.circle_records ADD COLUMN IF NOT EXISTS tajweed integer CHECK (tajweed BETWEEN 0 AND 5);
ALTER TABLE siraj.motivational_scores ADD COLUMN IF NOT EXISTS tajweed integer CHECK (tajweed BETWEEN 0 AND 5);
