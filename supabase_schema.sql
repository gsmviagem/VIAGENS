-- Supabase Schema for GSMVIAGEM HUB

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Profiles (extends auth.users transparently if needed)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  role text default 'operator',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Airline Integrations
create type public.integration_status as enum ('active', 'waiting_auth', 'error', 'syncing', 'paused');

create table if not exists public.airline_integrations (
  id uuid default uuid_generate_v4() primary key,
  airline text not null unique, -- 'azul', 'smiles', 'latam'
  status integration_status default 'waiting_auth',
  last_sync timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Airline Sessions (For long-lived cookies/tokens like Smiles SMS 2FA)
create table if not exists public.airline_sessions (
  id uuid default uuid_generate_v4() primary key,
  integration_id uuid references public.airline_integrations(id) on delete cascade not null,
  session_data jsonb not null,
  is_valid boolean default true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Extraction Runs (Logs background robot executions)
create type public.run_status as enum ('running', 'success', 'failed');

create table if not exists public.extraction_runs (
  id uuid default uuid_generate_v4() primary key,
  integration_id uuid references public.airline_integrations(id) on delete cascade not null,
  status run_status default 'running',
  started_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone,
  extracted_count integer default 0,
  logs text,
  error_message text
);

-- 5. Extracted Bookings (The actual emissions captured)
create type public.booking_status as enum ('pending_sync', 'synced', 'error');

create table if not exists public.extracted_bookings (
  id uuid default uuid_generate_v4() primary key,
  airline text not null,
  locator varchar(10) not null,
  passenger_name text not null,
  origin varchar(3) not null,
  destination varchar(3) not null,
  flight_date date not null,
  miles_used integer,
  cash_paid numeric(10, 2),
  taxes numeric(10, 2),
  status booking_status default 'pending_sync',
  capture_date timestamp with time zone default timezone('utc'::text, now()) not null,
  source text,
  notes text,
  unique (airline, locator)
);

-- 6. Flight Searches (Logs of operational searches done in the hub)
create table if not exists public.flight_searches (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete set null,
  origin varchar(3) not null,
  destination varchar(3) not null,
  outbound_date date not null,
  return_date date,
  passengers integer default 1,
  cabin text,
  trip_type text,
  airlines text[], -- e.g. ['azul', 'smiles']
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 7. Flight Search Results
create table if not exists public.flight_search_results (
  id uuid default uuid_generate_v4() primary key,
  search_id uuid references public.flight_searches(id) on delete cascade not null,
  airline text not null,
  flight_number text,
  departure_time timestamp with time zone not null,
  arrival_time timestamp with time zone not null,
  origin varchar(3) not null, -- denormalized for easier query
  destination varchar(3) not null,
  duration text,
  price_cash numeric(10, 2),
  price_miles integer,
  taxes numeric(10, 2),
  availability integer,
  booking_link text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Sync Logs (For Spreadsheet Integrations)
create type public.sync_status as enum ('success', 'failed');

create table if not exists public.sync_logs (
  id uuid default uuid_generate_v4() primary key,
  sync_target text default 'google_sheets',
  status sync_status not null,
  rows_synced integer default 0,
  error_message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 9. System Alerts
create type public.alert_severity as enum ('info', 'warning', 'error');

create table if not exists public.system_alerts (
  id uuid default uuid_generate_v4() primary key,
  severity alert_severity not null,
  message text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 10. Settings (Key-Value store for operational configs)
create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS (Row Level Security) - Basic Setup (Open for now as requested for MVP, typically we'd restrict to auth.uid())
-- For a real production app, appropriate RLS policies should be added here.
