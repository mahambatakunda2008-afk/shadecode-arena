-- Run as the Neon database owner AFTER creating a dedicated login role named
-- arena_runtime and applying 002_neon_core_schema.sql.
-- Keep this role's password only in the Worker's DATABASE_URL secret.
-- Do not use the Neon owner/migration role as the Worker's runtime credential.

do $guard$
begin
  if not exists (select 1 from pg_roles where rolname = 'arena_runtime') then
    raise exception 'Create the dedicated arena_runtime role before applying these grants';
  end if;
end;
$guard$;

grant usage on schema public to arena_runtime;

-- Public/read paths and authenticated profile reads.
grant select on table
  arena_players,
  arena_game_versions,
  arena_events,
  arena_event_registrations,
  arena_verified_scores
to arena_runtime;

-- Profile upsert. No delete or ownership/DDL privileges.
grant insert, update on table arena_players to arena_runtime;

-- Authenticated feedback writes.
grant insert on table arena_feedback to arena_runtime;

-- Invoker-rights SQL functions need narrowly scoped access to their underlying
-- tables. Event registration uses a row lock and may reactivate a prior row.
grant insert, update on table arena_event_registrations to arena_runtime;

-- Score functions persist a verified submission and its leaderboard record.
grant insert on table arena_score_submissions, arena_verified_scores to arena_runtime;

-- Atomic rate-limit function performs INSERT ... ON CONFLICT DO UPDATE.
grant insert, update on table arena_rate_limits to arena_runtime;

-- Functions are explicitly executable by the runtime role, not PUBLIC.
grant execute on function arena_register_event(uuid, text) to arena_runtime;
grant execute on function arena_submit_verified_tile_rush_score(text, text, jsonb, bigint, integer, text) to arena_runtime;
grant execute on function arena_submit_verified_circuit_breaker_score(text, text, jsonb, integer, integer, text) to arena_runtime;
grant execute on function arena_consume_rate_limit(text, text, integer, integer) to arena_runtime;

-- Intentionally no CREATE, ALTER, DROP, TRUNCATE, DELETE, role management,
-- schema ownership, migration rights, or admin-audit writes.
