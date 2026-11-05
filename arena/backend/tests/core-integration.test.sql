-- Transactional smoke/integration checks for the Neon core schema.
-- Run only against a disposable database after applying 002_neon_core_schema.sql
-- and before enabling any public API traffic. All fixture rows are rolled back.

begin;

-- Verify the deployed runtime role is least-privilege before exercising functions.
do $permissions$
begin
  if not exists (select 1 from pg_roles where rolname = 'arena_runtime') then
    raise exception 'arena_runtime role must exist before integration checks';
  end if;

  if exists (
    select 1 from pg_roles
    where rolname = 'arena_runtime'
      and (rolsuper or rolcreatedb or rolcreaterole or rolreplication or rolbypassrls)
  ) then
    raise exception 'arena_runtime must not have elevated cluster or RLS-bypass attributes';
  end if;

  if has_schema_privilege('arena_runtime', 'public', 'CREATE') then
    raise exception 'arena_runtime must not create objects in public schema';
  end if;

  if has_table_privilege('arena_runtime', 'public.arena_score_submissions', 'INSERT,UPDATE,DELETE,TRUNCATE')
     or has_table_privilege('arena_runtime', 'public.arena_verified_scores', 'INSERT,UPDATE,DELETE,TRUNCATE')
     or has_table_privilege('arena_runtime', 'public.arena_event_registrations', 'INSERT,UPDATE,DELETE,TRUNCATE')
     or has_table_privilege('arena_runtime', 'public.arena_rate_limits', 'INSERT,UPDATE,DELETE,TRUNCATE') then
    raise exception 'arena_runtime must not directly write protected tables';
  end if;

  if not has_function_privilege('arena_runtime', 'public.arena_register_event(uuid,text)', 'EXECUTE')
     or not has_function_privilege('arena_runtime', 'public.arena_submit_verified_tile_rush_score(text,text,jsonb,bigint,integer,text)', 'EXECUTE')
     or not has_function_privilege('arena_runtime', 'public.arena_consume_rate_limit(text,text,integer,integer)', 'EXECUTE') then
    raise exception 'arena_runtime is missing required SECURITY DEFINER function execution grants';
  end if;
end;
$permissions$;

do $test$
declare
  v_player_a text := 'arena-test-a-' || gen_random_uuid()::text;
  v_player_b text := 'arena-test-b-' || gen_random_uuid()::text;
  v_event_id uuid := gen_random_uuid();
  v_result text;
  v_now timestamptz := now();
begin
  insert into arena_players (clerk_user_id, display_name)
  values (v_player_a, 'Test Player A'), (v_player_b, 'Test Player B');

  insert into arena_events (
    id, slug, title, description, game_key, format,
    starts_at, ends_at, registration_opens_at, registration_closes_at,
    capacity, status
  ) values (
    v_event_id, 'integration-' || replace(v_event_id::text, '-', ''),
    'Integration Event', 'Disposable database test',
    'shade_tiles_rush', 'playtest',
    v_now + interval '2 hours', v_now + interval '3 hours',
    v_now - interval '1 minute', v_now + interval '1 hour',
    1, 'published'
  );

  select arena_register_event(v_event_id, v_player_a) into v_result;
  if v_result is distinct from 'REGISTERED' then
    raise exception 'first event registration expected REGISTERED, got %', v_result;
  end if;

  select arena_register_event(v_event_id, v_player_b) into v_result;
  if v_result is distinct from 'EVENT_FULL' then
    raise exception 'second registration should respect capacity, got %', v_result;
  end if;

  select arena_register_event(v_event_id, v_player_a) into v_result;
  if v_result is distinct from 'ALREADY_REGISTERED' then
    raise exception 'repeat registration should be idempotent, got %', v_result;
  end if;

  select arena_submit_verified_tile_rush_score(
    v_player_a, 'integration-score-once',
    '{"rulesVersion":"tile-rush-3","mode":"ranked","seed":1,"swaps":[]}'::jsonb,
    123, 30, 'tile-rush-3'
  ) into v_result;
  if v_result is distinct from 'SUBMITTED' then
    raise exception 'first verified score expected SUBMITTED, got %', v_result;
  end if;

  select arena_submit_verified_tile_rush_score(
    v_player_a, 'integration-score-once',
    '{"rulesVersion":"tile-rush-3","mode":"ranked","seed":1,"swaps":[]}'::jsonb,
    123, 30, 'tile-rush-3'
  ) into v_result;
  if v_result is distinct from 'DUPLICATE' then
    raise exception 'reused idempotency key should return DUPLICATE, got %', v_result;
  end if;

  select arena_submit_verified_circuit_breaker_score(
    v_player_a, 'integration-circuit-disabled',
    '{"rulesVersion":"circuit-breaker-1","level":1}'::jsonb,
    1, 1, 'circuit-breaker-1'
  ) into v_result;
  if v_result is distinct from 'GAME_VERSION_UNAVAILABLE' then
    raise exception 'Circuit Breaker must remain disabled before explicit promotion, got %', v_result;
  end if;
end;
$test$;


-- Registration policy edge cases: profile, publication and time windows.
do $registration_edges$
declare
  v_player text := 'arena-edge-' || gen_random_uuid()::text;
  v_event_id uuid;
  v_result text;
  v_now timestamptz := now();
begin
  insert into arena_players (clerk_user_id, display_name)
  values (v_player, 'Edge Test Player');

  -- Published, but registration has not opened yet.
  v_event_id := gen_random_uuid();
  insert into arena_events (
    id, slug, title, description, game_key, format,
    starts_at, ends_at, registration_opens_at, registration_closes_at,
    capacity, status
  ) values (
    v_event_id, 'not-open-' || replace(v_event_id::text, '-', ''),
    'Not Open', 'Registration window test', 'shade_tiles_rush', 'playtest',
    v_now + interval '3 hours', v_now + interval '4 hours',
    v_now + interval '1 hour', v_now + interval '2 hours',
    10, 'published'
  );
  select arena_register_event(v_event_id, v_player) into v_result;
  if v_result is distinct from 'REGISTRATION_NOT_OPEN' then
    raise exception 'registration before opening should be rejected, got %', v_result;
  end if;

  -- Registration close time has passed even though the event has not started.
  v_event_id := gen_random_uuid();
  insert into arena_events (
    id, slug, title, description, game_key, format,
    starts_at, ends_at, registration_opens_at, registration_closes_at,
    capacity, status
  ) values (
    v_event_id, 'closed-' || replace(v_event_id::text, '-', ''),
    'Closed', 'Registration window test', 'shade_tiles_rush', 'playtest',
    v_now + interval '3 hours', v_now + interval '4 hours',
    v_now - interval '2 hours', v_now - interval '1 minute',
    10, 'published'
  );
  select arena_register_event(v_event_id, v_player) into v_result;
  if v_result is distinct from 'REGISTRATION_CLOSED' then
    raise exception 'registration after closing should be rejected, got %', v_result;
  end if;

  -- Draft events must not accept registrations.
  v_event_id := gen_random_uuid();
  insert into arena_events (
    id, slug, title, description, game_key, format,
    starts_at, ends_at, registration_opens_at, registration_closes_at,
    capacity, status
  ) values (
    v_event_id, 'draft-' || replace(v_event_id::text, '-', ''),
    'Draft', 'Publication policy test', 'shade_tiles_rush', 'playtest',
    v_now + interval '3 hours', v_now + interval '4 hours',
    v_now - interval '1 hour', v_now + interval '2 hours',
    10, 'draft'
  );
  select arena_register_event(v_event_id, v_player) into v_result;
  if v_result is distinct from 'EVENT_UNAVAILABLE' then
    raise exception 'unpublished event should be unavailable, got %', v_result;
  end if;

  -- A valid event still requires an existing player profile.
  v_event_id := gen_random_uuid();
  insert into arena_events (
    id, slug, title, description, game_key, format,
    starts_at, ends_at, registration_opens_at, registration_closes_at,
    capacity, status
  ) values (
    v_event_id, 'profile-' || replace(v_event_id::text, '-', ''),
    'Profile Required', 'Profile policy test', 'shade_tiles_rush', 'playtest',
    v_now + interval '3 hours', v_now + interval '4 hours',
    v_now - interval '1 hour', v_now + interval '2 hours',
    10, 'published'
  );
  select arena_register_event(v_event_id, 'missing-player-' || gen_random_uuid()::text) into v_result;
  if v_result is distinct from 'PROFILE_REQUIRED' then
    raise exception 'registration without a profile should be rejected, got %', v_result;
  end if;
end;
$registration_edges$;

rollback;
