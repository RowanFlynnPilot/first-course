-- First Course: "Done shopping" touches only what this device saw.
--
-- finish_shopping() used to mark every plan row shopped and delete every
-- grocery check. With the app open on two devices, a recipe added on the
-- laptop after the phone loaded its list was marked bought without ever
-- being on a list, and a tick made elsewhere was wiped. Now the app passes
-- the recipes its list covered and the ticks it showed, and only those
-- change. Anything another device added meanwhile is left alone.

drop function public.finish_shopping(text[]);

create function public.finish_shopping(bought_staples text[], shopped_recipes text[], seen_checks text[])
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

  update public.plan_items set shopped = true
  where user_id = (select auth.uid()) and recipe_id = any(shopped_recipes);
$$;

revoke execute on function public.finish_shopping(text[], text[], text[]) from public, anon;
grant execute on function public.finish_shopping(text[], text[], text[]) to authenticated;
