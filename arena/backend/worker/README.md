# Arena API Worker

Cloudflare Worker API for Shadecode Arena. This package is deliberately separate from the Expo app.

## Local development

Requirements: Node.js 22+ and npm.

```sh
cd arena/backend/worker
npm install
npm test
npm run typecheck
npm run dev
```

Before authenticated routes can work, configure a real Clerk instance and the matching values in Wrangler secrets/vars. Never commit secrets:

```sh
npx wrangler secret put DATABASE_URL
```

Set `CLERK_ISSUER`, `CLERK_JWKS_URL` and `CLERK_AUDIENCE` to values from the Clerk instance and the Arena JWT template. The token template must issue an RS256 JWT with the expected issuer, audience and subject. Do not use a Clerk secret key as a client token.

For browser clients, set `ALLOWED_ORIGINS` to a comma-separated allowlist. Native Expo requests generally do not send an Origin header.

## Implemented routes

- `GET /v1/health`: public health response.
- `GET /v1/me`: authenticated profile lookup.
- `PATCH /v1/me`: authenticated profile upsert.
- `GET /v1/events`: published event listing.
- `GET /v1/leaderboards/:gameKey`: verified-score listing only.
- `POST /v1/feedback`: authenticated feedback submission.
- `POST /v1/events/:eventId/register`: authenticated registration through a database function that locks the event row and enforces capacity and registration windows.

All responses carry a request ID. JSON request bodies are capped at 8 KB. CORS is deny-by-default unless an explicit origin allowlist is configured.

## Deliberately disabled

- `POST /v1/scores/submit` returns `VERIFICATION_NOT_READY`. A score must not enter the global leaderboard until the server can reproduce/validate the relevant game result.
- Event registration is implemented in the Worker and migration, but remains unusable until the migration is applied to the dedicated Neon database and integration-tested. Never enable live events before that step.

## Security notes

- The Worker validates Clerk JWT signature, issuer, audience, expiry and subject using the configured remote JWKS.
- Player identity always comes from the verified JWT subject, never from request JSON.
- The Neon connection string is a Worker secret and must never be bundled into Expo.
- No admin endpoints are exposed.
- Database connectivity and auth routes cannot work until owner-controlled provider setup is complete.
- This is an initial implementation, not a production deployment or a security certification. Add distributed rate limiting, integration tests against a disposable Neon database, monitoring and backup procedures before public launch.
