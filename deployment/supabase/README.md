# Supabase migration preparation

Target project: uhtburpimnfdydwuxapm.

001_siraj_schema.sql creates the 20 current Siraj tables in the isolated `siraj` schema, preserving text IDs, integer flags, unique constraints, foreign keys and identity counters. RLS is enabled. No grants or policies permit browser/anonymous access. It contains no account records, passwords, or runtime secrets. The generator uses Drizzle snapshot 0008, including cancelled accounts/institutions, motivational scores and platform achievements. Run `node deployment/supabase/generate-schema.mjs` to reproduce it.

Status (2026-11-03): project ACTIVE_HEALTHY. Applied successfully as `siraj_initial_schema_v18`. Verified all 20 tables have RLS enabled, no SELECT grants for anon/authenticated, and server-role access. Existing public customers/transactions/settings tables were left unchanged. Do not rerun this initial migration on the provisioned schema.

The original GPT Site uses D1. The new deployment uses Supabase; the obsolete gateway in deployment/vercel is archived. See the root README for the current architecture.

Implementation (2026-11-03):

- Backend is deployed as Supabase Edge Function `siraj-api`, authenticated with a server-only random key. Its SHA-256 hash is embedded in the backend bundle; the plaintext key and independent password pepper are stored only in Vercel encrypted environment variables.
- Next.js serves the UI and proxies same-origin API requests to this backend. No SQL proxy or database credentials are exposed to clients.
- Current source records were copied from the original Site via the authorized database viewer in one transaction. All 20 source tables were read without truncation. Identity sequences were restored. No source records were deleted.
- Imported accounts have `migration:legacy-password:<id>` settings, allowing a one-time password verification with the original Site. A correct login rehashes the password using the new pepper and removes the marker. A changed hash disables the fallback. Keep the original Site available until migration markers are cleared or passwords are reset. This is not ongoing replication.
- Legacy verification requires an explicit JSON `{ok:true}` response. HTML pages, ambiguous success bodies and upstream failures cannot authenticate an account. The upgrade checks the current hash and account state atomically, so a concurrent password reset cannot issue a session using the old password.
- `lib/postgres-adapter.ts` implements prepared queries and atomic batches. The same 408 API checks pass on an isolated PostgreSQL engine and on D1.
- Build the edge bundle with `SIRAJ_BACKEND_KEY_HASH` using `build-edge.mjs`. Deploy that bundle with its own API-key authentication (verify_jwt=false). Deploy the repository root on Vercel using `build:vercel`.

Never commit user records, plaintext passwords, runtime credentials, session cookies or the generated edge bundle's private runtime environment. The checked-in schema contains no production data.
