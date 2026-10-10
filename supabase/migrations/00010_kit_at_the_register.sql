-- First Course: the kit checked off in the store, and two doors shut.
--
-- The grocery list ends with the kit the week's plan still needs. Its checks
-- now stay on the phone like the grocery checks (a store has the weakest
-- signal), and reach the database in the one finish_shopping call, which puts
-- them in the kit in the same transaction as the pantry and the plan.
--
-- Two doors shut:
--
-- * New functions. 00008 revoked execute on new functions in schema public,
--   but a per-schema default can only add to the built-in one, which grants
--   execute to PUBLIC. Revoking it for the role that runs the migrations,
--   with no schema, takes it away, so a function anon or authenticated may
--   call says so with its own grant (as finish_shopping does).
-- * grocery_checks. The cart's checks live on the phone (October 9, 2026),
--   so nothing reads or writes the table, and anyone signed in could still
--   fill it. Every grant on it goes; the table and its rows stay.
--
-- An installed app keeps running the JavaScript it loaded, so the app before
-- this one keeps working: finish_shopping still takes seen_checks (and
-- ignores it), and everything after shopped_recipes has a default.
-- Done shopping run twice for one recipe (a retry, or a second device) keeps
-- the first date, the day the meat was bought.

alter default privileges for role postgres revoke execute on functions from public;

revoke all on public.grocery_checks from anon, authenticated;

drop function public.finish_shopping(text[], text[], text[], date);

create function public.finish_shopping(
  bought_staples text[],
  shopped_recipes text[],
  bought_on date default null,
  bought_kit text[] default '{}',
  seen_checks text[] default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.pantry_items (ingredient_id)
  select distinct unnest(bought_staples)
  on conflict do nothing;

  insert into public.kit_items (equipment_id)
  select distinct unnest(bought_kit)
  on conflict do nothing;

  update public.plan_items
  set shopped = true, shopped_on = case when shopped then shopped_on else bought_on end
  where user_id = (select auth.uid()) and recipe_id = any(shopped_recipes);
$$;

revoke execute on function public.finish_shopping(text[], text[], date, text[], text[]) from public, anon;
grant execute on function public.finish_shopping(text[], text[], date, text[], text[]) to authenticated;
