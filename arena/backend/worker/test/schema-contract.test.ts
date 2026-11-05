import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const schemaUrl = new URL("../../002_neon_core_schema.sql", import.meta.url);
const cleanupUrl = new URL("../../maintenance/cleanup_expired_rate_limits.sql", import.meta.url);
const rateLimitTestUrl = new URL("../../tests/rate-limiter.test.sql", import.meta.url);
const coreIntegrationTestUrl = new URL("../../tests/core-integration.test.sql", import.meta.url);

test("Neon schema pins the server verifier to the current Tile Rush rules", async () => {
  const schema = await readFile(schemaUrl, "utf8");
  assert.match(schema, /values\s*\('shade_tiles_rush',\s*1,\s*'tile-rush-3',\s*true\)/i);
  assert.match(schema, /p_moves\s+is distinct from\s+30/i);
});

test("rate limiter is an atomic fixed-window upsert with bounded inputs", async () => {
  const schema = await readFile(schemaUrl, "utf8");
  const functionStart = schema.indexOf("create or replace function arena_consume_rate_limit");
  assert.notEqual(functionStart, -1, "rate-limit function must exist");
  const functionBody = schema.slice(functionStart, schema.indexOf("$rate_limit$;", functionStart) + "$rate_limit$;".length);
  assert.match(functionBody, /p_action is null or p_limit is null or p_window_seconds is null/i);
  assert.match(functionBody, /p_limit < 1 or p_limit > 100/i);
  assert.match(functionBody, /p_window_seconds < 1 or p_window_seconds > 86400/i);
  assert.match(functionBody, /on conflict\s*\(subject_id, action, window_started_at\) do update/i);
  assert.match(functionBody, /where arena_rate_limits\.request_count < p_limit/i);
  assert.match(schema, /revoke all on function arena_consume_rate_limit\(text, text, integer, integer\) from public/i);
});

test("rate-limit SQL regression test exercises allow, deny and invalid inputs", async () => {
  const sql = await readFile(rateLimitTestUrl, "utf8");
  assert.match(sql, /first request should be allowed/i);
  assert.match(sql, /second request should be allowed/i);
  assert.match(sql, /third request should be denied/i);
  assert.match(sql, /unknown action should be denied/i);
  assert.match(sql, /zero limit should be denied/i);
  assert.match(sql, /rollback;/i);
});

test("rate-limit cleanup retains recent windows and removes only entries older than 48 hours", async () => {
  const sql = await readFile(cleanupUrl, "utf8");
  assert.match(sql, /window_started_at < now\(\) - interval '48 hours'/i);
  assert.match(sql, /returning 1/i);
  assert.match(sql, /deleted_rate_limit_windows/i);
});

test("event capacity and score idempotency are protected by database constraints", async () => {
  const schema = await readFile(schemaUrl, "utf8");
  const registerStart = schema.indexOf("create or replace function arena_register_event");
  const registerEnd = schema.indexOf("$arena$;", registerStart) + "$arena$;".length;
  assert.notEqual(registerStart, -1, "event registration function must exist");
  const registerFunction = schema.slice(registerStart, registerEnd);
  assert.match(registerFunction, /from arena_events where id = p_event_id for update/i);
  assert.match(registerFunction, /count\(\*\)::integer into v_active_count/i);
  assert.match(registerFunction, /v_active_count >= v_event\.capacity/i);
  assert.match(schema, /unique \(event_id, clerk_user_id\)/i);
  assert.match(schema, /unique \(clerk_user_id, idempotency_key\)/i);
  assert.match(schema, /on conflict \(clerk_user_id, idempotency_key\) do nothing/i);
});

test("each authenticated write route applies exactly one intended rate-limit guard", async () => {
  const workerUrl = new URL("../src/index.ts", import.meta.url);
  const source = await readFile(workerUrl, "utf8");
  const expected = [
    ['profile_patch', 10, 60],
    ['feedback', 3, 3600],
    ['score_submit', 5, 60],
    ['event_register', 5, 60],
  ] as const;
  for (const [action, limit, windowSeconds] of expected) {
    const matches = source.match(new RegExp('consumeRateLimit\\(env, auth\\.userId, "' + action + '", ' + limit + ', ' + windowSeconds + '\\)', 'g')) ?? [];
    assert.equal(matches.length, 1, action + " must have exactly one limiter call");
  }
});

test("Circuit Breaker ranked submissions remain explicitly gated", async () => {
  const schema = await readFile(schemaUrl, "utf8");
  const worker = await readFile(new URL("../src/index.ts", import.meta.url), "utf8");
  assert.doesNotMatch(schema, /values\s*\('circuit_breaker',\s*\d+,\s*'[^']+',\s*true\)/i);
  assert.match(schema, /create or replace function arena_submit_verified_circuit_breaker_score/i);
  assert.match(schema, /p_moves is null or p_moves not between 1 and 128/i);
  assert.match(schema, /p_level is null or p_level not between 1 and 10000/i);
  assert.match(schema, /revoke all on function arena_submit_verified_circuit_breaker_score\(text, text, jsonb, integer, integer, text\) from public/i);
  assert.match(worker, /if \(body.gameKey === "circuit_breaker"\)/);
  assert.match(schema, /level integer check \(level is null or level between 1 and 10000\)/i);
  assert.match(worker, /verifyCircuitBreakerReplay/);
  assert.match(worker, /CIRCUIT_BREAKER_RANKED_ENABLED !== "true"/);
  assert.match(worker, /rankingMetric: "fewest_moves"/);
  assert.match(worker, /s\.moves, s\.level, s\.completed_at/);
});


test("Neon runtime grants are least-privilege and separate from migration ownership", async () => {
  const grantsUrl = new URL("../../003_runtime_role_grants.sql", import.meta.url);
  const grants = await readFile(grantsUrl, "utf8");
  assert.match(grants, /create the dedicated arena_runtime role/i);
  assert.match(grants, /grant usage on schema public to arena_runtime/i);
  assert.match(grants, /grant execute on function arena_register_event\(uuid, text\) to arena_runtime/i);
  const schema = await readFile(schemaUrl, "utf8");
  const registerStart = schema.indexOf("create or replace function arena_register_event");
  const registerBody = schema.slice(registerStart, schema.indexOf("$arena$;", registerStart));
  assert.match(registerBody, /security definer/i);
  assert.match(registerBody, /set search_path = pg_catalog, public/i);
  assert.doesNotMatch(grants, /grant update on table arena_events/i);
  assert.doesNotMatch(grants, /grant (insert|update|delete|all) on table arena_event_registrations/i);
  assert.match(grants, /grant execute on function arena_submit_verified_tile_rush_score/i);
  assert.match(grants, /grant execute on function arena_submit_verified_circuit_breaker_score/i);
  assert.match(grants, /grant execute on function arena_consume_rate_limit/i);
  assert.match(grants, /grant insert, update on table arena_players/i);
  assert.match(grants, /grant insert on table arena_feedback/i);
  assert.match(grants, /grant insert, update on table arena_rate_limits/i);
  assert.doesNotMatch(grants, /grant all|grant create|grant delete|grant truncate|grant usage, create/i);
  assert.match(grants, /no create, alter, drop, truncate, delete/i);
});


test("disposable Neon integration script covers capacity, idempotency and disabled game version", async () => {
  const sql = await readFile(coreIntegrationTestUrl, "utf8");
  assert.match(sql, /first event registration expected REGISTERED/i);
  assert.match(sql, /second registration should respect capacity/i);
  assert.match(sql, /first verified score expected SUBMITTED/i);
  assert.match(sql, /reused idempotency key should return DUPLICATE/i);
  assert.match(sql, /Circuit Breaker must remain disabled/i);
  assert.match(sql, /rollback;/i);
});
