-- First Course: the character creator and extras.
--
-- The look grows from skin and hair color to five choices, each an index into
-- a list in app/src/components/chefSprites.ts: SKIN_TONES (now 7), HAIR_COLORS
-- (now 9), HAIR_STYLES (4), FACIAL_HAIR (4) and GLASSES (3). New options are
-- appended, so the skin and hair a chef already has keep their meaning.
--
-- Extras are things the chef wears over the rank's outfit (a tool in hand,
-- clogs, a towel, a patch). Which ones a cook has earned is derived from the
-- cook log in app/src/lib/extras.ts, like badges, and is never stored. This
-- column holds only the ids the cook chose to wear, at most one per slot,
-- which the app checks; there are four slots.
--
-- Rank still decides the hat and the outfit. Existing chefs get the defaults:
-- short hair, no facial hair, no glasses, no extras.

alter table public.chefs
  drop constraint chefs_skin_check,
  drop constraint chefs_hair_check;

alter table public.chefs
  add constraint chefs_skin_check check (skin between 0 and 6),
  add constraint chefs_hair_check check (hair between 0 and 8),
  add column hair_style smallint not null default 0 check (hair_style between 0 and 3),
  add column facial_hair smallint not null default 0 check (facial_hair between 0 and 3),
  add column glasses smallint not null default 0 check (glasses between 0 and 2),
  add column extras text[] not null default '{}' check (cardinality(extras) <= 4);

-- The new choices can be changed like the old ones. Insert is already granted
-- on the whole table (00002).
grant update (hair_style, facial_hair, glasses, extras) on public.chefs to authenticated;
