-- NYU Run Club App — Supabase Schema
-- Run this in the Supabase SQL Editor to set up all tables.
-- Disable Row Level Security on each table after creating it (for local/dev use).

create table if not exists clubs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text not null,
  location    text not null,
  owner_id    uuid,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create table if not exists users (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  name       text not null,
  gender     text default 'man',  -- 'man' | 'woman'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists runs (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid references clubs(id) on delete cascade,
  title      text not null,
  date       timestamptz not null,
  notes      text,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists attendance (
  id            uuid primary key default gen_random_uuid(),
  run_id        uuid references runs(id) on delete cascade,
  user_id       uuid references users(id) on delete cascade,
  checked_in_at timestamptz default now(),
  notes         text,
  unique(run_id, user_id)
);

create table if not exists races (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid references clubs(id) on delete cascade,
  title      text not null,
  date       timestamptz not null,
  race_type  text not null,  -- 'road_xc' | 'track'
  distance   text not null,  -- '5k', '10k', 'Half Marathon', 'Marathon', 'XC', 'Track Meet'
  location   text,
  notes      text,
  created_by uuid,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists race_results (
  id           uuid primary key default gen_random_uuid(),
  race_id      uuid references races(id) on delete cascade,
  user_id      uuid references users(id) on delete cascade,
  time_display text,  -- e.g. '18:42' or '1:23:45'
  notes        text,
  created_at   timestamptz default now(),
  unique(race_id, user_id)
);

create table if not exists track_results (
  id             uuid primary key default gen_random_uuid(),
  race_id        uuid references races(id) on delete cascade,
  user_id        uuid references users(id) on delete cascade,
  event          text not null,  -- e.g. '800m', '4x400m Relay', 'Long Jump'
  result_display text,           -- time string or distance in meters/feet
  created_at     timestamptz default now(),
  unique(race_id, user_id, event)
);
