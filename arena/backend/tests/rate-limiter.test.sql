-- Manual SQL regression test for the Neon rate limiter.
-- Run only against a disposable/test database after applying 002_neon_core_schema.sql.
-- The transaction is rolled back, leaving no test counters behind.

begin;

do $test$
declare
  v_subject text := 'rate-limit-test-' || gen_random_uuid()::text;
  v_allowed boolean;
begin
  select arena_consume_rate_limit(v_subject, 'feedback', 2, 3600) into v_allowed;
  if v_allowed is distinct from true then
    raise exception 'first request should be allowed';
  end if;

  select arena_consume_rate_limit(v_subject, 'feedback', 2, 3600) into v_allowed;
  if v_allowed is distinct from true then
    raise exception 'second request should be allowed';
  end if;

  select arena_consume_rate_limit(v_subject, 'feedback', 2, 3600) into v_allowed;
  if v_allowed is distinct from false then
    raise exception 'third request should be denied';
  end if;

  select arena_consume_rate_limit(v_subject, 'unknown_action', 2, 3600) into v_allowed;
  if v_allowed is distinct from false then
    raise exception 'unknown action should be denied';
  end if;

  select arena_consume_rate_limit(v_subject, 'feedback', 0, 3600) into v_allowed;
  if v_allowed is distinct from false then
    raise exception 'zero limit should be denied';
  end if;
end;
$test$;

rollback;
