import { neon } from "@neondatabase/serverless";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import { verifyReplay as verifyTileRushReplay, RULES_VERSION as TILE_RUSH_RULES_VERSION, type Replay as TileRushReplay } from "../../../tile-rush-engine/src/index.ts";

export interface Env {
  DATABASE_URL?: string;
  CLERK_ISSUER: string;
  CLERK_JWKS_URL: string;
  CLERK_AUDIENCE: string;
  APP_ENV?: string;
  ALLOWED_ORIGINS?: string;
}

type AuthContext = { userId: string; claims: JWTPayload };
type ApiError = { error: { code: string; message: string }; requestId: string };

const MAX_BODY_BYTES = 8_192;
let cachedJwksUrl = "";
let cachedJwks: ReturnType<typeof createRemoteJWKSet> | null = null;
const GAME_KEYS = new Set(["shade_tiles_rush", "circuit_breaker"]);
const FEEDBACK_CATEGORIES = new Set([
  "gameplay", "performance", "accessibility", "fairness", "onboarding", "other",
]);

function json(data: unknown, status = 200, requestId = crypto.randomUUID()): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Request-Id": requestId,
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function fail(code: string, message: string, status: number, requestId: string): Response {
  const body: ApiError = { error: { code, message }, requestId };
  return json(body, status, requestId);
}

function getSql(env: Env) {
  if (!env.DATABASE_URL) throw new Error("DATABASE_NOT_CONFIGURED");
  return neon(env.DATABASE_URL);
}

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get("Origin");
  const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  if (!origin || !allowed.includes(origin)) return { Vary: "Origin" };
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET,POST,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Authorization,Content-Type,Idempotency-Key",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES || !request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } catch {
    return null;
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const value: unknown = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function authenticate(request: Request, env: Env): Promise<AuthContext | null> {
  const header = request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token || token.length > 8_192) return null;

  try {
    if (!cachedJwks || cachedJwksUrl !== env.CLERK_JWKS_URL) {
      cachedJwksUrl = env.CLERK_JWKS_URL;
      cachedJwks = createRemoteJWKSet(new URL(env.CLERK_JWKS_URL));
    }
    const { payload } = await jwtVerify(token, cachedJwks, {
      issuer: env.CLERK_ISSUER,
      audience: env.CLERK_AUDIENCE,
      algorithms: ["RS256"],
    });
    if (typeof payload.sub !== "string" || payload.sub.length < 1 || payload.sub.length > 128) return null;
    return { userId: payload.sub, claims: payload };
  } catch {
    return null;
  }
}

function safeDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  return name.length >= 2 && name.length <= 24 ? name : null;
}

async function handle(request: Request, env: Env, requestId: string): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === "GET" && path === "/v1/health") {
    return json({ status: "ok", service: "arena-api", version: 1 }, 200, requestId);
  }

  if (path === "/v1/me" && (request.method === "GET" || request.method === "PATCH")) {
    const auth = await authenticate(request, env);
    if (!auth) return fail("UNAUTHENTICATED", "Sign in to access your Arena profile.", 401, requestId);
    if (request.method === "GET") {
      const sql = getSql(env);
      const rows = await sql`
        select clerk_user_id, display_name, avatar_key, created_at, updated_at
        from arena_players where clerk_user_id = ${auth.userId} limit 1
      `;
      if (!rows[0]) return json({ profile: null }, 200, requestId);
      const row = rows[0] as Record<string, unknown>;
      return json({ profile: { id: row.clerk_user_id, displayName: row.display_name, avatarKey: row.avatar_key, createdAt: row.created_at, updatedAt: row.updated_at } }, 200, requestId);
    }

    const body = await readJson(request);
    if (!body) return fail("INVALID_BODY", "Send a valid JSON object no larger than 8 KB.", 400, requestId);
    const displayName = safeDisplayName(body.displayName);
    if (!displayName) return fail("INVALID_DISPLAY_NAME", "Display names must contain 2 to 24 characters.", 422, requestId);
    const sql = getSql(env);
    const rows = await sql`
      insert into arena_players (clerk_user_id, display_name)
      values (${auth.userId}, ${displayName})
      on conflict (clerk_user_id) do update
        set display_name = excluded.display_name, updated_at = now()
      returning clerk_user_id, display_name, avatar_key, created_at, updated_at
    `;
    const row = rows[0] as Record<string, unknown>;
    return json({ profile: { id: row.clerk_user_id, displayName: row.display_name, avatarKey: row.avatar_key, createdAt: row.created_at, updatedAt: row.updated_at } }, 200, requestId);
  }

  if (request.method === "GET" && path === "/v1/events") {
    const sql = getSql(env);
    const rows = await sql`
      select id, slug, title, description, game_key, format, starts_at, ends_at,
             registration_opens_at, registration_closes_at, capacity
      from arena_events
      where status = 'published' and starts_at > now() - interval '1 day'
      order by starts_at asc limit 50
    `;
    return json({ events: rows }, 200, requestId);
  }

  const leaderboardMatch = path.match(/^\/v1\/leaderboards\/([a-z_]+)$/);
  if (request.method === "GET" && leaderboardMatch) {
    const gameKey = leaderboardMatch[1];
    if (!GAME_KEYS.has(gameKey)) return fail("UNKNOWN_GAME", "That game is not supported.", 404, requestId);
    const parsedLimit = Number(url.searchParams.get("limit") ?? "25");
    const limit = Number.isInteger(parsedLimit) ? Math.max(1, Math.min(parsedLimit, 50)) : 25;
    const sql = getSql(env);
    const rows = await sql`
      select s.clerk_user_id as player_id, p.display_name, s.score, s.duration_ms,
             s.moves, s.completed_at
      from arena_verified_scores s
      join arena_players p on p.clerk_user_id = s.clerk_user_id
      where s.game_key = ${gameKey}
      order by s.score desc, s.completed_at asc
      limit ${limit}
    `;
    return json({ gameKey, verifiedOnly: true, entries: rows }, 200, requestId);
  }

  if (request.method === "POST" && path === "/v1/feedback") {
    const auth = await authenticate(request, env);
    if (!auth) return fail("UNAUTHENTICATED", "Sign in before sending feedback.", 401, requestId);
    const body = await readJson(request);
    if (!body) return fail("INVALID_BODY", "Send a valid JSON object no larger than 8 KB.", 400, requestId);
    const category = body.category;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (typeof category !== "string" || !FEEDBACK_CATEGORIES.has(category) || message.length < 5 || message.length > 3000) {
      return fail("INVALID_FEEDBACK", "Choose a valid category and provide 5 to 3000 characters.", 422, requestId);
    }
    const platform = body.platform === "android" || body.platform === "ios" ? body.platform : null;
    const appVersion = typeof body.appVersion === "string" ? body.appVersion.slice(0, 40) : null;
    const sql = getSql(env);
    await sql`
      insert into arena_feedback (clerk_user_id, category, message, app_version, platform)
      values (${auth.userId}, ${category}, ${message}, ${appVersion}, ${platform})
    `;
    return json({ accepted: true }, 201, requestId);
  }

  if (request.method === "POST" && path === "/v1/scores/submit") {
    const auth = await authenticate(request, env);
    if (!auth) return fail("UNAUTHENTICATED", "Sign in before submitting a competitive score.", 401, requestId);
    const body = await readJson(request);
    if (!body) return fail("INVALID_BODY", "Send a valid JSON object no larger than 8 KB.", 400, requestId);
    if (body.gameKey !== "shade_tiles_rush") {
      return fail("VERIFIER_NOT_READY", "Only Shade Tiles: Rush replay verification is currently available. Circuit Breaker and Blitz submissions remain disabled.", 503, requestId);
    }
    const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() ?? "";
    if (!idempotencyKey || idempotencyKey.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(idempotencyKey)) {
      return fail("INVALID_IDEMPOTENCY_KEY", "Provide an Idempotency-Key of 1 to 128 safe characters.", 400, requestId);
    }
    const replayValue = body.replay;
    if (!replayValue || typeof replayValue !== "object" || Array.isArray(replayValue)) {
      return fail("INVALID_REPLAY", "A replay object is required.", 422, requestId);
    }
    const replay = replayValue as Record<string, unknown>;
    if (replay.rulesVersion !== TILE_RUSH_RULES_VERSION || replay.mode !== "ranked" ||
        !Number.isSafeInteger(replay.seed) || (replay.seed as number) < 0 ||
        !Array.isArray(replay.swaps) || replay.swaps.length < 1 || replay.swaps.length > 300) {
      return fail("INVALID_REPLAY", "Replay must use the current ranked rules, a valid seed and 1 to 300 moves.", 422, requestId);
    }
    for (const swap of replay.swaps) {
      if (!swap || typeof swap !== "object" || Array.isArray(swap)) {
        return fail("INVALID_REPLAY", "Replay contains a malformed move.", 422, requestId);
      }
      const item = swap as Record<string, unknown>;
      for (const pointName of ["from", "to"]) {
        const point = item[pointName];
        if (!point || typeof point !== "object" || Array.isArray(point)) {
          return fail("INVALID_REPLAY", "Replay contains a malformed move coordinate.", 422, requestId);
        }
        const coordinate = point as Record<string, unknown>;
        if (!Number.isInteger(coordinate.row) || !Number.isInteger(coordinate.col) ||
            (coordinate.row as number) < 0 || (coordinate.row as number) > 7 ||
            (coordinate.col as number) < 0 || (coordinate.col as number) > 7) {
          return fail("INVALID_REPLAY", "Replay coordinates must be integer board positions from 0 to 7.", 422, requestId);
        }
      }
    }
    let verified: ReturnType<typeof verifyTileRushReplay>;
    try {
      verified = verifyTileRushReplay(replay as unknown as TileRushReplay);
    } catch {
      return fail("INVALID_REPLAY", "Replay could not be processed safely.", 422, requestId);
    }
    if (!verified.valid || !verified.state) {
      return fail("REPLAY_REJECTED", "The submitted replay does not follow the current game rules.", 422, requestId);
    }
    if (verified.state.status !== "complete" || verified.state.movesUsed !== 30) {
      return fail("REPLAY_INCOMPLETE", "Ranked results are accepted only after all 30 valid moves are completed.", 422, requestId);
    }
    const sql = getSql(env);
    const rows = await sql`select arena_submit_verified_tile_rush_score(
      ${auth.userId}, ${idempotencyKey}, ${JSON.stringify(replay)}::jsonb,
      ${verified.state.score}, ${verified.state.movesUsed}, ${verified.state.rulesVersion}
    ) as result`;
    const result = String((rows[0] as Record<string, unknown>)?.result ?? "UNKNOWN");
    if (result === "SUBMITTED") {
      return json({ accepted: true, verified: true, gameKey: "shade_tiles_rush", score: verified.state.score, moves: verified.state.movesUsed }, 201, requestId);
    }
    if (result === "DUPLICATE") {
      return fail("DUPLICATE_SUBMISSION", "This idempotency key has already been used for a score submission.", 409, requestId);
    }
    if (result === "PLAYER_REQUIRED") {
      return fail("PROFILE_REQUIRED", "Create your Arena profile before submitting a ranked score.", 409, requestId);
    }
    if (result === "GAME_VERSION_UNAVAILABLE") {
      return fail("VERIFIER_NOT_PUBLISHED", "The current game verifier is not enabled in the Arena database yet.", 503, requestId);
    }
    return fail("SCORE_SUBMISSION_FAILED", "Arena could not save this verified score.", 500, requestId);
  }

  const registrationMatch = path.match(/^\/v1\/events\/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})\/register$/);
  if (request.method === "POST" && registrationMatch) {
    const auth = await authenticate(request, env);
    if (!auth) return fail("UNAUTHENTICATED", "Sign in before registering for an event.", 401, requestId);
    const body = await readJson(request);
    if (!body || Object.keys(body).length !== 0) {
      return fail("INVALID_BODY", "Registration accepts an empty JSON object.", 400, requestId);
    }
    const sql = getSql(env);
    const rows = await sql`select arena_register_event(${registrationMatch[1]}::uuid, ${auth.userId}) as result`;
    const result = String((rows[0] as Record<string, unknown>)?.result ?? "UNKNOWN");
    const responses: Record<string, { status: number; code: string; message: string }> = {
      REGISTERED: { status: 201, code: "REGISTERED", message: "You are registered for this event." },
      ALREADY_REGISTERED: { status: 200, code: "ALREADY_REGISTERED", message: "You are already registered for this event." },
      EVENT_NOT_FOUND: { status: 404, code: "EVENT_NOT_FOUND", message: "That event does not exist." },
      EVENT_UNAVAILABLE: { status: 409, code: "EVENT_UNAVAILABLE", message: "This event is not accepting registrations." },
      REGISTRATION_NOT_OPEN: { status: 409, code: "REGISTRATION_NOT_OPEN", message: "Registration has not opened yet." },
      REGISTRATION_CLOSED: { status: 409, code: "REGISTRATION_CLOSED", message: "Registration for this event has closed." },
      EVENT_FULL: { status: 409, code: "EVENT_FULL", message: "This event has reached capacity." },
      PROFILE_REQUIRED: { status: 409, code: "PROFILE_REQUIRED", message: "Create your Arena profile before registering." },
      INVALID_PLAYER: { status: 400, code: "INVALID_PLAYER", message: "The signed-in player identity is invalid." },
    };
    const mapped = responses[result];
    if (!mapped) return fail("REGISTRATION_FAILED", "Arena could not complete this registration.", 500, requestId);
    if (result === "REGISTERED" || result === "ALREADY_REGISTERED") {
      return json({ registration: { eventId: registrationMatch[1], status: "registered" } }, mapped.status, requestId);
    }
    return fail(mapped.code, mapped.message, mapped.status, requestId);
  }

  return fail("NOT_FOUND", "The requested Arena API route does not exist.", 404, requestId);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const requestId = crypto.randomUUID();
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }
    try {
      const response = await handle(request, env, requestId);
      const headers = new Headers(response.headers);
      new Headers(cors).forEach((value, key) => headers.set(key, value));
      return new Response(response.body, { status: response.status, headers });
    } catch (error) {
      const code = error instanceof Error && error.message === "DATABASE_NOT_CONFIGURED"
        ? "DATABASE_NOT_CONFIGURED"
        : "INTERNAL_ERROR";
      const status = code === "DATABASE_NOT_CONFIGURED" ? 503 : 500;
      return fail(code, status === 503 ? "Arena online services are not configured yet." : "Arena could not complete this request.", status, requestId);
    }
  },
};
