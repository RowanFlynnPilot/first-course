-- First Course, Phase 1: the cook log.
--
-- This is the only stateful table. Unlocks, learned skills, mastery and the
-- "kept" total are all derived from it in app/src/lib/progress.ts and cost.ts,
-- so there is nothing else to keep in sync.
--
-- recipe_id matches Recipe.id in app/src/curriculum/recipes.ts. Recipes live in
-- the repo, not the database, so there is no foreign key; the app throws on a
-- row whose recipe id the menu no longer has. Never rename a recipe id.

create table public.cook_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipe_id text not null,
  -- The cook's local calendar date, sent by the client. No default on purpose:
  -- current_date is UTC and would misdate an evening cook in Central time.
  cooked_on date not null,
  -- 1 = Rough, 2 = Decent, 3 = Nailed it.
  rating smallint not null check (rating between 1 and 3),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index cook_logs_user_created_idx on public.cook_logs (user_id, created_at);

alter table public.cook_logs enable row level security;

-- The log is append-only in Phase 1: no update or delete policies, no UI for either.
grant select, insert on public.cook_logs to authenticated;

create policy "Cooks read their own log"
  on public.cook_logs for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Cooks add to their own log"
  on public.cook_logs for insert
  to authenticated
  with check ((select auth.uid()) = user_id);
