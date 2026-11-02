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

test("score submission remains disabled until replay verification exists", async () => {
  const response = await worker.fetch(new Request("https://arena.test/v1/scores/submit", { method: "POST" }), env);
  assert.equal(response.status, 503);
  const body = await response.json() as { error: { code: string } };
  assert.equal(body.error.code, "VERIFICATION_NOT_READY");
});

test("event registration remains disabled until capacity is transactional", async () => {
  const response = await worker.fetch(new Request("https://arena.test/v1/events/event-id/register", { method: "POST" }), env);
  assert.equal(response.status, 503);
  const body = await response.json() as { error: { code: string } };
  assert.equal(body.error.code, "REGISTRATION_NOT_READY");
});

test("preflight does not require database configuration", async () => {
  const response = await worker.fetch(new Request("https://arena.test/v1/me", { method: "OPTIONS" }), env);
  assert.equal(response.status, 204);
});
