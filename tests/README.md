# Current Siraj validation

Run `weekly-credentials.mjs` with `SIRAJ_TEST_DATABASE=postgres` and `PGLITE_MODULE_PATH` pointing to a local PGlite installation for the current permission, weekly encounter, memory, credential, certificate and service-control API scenarios. It uses an isolated database and refuses a production origin.

`buttons-ui.mjs` and `encounter-confirm.mjs` require `SIRAJ_REACT_TEST_ROOT` pointing to an isolated installation of react and react-test-renderer matching the application. They exercise real component event handlers with mocked network responses, including Quran selection, notes, grades, approval, error/retry behavior, forms, publishing and administrative actions. These are component tests, not a physical-device browser test.

Other standalone test files cover scheduling, scroll ownership, reader data, notification policy, supervision, beta-slot rules, themes and assistant navigation. `postgres-harness.mjs` is a helper.

The older `integration.mjs` retains historical expectations (teacher-visible student login codes, teacher standalone writes and student password changes). Those expectations contradict the current role model; the current API acceptance suite is `weekly-credentials.mjs`. Do not change current authorization to satisfy the historical fixture.

Individual encounter saves: `individual-student-save.mjs` verifies the current isolated API contract and score normalization without external feed requests. `individual-student-ui.mjs` verifies that saving one student leaves other drafts intact and blank attendance becomes absence. The older encounter-confirm entry point now delegates to this current UI scenario. Legacy bulk-finalized encounters remain immutable for compatibility.
