# Arena backend bootstrap and launch runbook

This runbook is an execution checklist, not evidence that any provider has been provisioned. It deliberately separates account-owner actions from repository changes. Do not put credentials, live connection strings, signing keys, or real user data in GitHub.

## Current state

- Worker code and SQL migrations are in this pull request.
- The latest Worker, Tile Rush engine, and native-client CI workflows passed on the current PR head.
- No Neon database, Clerk application, Cloudflare Worker deployment, provider credential, migration execution, or mobile connection has been completed.
- The SQL smoke tests are written but have **not** been run against PostgreSQL.
- Ranked Circuit Breaker remains disabled. Blitz remains unsupported.
- A green CI run is not a substitute for database integration tests or production-runtime CPU measurements.

## 0. Freeze the launch boundary

Before provisioning anything:

- Keep the app's local/offline practice path working without sign-in or network access.
- Do not collect entry fees, stakes, player-funded prize pools, wallets, escrow, payouts, or cash-equivalent prizes in this initial beta.
- Do not advertise accounts, synced profiles, verified leaderboards, ranked events, or prizes as live until the corresponding end-to-end checks below pass.
- Choose the intended Cloudflare deployment region/placement and a Neon region close to it. Recheck free-tier quotas, provider terms, data-processing terms, and availability at that time.
- Keep a record of who owns each provider account and who can rotate credentials.

## 1. Create the provider resources manually

Use dedicated resources for Arena. Do not reuse Shadecode Student's Supabase project or credentials.

### Clerk

1. Create a Clerk application for the Arena Expo/native client.
2. Enable an email-based sign-in path that does not depend exclusively on SMS.
3. Configure the native redirect/deep-link URLs for the actual application identifiers.
4. Configure the session/JWT token so the API receives the expected audience: `arena-mobile`. Confirm this from a real development token before deploying.
5. Record the exact issuer URL and published JWKS URL from Clerk. Do not guess either URL from an example.
6. Keep Clerk secret keys out of the mobile app and repository. The Worker currently validates RS256 tokens using issuer, audience, and JWKS.

### Neon

1. Create a dedicated Arena project/database in a region selected alongside the Worker.
2. Retain the owner/migration credential separately from the application credential.
3. Create a dedicated login role named `arena_runtime` using Neon role management. Give it a strong unique password. Do not paste the password into this repository, a commit, an issue, or a shared document.
4. Obtain a pooled connection string for the `arena_runtime` role for the Worker. Keep the owner credential for controlled migrations only.
5. Confirm the runtime connection is TLS-enabled and points to the Arena database.

### Cloudflare

1. Create the Worker from `arena/backend/worker/wrangler.toml` in a non-production environment first.
2. Confirm the configured Worker name and route/domain before publishing.
3. Configure the non-secret runtime variables listed in section 4.
4. Do not expose the Neon connection string or Clerk secret keys to the Expo app.

## 2. Apply the database schema in order

Use a disposable Neon database first. Connect as the database owner/migration role, not `arena_runtime`.

1. Review `002_neon_core_schema.sql` in full.
2. Apply `arena/backend/002_neon_core_schema.sql` once.
3. Confirm the schema objects exist, including the player, game-version, score-submission, verified-score, event, feedback, and rate-limit tables and the narrowly scoped SECURITY DEFINER functions.
4. Confirm the score-submission functions and rate-limit/event-registration functions use a fixed `search_path`, and that PUBLIC execution is revoked.
5. Apply `arena/backend/003_runtime_role_grants.sql` as the owner/migration role after the `arena_runtime` role exists.
6. Inspect the resulting grants. The runtime role must not own the schema, create objects, alter/drop tables, truncate/delete rows, write directly to score-submission or verified-score tables, write directly to event registrations or rate-limit tables, or manage roles.
7. Confirm it can perform only the documented profile upsert, feedback insert, required reads, and EXECUTE the narrowly scoped SQL functions.

Do not use the runtime connection string to apply migrations. Do not run the Supabase-specific beta migration in `arena/beta/` against Neon.

## 3. Run disposable-database integration checks

Run these only on a disposable test database after applying both SQL files. They are transaction/rollback smoke tests, not production seed data:

- `arena/backend/tests/core-integration.test.sql`
- `arena/backend/tests/rate-limiter.test.sql`

Record the PostgreSQL version, migration commit, test command/tool, and complete pass/fail output in the PR or release notes. Confirm:

- First event registration succeeds and a second registration at capacity is rejected under the row lock.
- Tile Rush score submission is accepted once and the same idempotency key is rejected as duplicate.
- Circuit Breaker SQL submission remains unavailable while its game version is not current.
- Rate-limit calls allow up to the configured threshold and deny the next call in the same fixed window.
- Unknown rate-limit actions and invalid limits are rejected.
- The runtime role cannot bypass the SECURITY DEFINER functions with direct writes to protected tables.

Then run concurrent registration tests from multiple independent database sessions. The rollback-only SQL test alone does not prove the race behaviour under load.

Do not promote a game version or enable a ranked flag if any database test is failing or has not been run.

## 4. Configure the Worker

Set the following non-secret variables in the Cloudflare Worker environment, replacing every example value with the exact values from the real provider configuration:

| Variable | Required value |
| --- | --- |
| `CLERK_ISSUER` | Exact issuer URL from the Arena Clerk application |
| `CLERK_JWKS_URL` | Exact published JWKS URL from Clerk |
| `CLERK_AUDIENCE` | `arena-mobile`, matching the configured token audience |
| `APP_ENV` | `staging` for the first deployment |
| `ALLOWED_ORIGINS` | Exact comma-separated web origins that are actually used; do not use a wildcard |

Set `DATABASE_URL` as a Cloudflare Worker secret containing the pooled Neon connection string for `arena_runtime`. Never set it as a public `vars` value or mobile environment variable.

Keep `CIRCUIT_BREAKER_RANKED_ENABLED` unset or false. Do not turn it on during initial bootstrap.

Before deploying, remove the placeholder `clerk.example.invalid` values from the effective environment. A deployment with placeholders is not configured.

## 5. Staging verification

Deploy to staging only after the disposable database checks pass. Then verify:

1. `GET /v1/health` returns liveness only.
2. `GET /v1/ready` returns ready only when the runtime database connection works; missing/unavailable database returns a safe 503.
3. An actual Clerk-issued token with the expected issuer/audience can access `GET /v1/me`; a missing, expired, wrong-issuer, or wrong-audience token is rejected.
4. Profile upsert works for the authenticated subject only.
5. Public event listing/detail expose published events only.
6. Event registration handles duplicate registration and capacity races safely.
7. Feedback and profile writes enforce their per-account rate limits.
8. Leaderboards contain verified records only and do not expose Clerk subject IDs.
9. Tile Rush submissions are replay-verified server-side; client-supplied score values are not trusted.
10. Replayed idempotency keys do not create a second score.
11. Oversized, malformed, incomplete, out-of-bounds, and tampered replays are rejected.
12. CORS permits only the configured origins.
13. Logs and error responses do not expose database URLs, tokens, secrets, or raw provider errors.

Test offline practice with the Worker unreachable. A backend outage must not block local play.

## 6. Ranked-game activation gates

### Shade Tiles: Rush

Do not expose ranked submission as available until the staging checks above pass, the deployed Worker is running the exact tested engine commit, replay CPU use is measured on the actual Cloudflare runtime, abuse controls are reviewed, and rollback is rehearsed.

### Circuit Breaker

Keep both controls disabled until all of the following are complete:

- The disposable PostgreSQL integration tests pass.
- The verifier is tested on the actual Cloudflare Worker runtime, not just Node.js.
- CPU usage fits the deployed plan's per-invocation budget with headroom under worst-case valid inputs.
- The database version row is promoted deliberately in a reviewed migration/change.
- The Worker flag is enabled only after that promotion and staging end-to-end tests.
- A rollback procedure is ready.

The Node benchmark in CI is useful for regression comparison but is not a Cloudflare CPU billing measurement. Do not treat it as proof that the verifier fits the Worker CPU budget.

Blitz remains disabled until its own complete server-side verifier and persistence path exist.

## 7. Operations required before public beta

- Add edge-level abuse controls in addition to per-account limits.
- Add structured monitoring/alerts for Worker errors, 429s, database failures, latency, and quota consumption.
- Schedule and monitor `arena/backend/maintenance/cleanup_expired_rate_limits.sql`; it is not currently scheduled.
- Configure database backup/restore and perform a restore drill.
- Define an incident contact, credential-rotation process, and rollback owner.
- Set provider usage alerts where available. Never silently upgrade to a paid tier.
- Document data retention, privacy disclosures, support contact, moderation, and player-report handling.
- Confirm legal and payment-provider requirements before introducing entry fees or prizes in any later phase.

## 8. Release record

For every environment, record:

- Environment name and deployment URL.
- Worker commit SHA and deployment timestamp.
- Neon migration commit(s) and PostgreSQL version.
- Clerk issuer/audience configuration (never tokens or secrets).
- SQL integration and concurrency test results.
- Authentication, replay, idempotency, rate-limit, and offline-fallback results.
- Actual Worker CPU measurements and request/latency/error observations.
- Outstanding limitations and the person approving the next rollout gate.

## Explicit non-completion statement

Until the above steps are performed and recorded, Arena has a CI-tested backend implementation and deployment instructions, **not a live online backend**. A green GitHub workflow does not mean a Neon migration, Clerk login, Cloudflare deployment, or online leaderboard is live.
