-- Cold Call schema

create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  display_name text not null,
  free_tier_sessions_today int not null default 0,
  free_tier_day date not null default current_date,
  current_streak_weeks int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists decks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references users(id) on delete cascade,
  title text not null,
  subject text not null,
  source_type text not null check (source_type in ('seeded', 'syllabus', 'custom')),
  visibility text not null default 'private' check (visibility in ('private', 'public')),
  created_at timestamptz not null default now()
);

-- source_type gained 'custom' after the initial deploy; re-widen the constraint
-- on any existing table (a fresh create above already has it, so this is a no-op there).
alter table decks drop constraint if exists decks_source_type_check;
alter table decks add constraint decks_source_type_check check (source_type in ('seeded', 'syllabus', 'custom'));

-- Per-deck grading weights (spec: "make the weights per-deck config, not hardcoded")
create table if not exists deck_configs (
  deck_id uuid primary key references decks(id) on delete cascade,
  accuracy_weight int not null default 40,
  coverage_weight int not null default 25,
  structure_weight int not null default 20,
  delivery_weight int not null default 15
);

create table if not exists subtopics (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references decks(id) on delete cascade,
  title text not null,
  difficulty_tier text not null default 'core' check (difficulty_tier in ('intro', 'core', 'advanced')),
  times_rolled int not null default 0,
  created_at timestamptz not null default now()
);

-- One generation call produces body_md + key_points together, cached and reused.
create table if not exists chapters (
  id uuid primary key default gen_random_uuid(),
  subtopic_id uuid not null references subtopics(id) on delete cascade,
  body_md text not null,
  key_points jsonb not null,
  model_version text not null,
  cached_at timestamptz not null default now(),
  unique (subtopic_id, model_version)
);

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  subtopic_id uuid not null references subtopics(id),
  chapter_id uuid not null references chapters(id),
  status text not null default 'studying'
    check (status in ('studying', 'ready_to_record', 'recording', 'transcribing', 'grading', 'scored', 'rejected')),
  reject_reason text,
  study_started_at timestamptz not null default now(),
  speech_started_at timestamptz,
  duration_s int,
  audio_url text,
  audio_uploaded_at timestamptz,
  transcript text,
  transcript_segments jsonb,
  is_private boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references sessions(id) on delete cascade,
  accuracy int not null,
  coverage int not null,
  structure int not null,
  delivery int not null,
  total numeric not null,
  missed_points jsonb not null default '[]',
  contradictions jsonb not null default '[]',
  key_point_hits jsonb not null default '[]',
  flags jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists streaks (
  user_id uuid not null references users(id) on delete cascade,
  week_start date not null,
  sessions_completed int not null default 0,
  freezes_remaining int not null default 2,
  freeze_month date not null default date_trunc('month', current_date)::date,
  league text not null default 'bronze',
  percentile numeric,
  primary key (user_id, week_start)
);

create table if not exists friendships (
  user_id uuid not null references users(id) on delete cascade,
  friend_id uuid not null references users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

-- Background job queue. Transcription and grading always run here, never inline.
create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('transcribe', 'grade')),
  payload jsonb not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'failed')),
  attempts int not null default 0,
  run_after timestamptz not null default now(),
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  event text not null,
  properties jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_subtopics_deck on subtopics(deck_id);
-- Lets seed.sql and the custom-topic endpoint use ON CONFLICT (deck_id, title)
-- to stay re-runnable / dedupe re-typed topics instead of erroring or duplicating.
create unique index if not exists idx_subtopics_deck_title on subtopics(deck_id, title);
create index if not exists idx_chapters_subtopic on chapters(subtopic_id);
create index if not exists idx_sessions_user on sessions(user_id, created_at desc);
create index if not exists idx_jobs_poll on jobs(status, run_after);
create index if not exists idx_analytics_user_event on analytics_events(user_id, event, created_at);
