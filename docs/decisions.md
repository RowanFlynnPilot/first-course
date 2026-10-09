# Decisions

The record behind CLAUDE.md. CLAUDE.md says what the rules are and how things
work today; this file keeps what changed, when, and why, filed by topic with
the dates. Where CLAUDE.md says "(Rowan's call; docs/decisions.md)", the call
and its reason are here.

## The curriculum

### The courses written ahead (October 4, 2026)

The Second, Third and Fourth courses and the usual were all written on
October 4, 2026, ahead of the "one course ahead of the cook" pace, at Rowan's
request. It was one of four decisions that changed that day, all at Rowan's
request; the others are under "Equipment has typed ids", "Pixel art and
motion" and "The cook log is editable" below.

### Equipment has typed ids (October 4, 2026)

Equipment got typed ids, like ingredients, on October 4, 2026, one of that
day's decisions at Rowan's request.

### Courses are gates (Rowan's call, October 5, 2026)

Every recipe in the Second, Third and Fourth courses requires a skill taught
in the course just before. Before that, five Fourth-course dishes opened
during the Second course and shallow frying could be a ninth recipe. The oven
fries moved to the Second course, and the pan pizza, the cutlets and the
chicken tikka to the Third; carbonara now needs the aioli's egg separating and
the pan sauce's spooning off fat, and the green curry needs the masala base's
cue. The courses now hold 6, 7, 8 and 3 recipes, and the Fourth course adds
no new kit or spice.

### No eighths (October 5 and 6, 2026)

On October 5, 2026 the eggs' ⅛ teaspoon of pepper plus the salad's ¼ crashed
This week; eighths were added, then dropped on October 6 when the pepper
became ¼.

### Sides ride on an order (Rowan's call, October 6, 2026)

On October 6, 2026 the salad was briefly a $12 entrée; Rowan chose sides that
ride on an order instead (`delivery.side`): a side is compared with adding it
to an order you would place anyway, with no delivery fee of its own.

### The usual moves above the First course (Rowan's call, October 9, 2026)

The usual sits below the Fourth course until one of its dishes is in reach,
then moves above the First course, so a beginner meets what they can cook
before seven locked plates.

### The read-backs (October 2026)

Someone read every step as a person who has never cooked. What each
read-back found:

- **The Second and Third courses**: burners never turned off, raw-meat hands
  on the salt box, and no plan for a second batch; all three became rules in
  "Writing a recipe".
- **The Fourth course**: vegetables still on the board when raw meat landed
  on it (in the shipped chicken stir-fry too), plastic wrap and the fridge
  door touched with raw hands, cutlets too big for the pan, a thermometer tip
  reading the oil, and an electric burner still hot under the carbonara; the
  first four became rules, and the last is why a pan comes off the burner
  before eggs go in.
- **The usual**: the meat out of the fridge for most of an hour, hot skillet
  handles held bare, a "30 minutes left" cue on the wrong step, a cutting
  board rested on a 500°F pan, and the wrong kind of tamarind; those became
  rules too.
- **The spice guide**: it contradicted the recipes on blooming times, where
  cumin goes in the dal, and how much pepper flakes the aglio uses, plus a
  Diamond Crystal salt conversion that was too high.

## The menu's suggestion and the plan

### What to cook next (Rowan's call, October 6, 2026)

The suggestion order in `nextRecipe` (CLAUDE.md, "The rules, precisely") was
Rowan's call on October 6, 2026: a year-long simulation found the menu
running dry for the keen cook, re-suggesting the dish just made, and a
once-a-week cook first reaching a dish of the usual around week 46.

### Resting a recipe cooked well (Rowan's call, October 9, 2026)

As CLAUDE.md had it: "A recipe cooked well (Decent or better) in the last
`REST_DAYS` (7) goes to the back, so the suggestion is never what was cooked
well yesterday; a recipe with only Rough cooks skips the rest, since its
skill is still the way on (Rowan's call, October 9, 2026)."

### Planning ahead of what is open (Rowan's call, October 9, 2026)

`plannable` lets a locked recipe on the plan once every recipe on its way
there is planned. Week one had only a side and breakfast open, so the first
shop could not cover a dinner.

## Leveling

### The best five cooks earn XP (Rowan's call, October 6, 2026)

Only a recipe's best 5 cooks earn XP (`XP_COOKS_PER_RECIPE`). With the first
five counting, a cook who rated each recipe Decent four times and Nailed it
once topped out at 14,510 XP, level 17, short of executive chef at 15,300,
and the keen cook's XP stopped by week 40.

### Pacing as simulated (October 6, 2026)

Over a year, five seeds each:

- At 2 to 3 cooks a week (about a third Nailed it): line cook in weeks 8 to
  11, sous chef in weeks 22 to 31, head chef in weeks 43 to 50. A stricter
  rater (a fifth Nailed it) reaches sous chef around week 31 and no head chef
  in the year.
- About once a week: prep cook by week 10, line cook by week 52.
- 4 to 5 a week: head chef by week 26; with best-five XP, executive chef in
  weeks 40 to 47.
- The usual starts coming into reach around line cook.

## Cost

### Two counted servings (Rowan approved, October 5, 2026)

Until October 5, 2026 every serving counted, so one six-serving ragù kept
$150 and the "$100 kept" badge came almost free. Rowan approved the cap of
two (`COUNTED_SERVINGS`).

## Badges

### 31 badges (October 6, 2026)

There have been 31 badges since October 6, 2026. The fifteen before October 5
all arrived by about week 8; the 26 after it by about week 21 for a regular
cook; the five mastery badges land in weeks 22 to 52.

## Design and the chef

### Extras over the outfit (Rowan's call, October 4, 2026)

Extras are drawn over the outfit and never replace it, so the sprite always
shows the rank. Locked decision 12 records it.

### Pixel art and motion (October 4, 2026)

On October 4, 2026 Rowan relaxed the pixel-art rule to include badges (it had
been the chef sprite only), and the same day motion was relaxed from two
pieces to the list now in CLAUDE.md under Design. Both were among that day's
decisions at Rowan's request.

### Plain notices are cobalt (Rowan's call, October 9, 2026)

Yolk on every notice had stopped meaning anything, so a plain notice is
`.notice-info`, with a cobalt edge.

## The cook log and catching up

### The cook log is editable (October 4, 2026)

The cook log stopped being append-only on October 4, 2026, at Rowan's
request: a cook's date, rating and notes can change, and a cook can be
deleted (never its recipe).

### A catch-up and a cook just saved (October 6, 2026)

Before October 6, 2026 a catch-up could take a cook just saved off the
screen, inviting a second log. How a catch-up is handled now is in
CLAUDE.md, under "The app catches up after a while away".

## The shop

### Done shopping keeps the plan (00006, October 5, 2026)

Migration `00006_keep_the_plan.sql` (October 5, 2026) changed two things,
because clearing the plan at "Done shopping" emptied This week right when the
food was in the fridge: `finish_shopping()` marks the plan shopped instead of
deleting it, and saving a cook takes its recipe off the plan.

### The cart's checks live on the phone (Rowan's call, October 9, 2026)

One bar of signal had meant "Saving…" on line after line. The checks moved to
the phone (`lib/checks.ts`) and reach Supabase together in `finish_shopping`;
the cost is that a second device does not see checks live.

### Dating the shop (00009, October 9, 2026)

Migration `00009_shopped_on.sql` (October 9, 2026) dates the shop, because
"Groceries bought" had no date: chicken bought ten days ago still said "Start
cooking", and raw meat could wait until the end of the week.

## Migrations

### When each went live

00001 to 00005 on October 4, 2026, 00006 and 00007 on October 5, 00008 on
October 6. A schema dump afterwards showed `anon` with no table grants,
`authenticated` with exactly the grants CLAUDE.md describes, and the limits
in place. 00009 was written and tested on October 9, 2026, and is not yet
live.

### Why 00008 (October 6, 2026)

`00008_grants_and_limits.sql` fixed what a read-only schema dump of the live
project showed on October 6: the project was made with the dashboard's
default of exposing new tables, which granted everything (truncate included)
on every table to `anon` and `authenticated`, so none of the column grants in
00001 to 00006 held live (a cook's recipe could be changed through the API).
Row-level security kept every cook to their own rows throughout.

### The throwaway-stack tests

- **00004**: before the push, it ran on a throwaway local Supabase stack
  (Postgres 17, PostgREST, Auth) with `auto_expose_new_tables = false`, and a
  script made the app's calls through supabase-js as two cooks and as anon:
  own rows only, anon refused everywhere, idempotent adds, no recipe change
  on a cook, the rating and price checks, and `finish_shopping` leaving the
  other cook's rows alone.
- **00005**: 18 checks (defaults for old chefs, every new column, the range
  checks, `user_id` and `created_at` refused, own rows only, anon refused).
- **00006**: checked on a throwaway stack first (30 checks: Done shopping
  keeps the plan and marks only the caller's rows shopped, a recipe added
  afterwards is not shopped, saving a cook takes only that cook's recipe off
  only their plan, a cook of an unplanned recipe still saves, `shopped` is the
  only column that updates, the trigger function is not callable, anon
  refused).
- **00007**: 14 checks: only the listed recipes are marked shopped and only
  the seen ticks cleared, a recipe and a tick added elsewhere survive, the
  one-argument function is gone, anon refused, the 00006 trigger still fires,
  and a cook can carry its own id, which a second insert refuses with 23505.
- **00008**: checked on a throwaway stack left at the exposing default, as
  the live project is: 26 checks before it, showing the recipe change getting
  through; 36 after: every call the app makes still works, the recipe,
  `created_at` and `added_at` updates are refused, anon is refused, every
  limit holds, and a new table is exposed to nobody.
- **00009** (October 9, 2026): on a throwaway stack left at the exposing
  default, as the live project is, 36 checks passed: the column and its
  four-digit-year limit, a cook updating only their own `shopped_on`, the new
  four-argument `finish_shopping` marking only the caller's listed recipes
  with the date, the old app's three-argument call still finding it (the date
  defaults to null), the three-argument function gone, anon refused, the old
  and new "Put it back on the list" both working, `recipe_id`, `added_at` and
  `user_id` still refused, the 00006 trigger still firing, and 00008's limits
  intact.

## Auth and security

### Email confirmation (October 4, 2026)

Email confirmation was turned on for the live project on October 4, 2026, by
pushing a throwaway `config.toml` that declared only that setting.

### The security review (October 6, 2026)

Its findings and open items stay in CLAUDE.md, under "Security, as reviewed
on October 6, 2026".

### Whose link it is (October 9, 2026)

Until October 9, 2026 the app decoded a link's token to name its account in
the "Switch accounts?" prompt, so a forged token could name any email there.
Since then whose link it is comes from Supabase (`linkOwner`, `auth.getUser`
with the link's token).

## Build history

- **Phase 2**, the shop and the kit, was built on October 4, 2026.
- **Phase 3**, cook mode hardened and leveling, was built on October 4, 2026.
