-- Transactional smoke/integration checks for the Neon core schema.
-- Run only against a disposable database after applying 002_neon_core_schema.sql
-- and before enabling any public API traffic. All fixture rows are rolled back.

begin;

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

rollback;
