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
- **All 31, again** (October 9, 2026): smash-burger hands that pressed and
  seasoned raw beef then built the burger; a spatula that spread raw beef
  stirring the cooked sauce unwashed, and the cook at the sink with the
  burner on medium-high; hands not washed after tipping a raw-meat bowl;
  paper towels pulled off the roll with raw-chicken hands; an 8-pound
  cast-iron skillet tipped one-handed over a saucepan; "within 2 days" counted
  from the wrong day; rice reheated more than once; a 20-minute simmer with
  no timer, and "stir halfway" on one timer that rings only at the end;
  broth cans with no can opener; a second sheet pan the kit does not have;
  and stated times an experienced cook's. Each became a rule in "Writing a
  recipe", and the cans, the rice and the times a test.

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

The eighth review (October 9, 2026) found the words wider than the code, and
the code kept: a recipe rests once it has any good cook, counted from its
last cook of any rating (a Rough cook yesterday of a dish learned in August
rests it too), and a Rough cook keeps its menu-order place among the recipes
without a good cook rather than jumping ahead of an earlier one never
cooked. Tests now tell the two readings apart.

### Meat past its day (October 9, 2026)

Bought recipes are suggested fresh meat first, soonest due leading, then
those with no day, then meat past its day, which is never "ready tonight":
before, a past date sorted first and the card nagged about it while fresh
meat waited. The card says "Unless you froze it, the meat is past its days:
throw it out", since the app's own rule already said when to cook it by and
a sell-by date often runs past it, and "I froze it" clears the day (Done
shopping advises freezing, and the app had no way to hear it).

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

### Skills earn 80 XP (Rowan's call, October 9, 2026)

At 50 XP a skill, night one (the eggs, a Decent cook) earned 70 XP, 30 short
of level 2: the first cook had no level-up. At 80, any first good cook
reaches level 2, mastering the First course lands at line cook (1,660 XP,
level 6), every recipe cooked once reaches level 9, and a perfect run tops
out at 18,990 XP, still level 19. Everyone was re-scored, with no migration.

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

### The kit's checks live on the phone too (Rowan's call, October 9, 2026)

The list's kit aisle saved each check to Supabase at once, so in a store with
no signal it said "Saving…" for 15 seconds and then failed, under a note that
the list works with no signal. Kit checks now stay on the phone with the
groceries, and `finish_shopping` puts them in the kit (00010). The cart also
keeps the recipes it was checked for, so checks never stand for a different
list: a recipe planned on another device found its chicken already checked
off, and Done shopping marked it bought.

## Times

### A beginner's pace (Rowan's call, October 9, 2026)

The recipe review of October 9, 2026 found 13 recipes a beginner would
overrun by 15 minutes or more (the salad's 15 minutes is 25 to 30 for a
first knife; General Tso's 75 is 90 to 95), so "start now and eat around"
ran early. Rowan chose a beginner's pace over a range: those totals, and
the work minutes with them, were raised, and every total is at least its
longest timer plus 5 minutes.

## Migrations

### When each went live

00001 to 00005 on October 4, 2026, 00006 and 00007 on October 5, 00008 on
October 6, and 00009 on October 9. A schema dump after 00008 showed `anon`
with no table grants, `authenticated` with exactly the grants CLAUDE.md
describes, and the limits in place. 00010 was written and tested on October
9, 2026, and is not yet live.

### Why 00010 (October 9, 2026)

The security review of October 9, 2026 found 00008's "no new function
exposed by default" did not hold: a per-schema default privilege can only
add to the built-in one, which grants execute on every new function to
PUBLIC, so a future function that forgot its own revoke would be callable
by anyone through `/rpc`. 00010 revokes it for the role that runs the
migrations, with no schema. It also shuts `grocery_checks`, which nothing
reads or writes since the cart moved to the phone but which anyone signed in
could still fill, and takes the kit at the register.

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
- **00010** (October 9, 2026): on a throwaway stack left at the exposing
  default, 8 checks before it and 56 after, all passing: the live app's
  four-argument call and the one before it still work (seen checks
  ignored); the new call puts staples in the pantry and kit in the kit, as
  the caller's own rows, ignoring duplicates, and an id outside 00008's shape
  rolls the whole call back; a recipe already shopped keeps its first date,
  and a frozen one (no date) stays without; only the new signature exists,
  for `authenticated` only; `grocery_checks` refuses every privilege to
  `anon` and `authenticated` while its rows stay; a new function created by
  `postgres` is executable by neither, and a new table is exposed to nobody;
  and every other call the app makes, the 00006 trigger and 00008's limits
  still hold. The harness used the app's own `@supabase/auth-js` and
  `@supabase/postgrest-js`.

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

### The Supabase clients, reviewed (October 9, 2026)

The eighth review checked the two clients that replaced supabase-js against
their source. Four things changed:

- The Data API client retried a failed read three more times, a timeout
  included, so a read on weak signal took a minute to fail: `retry: false`.
- With no signal and a session past its hour, the auth client reported no
  session, and the app showed "Sign in" to a cook still signed in: the app
  now asks again, sees the renewal failed for want of signal, and says "No
  connection", opening by itself once the session renews.
- `linkOwner` asked the auth client about a link's token, and the auth
  client signs out the cook signed in here when the server says a token's
  session is gone: anyone could send a link that signed the phone out. It is
  a plain request now.
- A request with no session to send went out with the publishable key
  instead, and came back as a raw permission error: it now fails as "No
  connection".

## Build history

- **Phase 2**, the shop and the kit, was built on October 4, 2026.
- **Phase 3**, cook mode hardened and leveling, was built on October 4, 2026.
- **The eighth review** (October 9, 2026): five reviewers (logic, security,
  what a beginner sees, the recipes, tests and docs) and the fixes above:
  the Supabase clients, meat past its day, the kit's checks on the phone,
  leftovers, the cook in progress, timers kept per account, a beginner's
  times, 80 XP a skill, and migration 00010.
