# Arena beta foundation

This folder defines the first operational foundation for the Shadecode Arena beta. It is deliberately backend-first: the app should not pretend that a locally saved form is a real registration or that client analytics are authoritative.

## Scope in this first slice

- Cohort-based closed and open beta.
- Player applications and consent records.
- Event creation and free-event registration.
- Structured player feedback and issue reports.
- Sponsor and organisation lead pipeline.
- Daily aggregate product/commercial metrics.
- Explicit non-prize enforcement for beta events.

## Trust boundaries

- The SQL migration is designed for a **dedicated Arena Supabase project**, never Shadecode Student's project.
- Apply it only after the Arena project exists and has been reviewed.
- Public clients must use authenticated, row-scoped operations for their own application, registration and feedback.
- Event publishing, cohort assignment, lead management, metric ingestion and moderation are server/admin operations. Never ship a service-role key in the app.
- Do not collect date of birth, identity documents, precise location, school name, phone number or payment details in this beta foundation.
- Do not accept entry fees or promise cash, cash-equivalent, sponsor-funded or organisation-funded prizes.
- Beta event records are constrained to free, non-prize events. The server must enforce this too.

## Suggested rollout

1. Create a dedicated Arena Supabase project and restrict dashboard access.
2. Apply `001_arena_beta_foundation.sql` in a staging project first.
3. Verify RLS with two separate test users: each can see only their own application, registrations and feedback.
4. Add server-side endpoints for application review, cohort assignment, event publishing, registration capacity and aggregate metrics.
5. Connect the mobile UI only after those endpoints exist. A client-side form without a backend is not a functioning beta registration system.
6. Invite a small closed cohort, then expand based on the scorecard in `../BETA_PROGRAM_AND_PRIZE_DISTRIBUTION.md`.

## API contract

See `API_CONTRACT.md` for the minimum server operations and expected behaviour.

## Operational rule

No production beta invitation should be sent until the privacy notice, support contact, moderation owner, data retention period and incident-response process are published.
