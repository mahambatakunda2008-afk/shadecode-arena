-- Controlled maintenance query for a disposable or production Arena database.
-- Run from a scheduled trusted maintenance job, not from the mobile client.
-- Keep a 48-hour window so recent decisions remain available for debugging.
-- Review the deleted row count in the maintenance job's protected logs.

with removed as (
  delete from arena_rate_limits
  where window_started_at < now() - interval '48 hours'
  returning 1
)
select count(*)::integer as deleted_rate_limit_windows
from removed;
