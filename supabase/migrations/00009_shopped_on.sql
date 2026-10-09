-- First Course: the day the groceries were bought.
--
-- "Groceries bought" had no date, so chicken bought ten days ago still said
-- "Start cooking", and a recipe with raw meat could wait until the end of
-- the week. plan_items gains the cook's local date of the shop (decision 10:
-- Postgres's current_date is UTC), set by finish_shopping, so the app can say
-- when the meat should be cooked by and suggest it first.
--
-- An installed app keeps running the JavaScript it loaded, possibly for
-- days, so everything here keeps the app that came before it working:
-- finish_shopping takes the date as a fourth argument with a default (a call
-- with three arguments still finds it), and nothing ties shopped_on to
-- shopped, because the old app's "Put it back on the list" sets only
-- shopped. The app reads shopped_on only while shopped is true.

alter table public.plan_items
  add column shopped_on date,
  -- The app reads dates as YYYY-MM-DD: a four-digit year, as cooked_on (00008).
  add constraint plan_items_shopped_on_range check (shopped_on between date '1900-01-01' and date '2999-12-31');

-- "Put it back on the list" clears the date with the mark.
grant update (shopped_on) on public.plan_items to authenticated;

drop function public.finish_shopping(text[], text[], text[]);

create function public.finish_shopping(
  bought_staples text[],
  shopped_recipes text[],
  seen_checks text[],
  bought_on date default null
)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.pantry_items (ingredient_id)
  select distinct unnest(bought_staples)
  on conflict do nothing;

  delete from public.grocery_checks
  where user_id = (select auth.uid()) and ingredient_id = any(seen_checks);

  update public.plan_items set shopped = true, shopped_on = bought_on
  where user_id = (select auth.uid()) and recipe_id = any(shopped_recipes);
$$;

revoke execute on function public.finish_shopping(text[], text[], text[], date) from public, anon;
grant execute on function public.finish_shopping(text[], text[], text[], date) to authenticated;
