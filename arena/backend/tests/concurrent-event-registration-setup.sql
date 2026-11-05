-- Fixture setup for the concurrent event-capacity test.
-- Run ONLY on a disposable Neon database after both migrations are applied.
-- Uses a reserved event UUID and 32 synthetic players.

begin;

delete from arena_event_registrations
where event_id = '00000000-0000-4000-8000-000000000001'::uuid;

insert into arena_players (clerk_user_id, display_name)
select
  'arena-concurrency-test-' || lpad(n::text, 2, '0'),
  'Arena Concurrency Test ' || lpad(n::text, 2, '0')
from generate_series(0, 31) as n
on conflict (clerk_user_id) do update
set display_name = excluded.display_name;

insert into arena_events (
  id, slug, title, description, game_key, format,
  starts_at, ends_at, registration_opens_at, registration_closes_at,
  capacity, status
) values (
  '00000000-0000-4000-8000-000000000001'::uuid,
  'arena-concurrency-capacity-test',
  'Disposable concurrency test',
  'Synthetic fixture. Never use in a live environment.',
  'shade_tiles_rush', 'playtest',
  now() + interval '2 hours', now() + interval '3 hours',
  now() - interval '1 minute', now() + interval '1 hour',
  1, 'published'
)
on conflict (id) do update
set capacity = excluded.capacity,
    status = excluded.status,
    registration_opens_at = excluded.registration_opens_at,
    registration_closes_at = excluded.registration_closes_at;

commit;
