-- Run after pgbench completes on the same disposable database.
do $assert$
declare
  v_count integer;
begin
  select count(*)::integer into v_count
  from arena_event_registrations
  where event_id = '00000000-0000-4000-8000-000000000001'::uuid
    and status = 'registered';

  if v_count <> 1 then
    raise exception 'capacity race test expected exactly 1 registration, got %', v_count;
  end if;
end;
$assert$;

select
  count(*) filter (where status = 'registered')::integer as registered_count,
  count(*) filter (where status <> 'registered')::integer as other_status_count
from arena_event_registrations
where event_id = '00000000-0000-4000-8000-000000000001'::uuid;
