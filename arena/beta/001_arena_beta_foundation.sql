-- Shadecode Arena beta foundation
-- Apply to a dedicated Arena Supabase project, never Shadecode Student.
-- Admin/service-role operations must run server-side. Never expose service keys.

create extension if not exists pgcrypto;

create table if not exists public.beta_cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  phase text not null check (phase in ('closed', 'community', 'public')),
  description text not null default '',
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer check (capacity is null or capacity > 0),
  status text not null default 'draft' check (status in ('draft', 'open', 'paused', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.beta_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  contact_email text not null,
  display_name text not null check (char_length(display_name) between 2 and 24),
  platforms text[] not null default '{}',
  connection_profile text not null check (connection_profile in ('reliable_wifi', 'mobile_data', 'limited_data', 'intermittent')),
  experience_level text not null check (experience_level in ('new', 'casual', 'regular', 'competitive')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'waitlisted', 'rejected')),
  consent_version text not null,
  consented_at timestamptz not null default now(),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.beta_cohort_members (
  cohort_id uuid not null references public.beta_cohorts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid not null references public.beta_applications(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active', 'paused', 'removed')),
  primary key (cohort_id, user_id),
  unique (application_id, cohort_id)
);

create table if not exists public.beta_events (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid references public.beta_cohorts(id) on delete set null,
  slug text not null unique,
  title text not null,
  description text not null default '',
  game_key text not null check (game_key in ('shade_tiles_rush', 'circuit_breaker')),
  format text not null check (format in ('daily_challenge', 'weekly_challenge', 'season', 'community_event', 'playtest')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  registration_opens_at timestamptz not null,
  registration_closes_at timestamptz not null,
  capacity integer check (capacity is null or capacity > 0),
  entry_fee_minor bigint not null default 0 check (entry_fee_minor = 0),
  prize_enabled boolean not null default false check (prize_enabled = false),
  prize_description text not null default '',
  status text not null default 'draft' check (status in ('draft', 'published', 'paused', 'cancelled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (registration_closes_at <= starts_at),
  check (registration_closes_at > registration_opens_at)
);

create table if not exists public.beta_event_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.beta_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'registered' check (status in ('registered', 'cancelled', 'checked_in', 'completed', 'disqualified')),
  registered_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('gameplay', 'performance', 'accessibility', 'fairness', 'onboarding', 'other')),
  severity text not null default 'normal' check (severity in ('low', 'normal', 'high', 'blocking')),
  message text not null check (char_length(message) between 5 and 3000),
  app_version text,
  platform text check (platform is null or platform in ('android', 'ios', 'web')),
  status text not null default 'new' check (status in ('new', 'reviewing', 'resolved', 'closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.commercial_leads (
  id uuid primary key default gen_random_uuid(),
  organisation_name text not null,
  contact_name text,
  contact_email text not null,
  lead_type text not null check (lead_type in ('school', 'club', 'community', 'brand', 'agency', 'event_organiser', 'other')),
  interest text[] not null default '{}',
  stage text not null default 'new' check (stage in ('new', 'contacted', 'qualified', 'proposal', 'committed', 'won', 'lost')),
  estimated_value_minor bigint check (estimated_value_minor is null or estimated_value_minor >= 0),
  currency_code text,
  next_action text,
  next_action_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.beta_daily_metrics (
  metric_date date not null,
  cohort_id uuid references public.beta_cohorts(id) on delete cascade,
  metric_key text not null check (metric_key in (
    'applications', 'approved_players', 'active_players', 'new_players',
    'games_started', 'games_completed', 'event_registrations',
    'feedback_reports', 'crashes', 'replay_verification_failures',
    'suspected_fair_play_incidents'
  )),
  metric_value bigint not null default 0 check (metric_value >= 0),
  dimensions jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (metric_date, cohort_id, metric_key, dimensions)
);

create table if not exists public.beta_admin_audit (
  id bigint generated always as identity primary key,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text not null,
  request_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists beta_applications_status_created_idx on public.beta_applications(status, created_at desc);
create index if not exists beta_cohort_members_user_idx on public.beta_cohort_members(user_id);
create index if not exists beta_events_publication_idx on public.beta_events(status, starts_at);
create index if not exists beta_registrations_user_idx on public.beta_event_registrations(user_id, registered_at desc);
create index if not exists beta_feedback_status_created_idx on public.beta_feedback(status, created_at desc);
create index if not exists commercial_leads_stage_idx on public.commercial_leads(stage, created_at desc);
create index if not exists beta_metrics_date_idx on public.beta_daily_metrics(metric_date desc);

alter table public.beta_cohorts enable row level security;
alter table public.beta_applications enable row level security;
alter table public.beta_cohort_members enable row level security;
alter table public.beta_events enable row level security;
alter table public.beta_event_registrations enable row level security;
alter table public.beta_feedback enable row level security;
alter table public.commercial_leads enable row level security;
alter table public.beta_daily_metrics enable row level security;
alter table public.beta_admin_audit enable row level security;

-- Players can read only their own application and cohort membership.
create policy "players read own beta application" on public.beta_applications
  for select to authenticated using (auth.uid() = user_id);
create policy "players create own beta application" on public.beta_applications
  for insert to authenticated with check (auth.uid() = user_id);
create policy "players update own pending application" on public.beta_applications
  for update to authenticated using (auth.uid() = user_id and status in ('pending', 'waitlisted'))
  with check (auth.uid() = user_id and status in ('pending', 'waitlisted'));

create policy "players read own cohort membership" on public.beta_cohort_members
  for select to authenticated using (auth.uid() = user_id);

-- Only published, non-prize events are visible to authenticated players.
create policy "players read published free events" on public.beta_events
  for select to authenticated using (status = 'published' and entry_fee_minor = 0 and prize_enabled = false);

create policy "players read own event registrations" on public.beta_event_registrations
  for select to authenticated using (auth.uid() = user_id);
create policy "players create own event registrations" on public.beta_event_registrations
  for insert to authenticated with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.beta_events e
      where e.id = event_id and e.status = 'published'
        and e.entry_fee_minor = 0 and e.prize_enabled = false
        and now() between e.registration_opens_at and e.registration_closes_at
    )
    and exists (
      select 1 from public.beta_applications a
      where a.user_id = auth.uid() and a.status = 'approved'
    )
  );
create policy "players cancel own registrations" on public.beta_event_registrations
  for update to authenticated using (auth.uid() = user_id and status = 'registered')
  with check (auth.uid() = user_id and status = 'cancelled');

create policy "players create own feedback" on public.beta_feedback
  for insert to authenticated with check (auth.uid() = user_id);
create policy "players read own feedback" on public.beta_feedback
  for select to authenticated using (auth.uid() = user_id);

-- Commercial leads, metrics and audit records have no player-facing policies.
-- Admin/server operations use a protected service role and explicit server checks.
