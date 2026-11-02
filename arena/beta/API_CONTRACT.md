# Arena beta API contract

Version: 1.0 draft

All endpoints require TLS. Authenticated player endpoints derive the player identity from the verified access token. Never accept a client-supplied user ID as authority. Admin endpoints require server-side role checks and must not be callable with a normal player token.

## Player endpoints

### `POST /v1/beta/applications`

Creates or updates the authenticated player's beta application.

Request:
```json
{
  "contact_email": "player@example.com",
  "display_name": "PlayerOne",
  "platforms": ["android"],
  "connection_profile": "limited_data",
  "experience_level": "regular",
  "consent_version": "beta-privacy-2026-11"
}
```

Rules:
- Normalize and validate email; limit display name length and reject offensive/reserved names.
- Accept only known platform and connection-profile values.
- Record consent version and timestamp server-side.
- One application per authenticated user; updates are audited.
- Do not collect date of birth or sensitive personal details in this endpoint.
- Return `application_id`, `status` and next-step instructions. Never imply acceptance before review.

### `GET /v1/beta/application`

Returns only the authenticated player's application and current status.

### `POST /v1/beta/events/:eventId/registrations`

Registers the authenticated player for a published event.

Rules:
- Event must be published, open, within its registration window and have capacity.
- Beta events must have zero entry fee and no prize or cash-equivalent reward.
- Enforce one registration per user per event transactionally.
- Return an idempotent registration result.
- Never trust a client-provided event status, fee, prize, score or rank.

### `GET /v1/beta/events`

Returns published, non-prize events only. Exclude draft, cancelled and internal events.

### `POST /v1/beta/feedback`

Request:
```json
{
  "category": "gameplay",
  "severity": "normal",
  "message": "The round result was unclear.",
  "app_version": "0.1.0",
  "platform": "android"
}
```

Rules:
- Limit message size, sanitize rendered content and rate-limit submissions.
- Never ask players to include passwords, payment information or identity documents.
- Feedback is private to its author and authorised beta staff.

## Admin/server endpoints

- `POST /v1/admin/beta/applications/:id/review`: approve, waitlist or reject with an internal reason and audit record.
- `POST /v1/admin/beta/cohorts/:id/assign`: assign an approved application to a cohort.
- `POST /v1/admin/beta/events`: create a draft event; server rejects any non-zero fee or prize fields.
- `POST /v1/admin/beta/events/:id/publish`: validate event rules and registration dates, then publish.
- `POST /v1/admin/beta/events/:id/cancel`: cancel and notify registered participants.
- `GET /v1/admin/beta/metrics`: return aggregate cohort, retention, quality, event and commercial funnel metrics. Suppress small groups where aggregate data could identify a player.
- `POST /v1/admin/commercial-leads`: record a sponsor/organisation lead, stage, next action and expected value. Access is staff-only.

## Error contract

Use stable machine-readable codes:
- `UNAUTHENTICATED`
- `APPLICATION_EXISTS`
- `INVALID_INPUT`
- `CONSENT_REQUIRED`
- `APPLICATION_NOT_APPROVED`
- `EVENT_NOT_OPEN`
- `EVENT_FULL`
- `ALREADY_REGISTERED`
- `BETA_PRIZES_DISABLED`
- `RATE_LIMITED`
- `NOT_AUTHORISED`

Return safe messages. Never expose stack traces, internal notes or other users' data.

## Idempotency, audit and observability

- Accept an `Idempotency-Key` for application writes and event registrations.
- Record actor, action, target, timestamp and request correlation ID for admin actions.
- Use database transactions for capacity checks and registration creation.
- Keep raw event telemetry minimal; derive aggregate metrics server-side.
- Define retention and deletion workflows before collecting real player data.
