-- Additive Siraj upgrade: multi-circle enrollments and daily encounter records.

-- Existing students, attendance, points, passwords and sessions are preserved.

CREATE TABLE siraj."circle_enrollments" (
  "circle_id" text NOT NULL,
  "student_id" text NOT NULL,
  "created_at" text NOT NULL,
  PRIMARY KEY ("circle_id", "student_id")
);

CREATE INDEX "circle_enrollment_student" ON siraj."circle_enrollments" ("student_id");

CREATE TABLE siraj."circle_sessions" (
  "id" text PRIMARY KEY NOT NULL,
  "circle_id" text NOT NULL,
  "day" text NOT NULL,
  "revision" bigint NOT NULL DEFAULT 1,
  "write_token" text NOT NULL,
  "updated_by" text NOT NULL,
  "updated_at" text NOT NULL
);

CREATE UNIQUE INDEX "circle_session_day" ON siraj."circle_sessions" ("circle_id", "day");

CREATE INDEX "circle_session_updated_by" ON siraj."circle_sessions" ("updated_by");

CREATE TABLE siraj."circle_records" (
  "session_id" text NOT NULL,
  "student_id" text NOT NULL,
  "status" text NOT NULL,
  "attendance" bigint NOT NULL,
  "quran" bigint NOT NULL,
  "religion" bigint NOT NULL,
  "conduct" bigint NOT NULL,
  "activity" bigint NOT NULL,
  "points" bigint NOT NULL,
  "notes" text NOT NULL DEFAULT '',
  "updated_by" text NOT NULL,
  "updated_at" text NOT NULL,
  PRIMARY KEY ("session_id", "student_id")
);

CREATE INDEX "circle_record_student_history" ON siraj."circle_records" ("student_id");

CREATE INDEX "circle_record_updated_by" ON siraj."circle_records" ("updated_by");

ALTER TABLE siraj."circle_enrollments" ADD FOREIGN KEY ("circle_id") REFERENCES siraj."circles" ("id");

ALTER TABLE siraj."circle_enrollments" ADD FOREIGN KEY ("student_id") REFERENCES siraj."students" ("id");

ALTER TABLE siraj."circle_enrollments" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON siraj."circle_enrollments" FROM PUBLIC, anon, authenticated;

GRANT ALL ON siraj."circle_enrollments" TO service_role;

ALTER TABLE siraj."circle_sessions" ADD FOREIGN KEY ("circle_id") REFERENCES siraj."circles" ("id");

ALTER TABLE siraj."circle_sessions" ADD FOREIGN KEY ("updated_by") REFERENCES siraj."users" ("id");

ALTER TABLE siraj."circle_sessions" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON siraj."circle_sessions" FROM PUBLIC, anon, authenticated;

GRANT ALL ON siraj."circle_sessions" TO service_role;

ALTER TABLE siraj."circle_records" ADD FOREIGN KEY ("session_id") REFERENCES siraj."circle_sessions" ("id");

ALTER TABLE siraj."circle_records" ADD FOREIGN KEY ("student_id") REFERENCES siraj."students" ("id");

ALTER TABLE siraj."circle_records" ADD FOREIGN KEY ("updated_by") REFERENCES siraj."users" ("id");

ALTER TABLE siraj."circle_records" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON siraj."circle_records" FROM PUBLIC, anon, authenticated;

GRANT ALL ON siraj."circle_records" TO service_role;
