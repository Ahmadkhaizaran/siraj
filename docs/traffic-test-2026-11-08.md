# Siraj traffic exercise - 2026-11-08

## Scope and environment

Synthetic data only: 1,000 student accounts with individual authenticated sessions, 100 circles and 8,000 historical evaluations. Tests ran the actual API handler and PostgreSQL adapter against a single-process PGlite WASM database. No real student records were copied. Bulk fixture inserts were followed by ANALYZE so query planning used realistic cardinality statistics.

This does **not** measure Vercel scaling, Supabase Edge CPU/memory limits, real database compute, hosted connection pooling, network latency, costs, login hashing under a login storm or a prolonged soak. It cannot certify 1,000 concurrent hosted users or establish a maximum hosted capacity.

## Observations

| Workload | Requests | Concurrency | Total seconds | p95 ms | Failed |
|---|---:|---:|---:|---:|---:|
| Mixed authenticated reads | 10 | 1 | 0.12 | 69.8 | 0 |
| Mixed authenticated reads | 10 | 10 | 0.09 | 93.0 | 0 |
| Mixed authenticated reads | 100 | 100 | 0.86 | 843.2 | 0 |
| Mixed authenticated reads | 1000 | 1000 | 8.31 | 7937.3 | 0 |
| Finalize encounters and memory | 100 | 100 | 5.22 | 5006.3 | 0 |

Read mix: 10% leaderboards, approximately 30% motivation/profile summaries and remaining student data. Exact routing is in tests/load-local.mjs. These are one-shot bursts, not 1,000 sustained requests per second.

Write verification: exactly 100 finalized encounters, 1,000 attendance/grade records and 1,000 memory rows were present after the run.

## Debugging changes

- The hosted edge numeric converter rejected fractional scores and percentages because it required every numeric result to be an integer. A dedicated converter now permits finite decimals while rejecting unsafe integer identifiers and non-finite values. Covered by tests/database-number.mjs.
- Leaderboard participation checks now use a student/account map instead of scanning all accounts for every student.

Initial trials on freshly bulk-loaded, unanalyzed synthetic tables had much slower planning/execution. They were stopped before completing the largest burst. Do not present them as completed capacity measurements or attribute the improvement from ANALYZE to the map change alone.

## Remaining hosted validation

Use an isolated hosted staging environment matching the production compute and pool configuration for a controlled ramp/soak. Define acceptable p95, failure ratio and database resource ceilings before testing. Measure database connections, query time, Edge CPU/memory, Vercel latency and the polling traffic separately. Current client polling alone can issue about 133 requests/s if 1,000 users keep the competition view active (two 15-second timers).

A broad API regression invocation was blocked by automatic review because it could contact the external Masjidi source. It was not retried indirectly. The isolated traffic exercise and numeric conversion checks do not require that external request.

Run locally with PGLITE_MODULE_PATH pointing to PGlite:

    node tests/database-number.mjs
    node tests/load-local.mjs

## Small production smoke check

20 anonymous read-only `/api/auth/status` requests, concurrency 2: all returned HTTP 200. Observed total latency from this execution environment ranged from 4717.7 to 8276.0 ms, with p95 8276.0 ms. This is a small availability sample, not an authenticated traffic or hosted capacity test; the total includes network/proxy overhead. No production accounts, grades or memory records were written by this check.

A follow-up comparison returned 200 for two cached favicon requests (HIT, 5,573.5 / 4,572.6 ms) and two auth-status requests (MISS, 5,478.5 / 5,129.5 ms). The similar delay for a cached static file means these timings cannot be attributed specifically to SQL or application processing; execution-environment/network overhead is material and has not been isolated.
