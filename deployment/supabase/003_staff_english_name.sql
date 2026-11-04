-- Existing staff keep their current credentials. New generated logins retain
-- the supplied English name without storing plaintext passwords.
ALTER TABLE siraj.users ADD COLUMN english_name text NOT NULL DEFAULT '';
