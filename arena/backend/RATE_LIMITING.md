# Arena API rate limiting

The Worker now uses the Neon function `arena_consume_rate_limit(text, text, integer, integer)` for authenticated write routes.

| Action | Limit |
| --- | ---: |
| `profile_patch` | 10 per 60 seconds |
| `feedback` | 3 per 3,600 seconds |
| `score_submit` | 5 per 60 seconds |
| `event_register` | 5 per 60 seconds |

The function uses a primary-key-backed atomic upsert per verified Clerk subject, action, and fixed time window. It does not store IP addresses. A denied request receives HTTP 429 and `RATE_LIMITED`.

## Deployment requirements

- Apply the updated `002_neon_core_schema.sql` migration before deploying this Worker version.
- Grant the dedicated Worker runtime database role EXECUTE on `arena_consume_rate_limit(text, text, integer, integer)`. The migration revokes PUBLIC execution. Do not use the database owner as the Worker credential.
- Add a retention cleanup for `arena_rate_limits` rows older than 48 hours. Until a scheduled cleanup is configured, monitor table growth and remove expired rows with a controlled maintenance query.
- Run concurrent integration tests against a disposable Neon database to confirm that the configured limit cannot be exceeded under simultaneous requests.
- Fixed windows can permit a burst across a window boundary. This is a first per-player guardrail, not a token bucket.
- These controls do not protect unauthenticated routes or prevent account farms. Add Cloudflare edge/WAF protections, monitoring, and alerting before public competitive play.
- Benchmark the added Neon round trip and cold-start behavior before enabling online writes for beta users.

No database migration has been applied and no service has been deployed by this change.
