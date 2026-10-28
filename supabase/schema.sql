-- KIET SPL schema. Run this entire file in Supabase SQL Editor.
-- Public users can read; only authenticated users can write.
-- IMPORTANT: Disable public sign-ups in Supabase Auth and create only the admin account manually.

create extension if not exists pgcrypto;

create table if not exists public.hostels (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.sports (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  sport_id uuid not null references public.sports(id) on delete restrict,
  hostel_id uuid not null references public.hostels(id) on delete restrict,
  medal text not null check (medal in ('Gold', 'Silver')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (sport_id, medal)
);

create table if not exists public.result_students (
  id uuid primary key default gen_random_uuid(),
  result_id uuid not null references public.results(id) on delete cascade,
  name text not null,
  year text not null check (year in ('1st Year', '2nd Year', '3rd Year', '4th Year')),
  created_at timestamptz not null default now()
);

create index if not exists results_sport_id_idx on public.results(sport_id);
create index if not exists results_hostel_id_idx on public.results(hostel_id);
create index if not exists result_students_result_id_idx on public.result_students(result_id);

insert into public.hostels (name) values
  ('Aryabhatta'), ('Vivekanand'), ('CV Raman'), ('Tagore'), ('Chandragupt'), ('Abhimanyu')
on conflict (name) do nothing;

insert into public.sports (name) values
  ('Badminton Singles'),
  ('Badminton Doubles'),
  ('Yoga'),
  ('Chess'),
  ('Carrom'),
  ('Table Tennis'),
  ('Pool'),
  ('Shooting'),
  ('Cricket'),
  ('Kabaddi'),
  ('Football'),
  ('Volleyball'),
  ('Basketball'),
  ('Tug of War'),
  ('Kho Kho'),
  ('100m Race'),
  ('200m Race'),
  ('400m Relay Race'),
  ('High Jump'),
  ('Long Jump'),
  ('Discus Throw'),
  ('Shot Put'),
  ('Javelin Throw'),
  ('Lawn Tennis')
on conflict (name) do nothing;

alter table public.hostels enable row level security;
alter table public.sports enable row level security;
alter table public.results enable row level security;
alter table public.result_students enable row level security;

-- Public read access for the student leaderboard.
drop policy if exists "Anyone can read hostels" on public.hostels;
create policy "Anyone can read hostels" on public.hostels for select using (true);
drop policy if exists "Anyone can read sports" on public.sports;
create policy "Anyone can read sports" on public.sports for select using (true);
drop policy if exists "Anyone can read results" on public.results;
create policy "Anyone can read results" on public.results for select using (true);
drop policy if exists "Anyone can read result students" on public.result_students;
create policy "Anyone can read result students" on public.result_students for select using (true);

-- Writes are permitted only to authenticated accounts.
-- Keep Supabase public sign-ups disabled and create the admin account yourself.
drop policy if exists "Authenticated users manage hostels" on public.hostels;
create policy "Authenticated users manage hostels" on public.hostels for all to authenticated using (true) with check (true);
drop policy if exists "Authenticated users manage sports" on public.sports;
create policy "Authenticated users manage sports" on public.sports for all to authenticated using (true) with check (true);
drop policy if exists "Authenticated users manage results" on public.results;
create policy "Authenticated users manage results" on public.results for all to authenticated using (true) with check (true);
drop policy if exists "Authenticated users manage result students" on public.result_students;
create policy "Authenticated users manage result students" on public.result_students for all to authenticated using (true) with check (true);

grant usage on schema public to anon, authenticated;
grant select on public.hostels, public.sports, public.results, public.result_students to anon, authenticated;
grant insert, update, delete on public.hostels, public.sports, public.results, public.result_students to authenticated;
