-- SpEdGalexii Database Schema
-- Run this in your Supabase SQL Editor to set up the tables

-- Enable Row Level Security
alter default privileges in schema public grant all on tables to postgres, anon, authenticated, service_role;

-- Profiles table (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  subscription_tier text check (subscription_tier in ('free', 'monthly', 'yearly', 'bundle')),
  subscription_status text check (subscription_status in ('active', 'canceled', 'past_due')),
  stripe_customer_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Deep Dive Sessions (analysis sessions for students)
create table if not exists public.deep_dive_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  student_id text not null,
  student_name text,
  file_count integer default 0,
  analysis_complete boolean default false,
  alert_count integer,
  critical_count integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '30 days')
);

-- Deep Dive Files (PDFs uploaded for analysis)
create table if not exists public.deep_dive_files (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.deep_dive_sessions on delete cascade not null,
  user_id uuid references auth.users on delete cascade not null,
  file_name text not null,
  file_size bigint not null,
  file_type text not null,
  storage_path text not null,
  created_at timestamptz default now()
);

-- Output Files (analysis results, exports)
create table if not exists public.output_files (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  session_id uuid references public.deep_dive_sessions on delete set null,
  name text not null,
  type text check (type in ('pdf', 'xlsx', 'csv', 'md', 'json')) not null,
  size text not null,
  module text not null,
  storage_path text,
  data text, -- Base64 encoded for small files
  created_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '30 days')
);

-- Indexes for performance
create index if not exists idx_sessions_user_id on public.deep_dive_sessions(user_id);
create index if not exists idx_sessions_student_id on public.deep_dive_sessions(student_id);
create index if not exists idx_files_session_id on public.deep_dive_files(session_id);
create index if not exists idx_output_user_id on public.output_files(user_id);
create index if not exists idx_output_expires on public.output_files(expires_at);

-- Row Level Security Policies
alter table public.profiles enable row level security;
alter table public.deep_dive_sessions enable row level security;
alter table public.deep_dive_files enable row level security;
alter table public.output_files enable row level security;

-- Profiles: Users can only read/update their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Sessions: Users can only access their own sessions
create policy "Users can view own sessions" on public.deep_dive_sessions
  for select using (auth.uid() = user_id);

create policy "Users can insert own sessions" on public.deep_dive_sessions
  for insert with check (auth.uid() = user_id);

create policy "Users can update own sessions" on public.deep_dive_sessions
  for update using (auth.uid() = user_id);

create policy "Users can delete own sessions" on public.deep_dive_sessions
  for delete using (auth.uid() = user_id);

-- Files: Users can only access their own files
create policy "Users can view own files" on public.deep_dive_files
  for select using (auth.uid() = user_id);

create policy "Users can insert own files" on public.deep_dive_files
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own files" on public.deep_dive_files
  for delete using (auth.uid() = user_id);

-- Output Files: Users can only access their own outputs
create policy "Users can view own outputs" on public.output_files
  for select using (auth.uid() = user_id);

create policy "Users can insert own outputs" on public.output_files
  for insert with check (auth.uid() = user_id);

create policy "Users can delete own outputs" on public.output_files
  for delete using (auth.uid() = user_id);

-- Trigger to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, subscription_tier)
  values (new.id, new.email, 'free');
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to clean up expired files (run via cron)
create or replace function public.cleanup_expired_files()
returns void as $$
begin
  -- Delete expired output files
  delete from public.output_files where expires_at < now();
  
  -- Delete expired sessions and their files (cascade)
  delete from public.deep_dive_sessions where expires_at < now();
end;
$$ language plpgsql security definer;

-- Storage bucket for IEP files (create in Supabase dashboard)
-- Bucket name: iep-documents
-- Public: false
-- File size limit: 50MB
-- Allowed MIME types: application/pdf
