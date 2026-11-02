-- Shadecode Arena core schema for a dedicated Neon PostgreSQL database.
-- This migration is deliberately independent of Supabase auth and RLS.
-- Only the trusted Arena API may connect with database credentials.
-- Never ship the connection string to the mobile application.

begin;

create table if not exists arena_players (
  clerk_user_id text primary key,
  display_name varchar(24) not null check (char_length(display_name) between 2 and 24),
  avatar_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists arena_game_versions (
  game_key text not null check (game_key in ('shade_tiles_rush', 'circuit_breaker')),
  version integer not null check (version > 0),
  verifier_version text not null,
  is_current boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (game_key, version)
);

create unique index if not exists arena_one_current_game_version_idx
  on arena_game_versions (game_key) where is_current = true;

create table if not exists arena_score_submissions (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null references arena_players(clerk_user_id) on delete cascade,
  game_key text not null check (game_key in ('shade_tiles_rush', 'circuit_breaker')),
  game_version integer not null,
  idempotency_key varchar(128) not null,
  replay_payload jsonb not null,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  rejection_code text,
  verifier_version text,
  submitted_at timestamptz not null default now(),
  verified_at timestamptz,
  unique (clerk_user_id, idempotency_key),
  foreign key (game_key, game_version)
    references arena_game_versions(game_key, version),
  check (jsonb_typeof(replay_payload) = 'object')
);

create index if not exists arena_score_submissions_pending_idx
  on arena_score_submissions (submitted_at)
  where verification_status = 'pending';

create table if not exists arena_verified_scores (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references arena_score_submissions(id) on delete cascade,
  clerk_user_id text not null references arena_players(clerk_user_id) on delete cascade,
  game_key text not null check (game_key in ('shade_tiles_rush', 'circuit_breaker')),
  game_version integer not null,
  score bigint not null check (score >= 0),
  duration_ms integer check (duration_ms is null or duration_ms > 0),
  moves integer check (moves is null or moves >= 0),
  completed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists arena_verified_scores_leaderboard_idx
  on arena_verified_scores (game_key, score desc, completed_at asc);

create index if not exists arena_verified_scores_player_idx
  on arena_verified_scores (clerk_user_id, game_key, completed_at desc);

create table if not exists arena_events (
  id uuid primary key default gen_random_uuid(),
  slug varchar(80) not null unique,
  title varchar(120) not null,
  description text not null default '',
  game_key text not null check (game_key in ('shade_tiles_rush', 'circuit_breaker')),
  format text not null check (format in ('daily_challenge', 'weekly_challenge', 'season', 'community_event', 'playtest')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  registration_opens_at timestamptz not null,
  registration_closes_at timestamptz not null,
  capacity integer check (capacity is null or capacity > 0),
  status text not null default 'draft'
    check (status in ('draft', 'published', 'paused', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (registration_opens_at < registration_closes_at),
  check (registration_closes_at <= starts_at)
);

create index if not exists arena_events_public_idx
  on arena_events (status, starts_at);

create table if not exists arena_event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references arena_events(id) on delete cascade,
  clerk_user_id text not null references arena_players(clerk_user_id) on delete cascade,
  status text not null default 'registered'
    check (status in ('registered', 'cancelled', 'checked_in', 'completed', 'disqualified')),
  registered_at timestamptz not null default now(),
  unique (event_id, clerk_user_id)
);

create index if not exists arena_event_registrations_player_idx
  on arena_event_registrations (clerk_user_id, registered_at desc);

create table if not exists arena_feedback (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null references arena_players(clerk_user_id) on delete cascade,
  category text not null
    check (category in ('gameplay', 'performance', 'accessibility', 'fairness', 'onboarding', 'other')),
  message text not null check (char_length(message) between 5 and 3000),
  app_version text,
  platform text check (platform is null or platform in ('android', 'ios')),
  created_at timestamptz not null default now()
);

create index if not exists arena_feedback_created_idx on arena_feedback (created_at desc);

create table if not exists arena_admin_audit (
  id bigint generated always as identity primary key,
  actor_clerk_user_id text,
  action text not null,
  target_type text not null,
  target_id text not null,
  request_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists arena_admin_audit_created_idx
  on arena_admin_audit (created_at desc);

commit;
