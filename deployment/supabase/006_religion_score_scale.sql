ALTER TABLE siraj.circle_records DROP CONSTRAINT circle_records_score_max_check;
ALTER TABLE siraj.circle_records ADD CONSTRAINT circle_records_score_max_check CHECK (score_max IN (18,25,30));
ALTER TABLE siraj.motivational_scores DROP CONSTRAINT motivational_scores_score_max_check;
ALTER TABLE siraj.motivational_scores ADD CONSTRAINT motivational_scores_score_max_check CHECK (score_max IN (18,25,30));
