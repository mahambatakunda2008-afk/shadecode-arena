# Arena free-backend foundation

## Decision

Use a provider-neutral API boundary with this initial free-tier stack:

| Responsibility | Initial service | Why |
| --- | --- | --- |
| Identity and sign-in | [Clerk](https://clerk.com/pricing) Hobby | Hosted identity, native-app support, no need to build password storage or session issuance. Current published allowance: 50,000 monthly retained users per application. |
| Relational data | [Neon](https://neon.com/pricing) Free Postgres | Separate Arena database, standard PostgreSQL, no dependence on either existing Supabase project. Current published allowance: 100 CU-hours and 1 GB storage per project, plus 5 GB monthly public transfer. |
| API and trusted game logic | [Cloudflare Workers](https://developers.cloudflare.com/workers/platform/pricing/) Free | Server-side boundary for mobile clients; current published allowance: 100,000 requests/day and 10 ms CPU per invocation. |
| Mobile client | Existing Expo app | Calls Arena API only. It must never connect to Neon or hold database credentials. |

This is a starting architecture, not a claim that the services have been provisioned, connected, or production-tested. Free-tier quotas and terms can change. Re-check provider pricing and regional availability before launch. Avoid SMS-dependent authentication as the only sign-in path.

## Why this instead of another Supabase project

- Arena remains independent of Shadecode Student and its database.
- The existing Supabase project cap is not a blocker.
- Neon gives us ordinary Postgres and portable SQL, while Clerk owns identity and Cloudflare Workers owns privileged writes.
- No database password, Clerk secret, signing secret, or service credential belongs in the Expo bundle.
- The SQL migration in this directory is a provider-neutral starting schema for Neon Postgres. It intentionally does not use Supabase's `auth.users`, `auth.uid()`, RLS helpers, or Supabase extensions.

## Trust boundaries

1. The app authenticates with Clerk and obtains a short-lived session token.
2. The app sends that token to the Arena API over HTTPS.
3. The Worker validates the token signature, issuer, audience and expiry using Clerk's published JWKS. It derives the player ID from the verified subject claim. Never accept a player ID supplied in the request body as identity.
4. The Worker validates request shape, size, rate limits, game version, idempotency key and replay.
5. The Worker uses a server-only Neon connection string to persist verified records.
6. The client can read public leaderboard/event projections, but cannot write verified scores, change another player's profile, or directly access the database.

## First backend milestones

### A. Provisioning (manual account-owner step)

- Create a Neon project named for Arena, in a region close to the chosen API region where possible.
- Create a Clerk application configured for the Expo native app. Enable email-based sign-in and only add social providers once their credentials and redirect URIs are configured.
- Create a Cloudflare Worker for the Arena API.
- Store secrets as Worker secrets: Clerk issuer/JWKS configuration as appropriate, Neon pooled connection string, and any server-side signing material.
- Add non-secret public Clerk configuration to the Expo app using the app's public environment configuration.
- Do not reuse, migrate, or connect Shadecode Student's Supabase project.

### B. API implementation status (2026-11-02)

The first Cloudflare Worker implementation now exists in `arena/backend/worker/`:

- Implemented in code: public health, authenticated profile read/upsert, published event listing, verified-score leaderboard reads, authenticated feedback writes, and authenticated event registration backed by an event-row lock/capacity-check SQL function.
- Authentication: Clerk JWT validation via remote JWKS with issuer, audience, expiry and subject checks.
- Request protections: 8 KB JSON body cap, stable error codes, request IDs, no-store responses and explicit CORS allowlist.
- CI: dedicated Worker test and TypeScript workflow added at `.github/workflows/arena-api.yml`.
- Not live: no provider accounts, database credentials, migration execution or Worker deployment have been configured.
- Intentionally disabled: score submission returns an explicit 503 until replay verification is implemented. Event registration code is present but cannot be used until the Neon migration is applied and concurrency-tested.
- Not yet implemented: distributed rate limiting, full event detail route, production observability and backup automation.

### C. Remaining API work before connecting screens

Implement and test these server routes behind a versioned prefix:

- `GET /v1/health`: service health only; never leak environment details.
- `GET /v1/me` and `PATCH /v1/me`: authenticated player profile.
- `POST /v1/scores/submit`: idempotent replay submission; server recomputes/validates the result and creates a verified record only on success.
- `GET /v1/leaderboards/:gameKey`: public, paginated leaderboard of verified records only.
- `GET /v1/events` and `GET /v1/events/:eventId`: public event catalogue.
- `POST /v1/events/:eventId/register`: implemented in the Worker and SQL migration; requires migration execution and integration/concurrency tests before activation.
- `POST /v1/feedback`: authenticated feedback with length/rate limits.

All writes need bounded payloads, stable error codes, request IDs, rate limits and audit records for administrative actions. Admin routes require explicit role checks on the server, not a client-side flag.

### D. Competition safety

- Local practice, daily streaks, local achievements and device-local profile values remain explicitly unverified.
- Never promote a client-reported score directly into a global leaderboard.
- Tile Rush replay validation must run on the server against a pinned game-engine version. Circuit Breaker submissions must be checked against the server-known seed, puzzle definition and legal solution rules.
- Store the submitted replay and verifier version so disputed records can be re-evaluated.
- Reject duplicate idempotency keys safely.
- No entry fees, stakes, player-funded pools, cash or cash-equivalent prizes, wallets, escrow or payouts in the initial release.
- Do not launch ranked competition until server verification, abuse controls, monitoring and operational review are complete.

## Free-tier reality and escape hatches

- Neon Free currently advertises 100 CU-hours per project/month, 1 GB database storage/project and 5 GB public transfer/project/month. Compute scales to zero after inactivity, so the first request after idle may be slower.
- Cloudflare Workers Free currently advertises 100,000 requests/day and 10 ms CPU per invocation. Keep replay verification bounded and benchmark it; move heavy verification to a queue or paid/alternative compute if it exceeds the CPU budget.
- Clerk Hobby currently advertises 50,000 monthly retained users per application. Review the plan's feature restrictions, session behaviour and terms before a commercial launch.
- Free tiers are not uptime guarantees. Add quota monitoring, graceful degradation and export/backup procedures before depending on this stack for live competition.
- Never silently incur charges. Set usage alerts where available and require owner approval before any paid upgrade.

## Migration and rollout order

1. Provision the three free services manually and keep credentials out of Git.
2. Deploy a health-only Worker and verify Clerk token validation.
3. Apply `002_neon_core_schema.sql` to the dedicated Neon database.
4. Add API integration tests for authentication, authorization, replay verification, idempotency, event capacity races and pagination.
5. Add an Arena API client to Expo behind a feature flag. Offline practice must continue when the API is unavailable.
6. Enable profile sync first, then verified score submission, then public leaderboards, then events.
7. Only advertise online features once deployed and tested end-to-end.

## Status

- Architecture selected: yes, as the proposed free-tier starting stack.
- Provider accounts created: no.
- Neon database provisioned: no.
- Clerk app configured: no.
- Cloudflare Worker deployed: no.
- Migration executed: no.
- Mobile app connected: no.
- Online accounts, synced profiles, global leaderboards, server-verified ranked play and event registration: not live.

Keep this document current as implementation advances. Do not describe a planned capability as shipped.
