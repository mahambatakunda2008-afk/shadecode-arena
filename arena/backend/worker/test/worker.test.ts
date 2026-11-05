import test from "node:test";
import assert from "node:assert/strict";
import worker, { type Env } from "../src/index.ts";

const env: Env = {
  CLERK_ISSUER: "https://issuer.example.test",
  CLERK_JWKS_URL: "https://issuer.example.test/.well-known/jwks.json",
  CLERK_AUDIENCE: "arena-mobile",
};

test("health route returns only safe service metadata", async () => {
  const response = await worker.fetch(new Request("https://arena.test/v1/health"), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok", service: "arena-api", version: 1 });
  assert.ok(response.headers.get("X-Request-Id"));
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("readiness reports an unconfigured database without leaking configuration", async () => {
  const response = await worker.fetch(new Request("https://arena.test/v1/ready"), env);
  assert.equal(response.status, 503);
  const body = await response.json() as { error: { code: string; message: string }; requestId: string };
  assert.equal(body.error.code, "DATABASE_NOT_CONFIGURED");
  assert.match(body.error.message, /not configured/i);
  assert.ok(body.requestId);
  assert.equal(JSON.stringify(body).includes("DATABASE_URL"), false);
});

test("unknown routes return a stable JSON error", async () => {
  const response = await worker.fetch(new Request("https://arena.test/not-a-route"), env);
  assert.equal(response.status, 404);
  const body = await response.json() as { error: { code: string }; requestId: string };
  assert.equal(body.error.code, "NOT_FOUND");
  assert.ok(body.requestId);
});

test("profile endpoint rejects missing authentication", async () => {
  const response = await worker.fetch(new Request("https://arena.test/v1/me"), env);
  assert.equal(response.status, 401);
  const body = await response.json() as { error: { code: string } };
  assert.equal(body.error.code, "UNAUTHENTICATED");
});

test("ranked score submission requires authentication", async () => {
  const response = await worker.fetch(new Request("https://arena.test/v1/scores/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": "test-score-1" },
    body: JSON.stringify({ gameKey: "shade_tiles_rush", replay: {} }),
  }), env);
  assert.equal(response.status, 401);
  const body = await response.json() as { error: { code: string } };
  assert.equal(body.error.code, "UNAUTHENTICATED");
});

test("score submissions reject unauthenticated requests before inspecting game payload", async () => {
  const response = await worker.fetch(new Request("https://arena.test/v1/scores/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameKey: "unknown", replay: {} }),
  }), env);
  assert.equal(response.status, 401);
});

test("Circuit Breaker ranked submissions remain disabled unless explicitly enabled", async () => {
  const response = await worker.fetch(new Request("https://arena.test/v1/scores/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": "cb-test-1" },
    body: JSON.stringify({ gameKey: "circuit_breaker", replay: {} }),
  }), env);
  assert.equal(response.status, 401);
  const body = await response.json() as { error: { code: string } };
  assert.equal(body.error.code, "UNAUTHENTICATED");
});

test("event detail rejects malformed IDs without touching the database", async () => {
  const response = await worker.fetch(new Request("https://arena.test/v1/events/not-a-uuid"), env);
  assert.equal(response.status, 404);
  const body = await response.json() as { error: { code: string } };
  assert.equal(body.error.code, "EVENT_NOT_FOUND");
});

test("event detail route is present and reports database setup separately", async () => {
  const response = await worker.fetch(new Request("https://arena.test/v1/events/123e4567-e89b-12d3-a456-426614174000"), env);
  assert.equal(response.status, 503);
  const body = await response.json() as { error: { code: string } };
  assert.equal(body.error.code, "DATABASE_NOT_CONFIGURED");
});

test("event registration requires authentication before database access", async () => {
  const response = await worker.fetch(new Request("https://arena.test/v1/events/123e4567-e89b-12d3-a456-426614174000/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  }), env);
  assert.equal(response.status, 401);
  const body = await response.json() as { error: { code: string } };
  assert.equal(body.error.code, "UNAUTHENTICATED");
});

test("event registration rejects malformed event IDs", async () => {
  const response = await worker.fetch(new Request("https://arena.test/v1/events/not-a-uuid/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  }), env);
  assert.equal(response.status, 404);
});

test("preflight does not require database configuration", async () => {
  const response = await worker.fetch(new Request("https://arena.test/v1/me", { method: "OPTIONS" }), env);
  assert.equal(response.status, 204);
});


test("leaderboard rejects unsupported game keys before database access", async () => {
  const response = await worker.fetch(new Request("https://arena.test/v1/leaderboards/not_a_game"), env);
  assert.equal(response.status, 404);
  const body = await response.json() as { error: { code: string } };
  assert.equal(body.error.code, "UNKNOWN_GAME");
});

test("leaderboard limit is not evaluated before game-key validation", async () => {
  const response = await worker.fetch(new Request("https://arena.test/v1/leaderboards/unknown_game?limit=999999"), env);
  assert.equal(response.status, 404);
  const body = await response.json() as { error: { code: string } };
  assert.equal(body.error.code, "UNKNOWN_GAME");
});
