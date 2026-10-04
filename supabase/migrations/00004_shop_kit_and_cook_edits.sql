-- First Course, Phase 2: the shop, the kit, and editing the cook log.
--
-- Every table here is keyed by user_id, with the same own-rows RLS as
-- cook_logs, and every privilege is granted explicitly: a new Supabase project
-- exposes nothing to the Data API without a grant.
--
-- The ids are plain text matching typed data in the repo: recipe_id is a
-- Recipe.id (recipes.ts), ingredient_id an IngredientId (ingredients.ts),
-- equipment_id an EquipmentId (equipment.ts). Like cook_logs.recipe_id there
-- are no foreign keys; the app throws on an id the repo no longer has. Never
-- rename an id.
--
-- Nothing derived is stored: the grocery list, packages to buy, the checkout
-- total and what kit a course still needs are all computed in the app.

-- ── The plan: recipes added to this week's shop. One batch per recipe. ──

create table public.plan_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  recipe_id text not null,
  added_at timestamptz not null default now(),
  primary key (user_id, recipe_id)
);

alter table public.plan_items enable row level security;

grant select, insert, delete on public.plan_items to authenticated;

create policy "Cooks read their own plan"
  on public.plan_items for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Cooks add to their own plan"
  on public.plan_items for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Cooks remove from their own plan"
  on public.plan_items for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ── The pantry: staples the cook already has, left off the grocery list. ──

create table public.pantry_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ingredient_id text not null,
  primary key (user_id, ingredient_id)
);

alter table public.pantry_items enable row level security;

grant select, insert, delete on public.pantry_items to authenticated;

create policy "Cooks read their own pantry"
  on public.pantry_items for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Cooks stock their own pantry"
  on public.pantry_items for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Cooks clear their own pantry"
  on public.pantry_items for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ── Grocery checks: what is already in the cart. ──

create table public.grocery_checks (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ingredient_id text not null,
  primary key (user_id, ingredient_id)
);

alter table public.grocery_checks enable row level security;

grant select, insert, delete on public.grocery_checks to authenticated;

create policy "Cooks read their own checks"
  on public.grocery_checks for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Cooks check off their own list"
  on public.grocery_checks for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Cooks uncheck their own list"
  on public.grocery_checks for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ── Price overrides: a package price the cook corrected. ──
-- Saved with an upsert, which updates price_cents on a second correction.
-- PostgREST's upsert sets every column it was sent, so ingredient_id needs
-- the update grant too; it is always set to the value it already has.
-- Deleting an override goes back to the estimate in ingredients.ts.

create table public.price_overrides (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  ingredient_id text not null,
  price_cents integer not null check (price_cents > 0),
  primary key (user_id, ingredient_id)
);

alter table public.price_overrides enable row level security;

grant select, insert, delete on public.price_overrides to authenticated;
grant update (ingredient_id, price_cents) on public.price_overrides to authenticated;

create policy "Cooks read their own prices"
  on public.price_overrides for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Cooks add their own prices"
  on public.price_overrides for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Cooks correct their own prices"
  on public.price_overrides for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Cooks reset their own prices"
  on public.price_overrides for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ── The kit: equipment the cook owns. ──

create table public.kit_items (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  equipment_id text not null,
  primary key (user_id, equipment_id)
);

alter table public.kit_items enable row level security;

grant select, insert, delete on public.kit_items to authenticated;

create policy "Cooks read their own kit"
  on public.kit_items for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Cooks add to their own kit"
  on public.kit_items for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Cooks remove from their own kit"
  on public.kit_items for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ── "Done shopping", in one transaction ──
-- Every bought staple goes into the pantry, then the checks and the plan are
-- cleared. The client passes the staples it bought, because which
-- ingredients are staples is repo data. Security invoker: it runs as the
-- cook, so the grants and RLS above apply to every statement in it.

create function public.finish_shopping(bought_staples text[])
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.pantry_items (ingredient_id)
  select distinct unnest(bought_staples)
  on conflict do nothing;

  delete from public.grocery_checks where user_id = (select auth.uid());

  delete from public.plan_items where user_id = (select auth.uid());
$$;

revoke execute on function public.finish_shopping(text[]) from public, anon;
grant execute on function public.finish_shopping(text[]) to authenticated;

-- ── Editing the cook log ──
-- The log was append-only in Phase 1. A cook can now fix the date, rating or
-- notes of a cook, or remove it. The recipe stays fixed: a cook of a
-- different recipe is a different cook. Progress is derived, so an edit
-- re-scores everything with nothing else to update.

grant update (cooked_on, rating, notes), delete on public.cook_logs to authenticated;

create policy "Cooks edit their own log"
  on public.cook_logs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Cooks remove from their own log"
  on public.cook_logs for delete
  to authenticated
  using ((select auth.uid()) = user_id);
