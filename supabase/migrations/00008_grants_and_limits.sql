-- First Course: the grants the migrations meant, and limits on what a row can hold.
--
-- Grants. Every migration grants each privilege explicitly, column by column
-- where only some columns may change (a cook's recipe never does). But the
-- live project was made with the dashboard's default of exposing new tables,
-- which grants everything on every table to anon and authenticated, so none
-- of those column grants held there (a schema dump on October 6, 2026 showed
-- GRANT ALL to both). Row-level security kept every cook to their own rows
-- throughout. This takes everything back from anon and authenticated, grants
-- again exactly what the app uses, and stops new tables and functions from
-- being exposed by default.
--
-- Limits. Nothing bounded the size of a note or the shape of an id, so one
-- account could fill the database, or write a row the app cannot read (an
-- unknown id, a five-digit year), which would lock that cook out of their own
-- kitchen. The ids are the typed ids in app/src/curriculum: lowercase words
-- joined by hyphens.

-- ── Grants ──

revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated, public;
revoke all on all sequences in schema public from anon, authenticated;

alter default privileges for role postgres in schema public revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated, public;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated;

grant select, insert, delete on public.cook_logs to authenticated;
grant update (cooked_on, rating, notes) on public.cook_logs to authenticated;

grant select, insert on public.chefs to authenticated;
grant update (name, skin, hair, hair_style, facial_hair, glasses, extras) on public.chefs to authenticated;

grant select, insert, delete on public.plan_items to authenticated;
grant update (shopped) on public.plan_items to authenticated;

grant select, insert, delete on public.pantry_items to authenticated;
grant select, insert, delete on public.grocery_checks to authenticated;
grant select, insert, delete on public.kit_items to authenticated;

-- An upsert sets every column it was sent, so a price correction needs both.
grant select, insert, delete on public.price_overrides to authenticated;
grant update (ingredient_id, price_cents) on public.price_overrides to authenticated;

grant execute on function public.finish_shopping(text[], text[], text[]) to authenticated;
-- take_cooked_recipe_off_plan() runs only as the cook_logs trigger: no grant.

-- ── Limits ──

alter table public.cook_logs
  add constraint cook_logs_notes_length check (char_length(notes) <= 2000),
  add constraint cook_logs_recipe_id_format check (recipe_id ~ '^[a-z0-9-]{1,64}$'),
  -- The app reads dates as YYYY-MM-DD: a four-digit year.
  add constraint cook_logs_cooked_on_range check (cooked_on between date '1900-01-01' and date '2999-12-31');

alter table public.plan_items
  add constraint plan_items_recipe_id_format check (recipe_id ~ '^[a-z0-9-]{1,64}$');

alter table public.pantry_items
  add constraint pantry_items_ingredient_id_format check (ingredient_id ~ '^[a-z0-9-]{1,64}$');

alter table public.grocery_checks
  add constraint grocery_checks_ingredient_id_format check (ingredient_id ~ '^[a-z0-9-]{1,64}$');

alter table public.price_overrides
  add constraint price_overrides_ingredient_id_format check (ingredient_id ~ '^[a-z0-9-]{1,64}$'),
  -- A package costs less than $1,000; the app says so before it gets here.
  add constraint price_overrides_price_cents_max check (price_cents <= 100000);

alter table public.kit_items
  add constraint kit_items_equipment_id_format check (equipment_id ~ '^[a-z0-9-]{1,64}$');

-- At most four extras (00005), each an extra id.
alter table public.chefs
  add constraint chefs_extras_format check (array_to_string(extras, ' ') ~ '^([a-z0-9-]{1,32}( |$))*$');
