create table participants (
  id text primary key,
  access_token text unique,
  full_name text not null,
  email text not null unique,
  phone text,
  institution text,
  github_url text,
  linkedin_url text,
  portfolio_url text,
  experience_level text not null check (experience_level in ('beginner', 'intermediate', 'advanced')),
  primary_role text not null,
  secondary_roles text[] not null default '{}',
  technical_skills text[] not null default '{}',
  non_technical_skills text[] not null default '{}',
  tools text[] not null default '{}',
  interests text[] not null default '{}',
  project_ideas text,
  preferred_team_size integer,
  preferred_teammates text[] not null default '{}',
  blocked_teammates text[] not null default '{}',
  availability text[] not null default '{}',
  personal_statement text,
  consent_to_match boolean not null default false,
  consent_to_share_contact boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table matching_settings (
  id text primary key default 'default',
  desired_team_size integer not null default 4,
  min_team_size integer not null default 3,
  max_team_size integer not null default 5,
  number_of_teams integer,
  allow_unassigned_participants boolean not null default true,
  require_builder boolean not null default true,
  require_presenter boolean not null default true,
  prevent_beginner_only_teams boolean not null default true,
  distribute_advanced_participants boolean not null default true,
  weights jsonb not null,
  updated_at timestamptz not null default now()
);

create table team_assignments (
  id text primary key,
  name text not null,
  participant_ids text[] not null,
  score_breakdown jsonb not null,
  locked boolean not null default false,
  created_at timestamptz not null default now()
);
