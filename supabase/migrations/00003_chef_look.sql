-- First Course: the chef's look, and editing the chef.
--
-- The chef is drawn as a pixel sprite. Rank decides the hat and outfit; these
-- two columns are the only choices a cook makes: an index into SKIN_TONES and
-- HAIR_COLORS in app/src/components/chefSprites.ts (five of each, 0 to 4).
-- Existing chefs get the defaults and can change them on the chef sheet.

alter table public.chefs
  add column skin smallint not null default 1 check (skin between 0 and 4),
  add column hair smallint not null default 1 check (hair between 0 and 4);

-- A chef can now be renamed and restyled. Still no delete.
grant update (name, skin, hair) on public.chefs to authenticated;

create policy "Cooks edit their own chef"
  on public.chefs for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
