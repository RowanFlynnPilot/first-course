-- First Course: the plan outlives the shop.
--
-- Until now "Done shopping" cleared the plan, right when the food was in the
-- fridge, so This week went blank before anything was cooked. Now:
--
-- - "Done shopping" marks the week's plan as shopped instead of deleting it.
--   The grocery list counts only recipes not yet shopped for, so adding a
--   recipe later makes a list of just what it needs.
-- - Saving a cook takes its recipe off the plan, in the same transaction as
--   the insert, so a cooked recipe never lingers on the next week's list.
--
-- Nothing derived is stored: shopped is a fact about the cook's week, like
-- the plan itself.

-- ── Shopped: the groceries for this recipe are bought. ──

alter table public.plan_items
  add column shopped boolean not null default false;

-- finish_shopping runs as the cook (security invoker), so it needs the update
-- grant and an update policy. Only shopped can change; a recipe on the plan
-- is never renamed into another.
grant update (shopped) on public.plan_items to authenticated;

create policy "Cooks mark their own plan shopped"
  on public.plan_items for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── "Done shopping", in one transaction ──
-- Every bought staple goes into the pantry, the checks are cleared, and the
-- plan is marked shopped. Replacing the function keeps its grants from 00004:
-- authenticated may execute it, public and anon may not.

create or replace function public.finish_shopping(bought_staples text[])
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.pantry_items (ingredient_id)
  select distinct unnest(bought_staples)
  on conflict do nothing;

  delete from public.grocery_checks where user_id = (select auth.uid());

  update public.plan_items set shopped = true where user_id = (select auth.uid());
$$;

-- ── A cook takes its recipe off the plan ──
-- Any cook, Rough included: the groceries are used either way. Security
-- invoker, so the delete runs as the cook under the plan's own-rows policy.
-- Nobody calls this function directly; a trigger does not need the execute
-- grant, so it is revoked from everyone.

create function public.take_cooked_recipe_off_plan()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  delete from public.plan_items
  where user_id = new.user_id and recipe_id = new.recipe_id;
  return null;
end;
$$;

revoke execute on function public.take_cooked_recipe_off_plan() from public, anon, authenticated;

create trigger take_cooked_recipe_off_plan
  after insert on public.cook_logs
  for each row
  execute function public.take_cooked_recipe_off_plan();
