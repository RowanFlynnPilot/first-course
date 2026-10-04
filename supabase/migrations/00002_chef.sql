-- First Course: the chef.
--
-- One row per account, holding the chef's name and nothing else. XP, level,
-- rank and stats are derived from cook_logs in app/src/lib/leveling.ts, so a
-- change to the XP rules re-scores everyone with no data migration.

create table public.chefs (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (name = btrim(name) and char_length(name) between 1 and 24),
  created_at timestamptz not null default now()
);

alter table public.chefs enable row level security;

-- Named once. No update or delete policies, no UI for either.
grant select, insert on public.chefs to authenticated;

create policy "Cooks read their own chef"
  on public.chefs for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Cooks name their own chef"
  on public.chefs for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
