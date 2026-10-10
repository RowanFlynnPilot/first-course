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
- **The rewrites, read again** (October 9, 2026, the ninth review): the
  smash burgers' parchment still peeled off raw beef by hand; timers that
  rang while the cook's hands were in raw meat (the rice in three recipes,
  the double smash's fries); round 8's own fix, tilting the skillet on the
  saucepan's rim, which can tip the saucepan; the ragù's broth never opened
  or measured; the pan-sauce chicken's oven left on; hot tap water to soak
  potatoes, which another recipe warns against. Each became a rule, and
  the cans a stricter test.
- **The tenth read-back** (October 10, 2026): hands that tipped a raw
  marinade into the trash then put on oven mitts and tapped the phone (the
  tikka, four steps before the bowl was washed); the single smash's washed
  hands carrying the raw-beef plate to the fridge and back; a damp towel
  pressed on a blade hot from the pan; 45 minutes of stirring caramelized
  onions in cast iron with the handle as hot as the pan; cooked patties
  moved with the tongs that set the raw balls; no word on a broiler
  flare-up, or on the smoke alarm in nineteen recipes that sear, broil or
  bake at 450°F and up; potatoes, carrots and tomatoes cut with no flat side;
  `done` lines that sent a fork into a 425°F oven; ¼ cup of water ladled
  out of an empty skillet; a silenced rice ring that left the burner on, and
  "the rice stays hot for half an hour" at a beginner's pace; three hands
  to steam broccoli; knives "washed in hot, soapy water" with the board.
  Each became a rule, and the stove fan and the knife a test.

### What a timer says when it rings (Rowan's call, October 9, 2026)

Every timer carries `done`, what the cook does at the ring ("Turn off its
burner and leave the lid on."), shown under the clock, beside the chip on
any other step, and read out with the ring. Before, "turn off the burner"
lived only on the step that started the timer, long gone from the screen
when it rang, and a rice burner or a 425°F oven was left on.

### Allergens (Rowan's call, October 9, 2026)

Every ingredient is tagged with the FDA's nine major allergens for a
typical US supermarket product, and the recipe page says "Contains …" from
them, with a note that products vary. Brand-dependent calls (curry paste
with shrimp, sandwich bread with soy, coconut not a tree nut since the
FDA's January 2025 guidance, refined oils exempt) are explained in
ingredients.ts. Pad thai's peanuts go on the side for anyone who avoids them.

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

### Groceries that age (Rowan's call, October 9, 2026)

Coming back after weeks away, the plan still said "Groceries bought" and
led with cooking. Groceries with no meat that keeps only days are asked
about once they are a week old ("Still have everything it needs?"), and a
bought recipe with such meat and no date is taken as frozen: not ready
tonight, with "Move it to the fridge tonight, and cook it tomorrow." Frozen
is the absence of a date, which only "I froze it" leaves now, rather than a
stored state.

### Thawing (Rowan's call, October 10, 2026)

Frozen meat read "Move it to the fridge tonight, and cook it tomorrow" every
day, forever, and "I froze it" appeared only once the meat was already past
its day, so a cook who froze it as Done shopping advised was told to throw
it out. "I froze it" is now offered while the meat is fresh too, and the
frozen card has "Moved it to the fridge", which dates the recipe tomorrow:
the day it will have thawed, from which its days in the fridge count. Until
then it reads "Thawing in the fridge". A date ahead of today is the thawing
state, so no column was added.

Meat is never asked about any more ("Still have them" restarted the smoked
sausage's two weeks from the day of the answer): any meat has a last day,
and only groceries with no meat are asked about after a week. The
suggestion orders the bought by how they stand: fresh meat (soonest first),
fresh with no day, then to ask about, thawing, frozen, and past.

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

### Pacing as simulated (October 6, 2026; at 50 XP a skill, not re-run at 80)

Over a year, five seeds each, at 50 XP a skill. It was not re-run when
skills went to 80 on October 9, 2026.

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
the phone (`lib/checks.ts`, now `lib/cart.ts`) and reach Supabase together in
`finish_shopping`; the cost is that a second device does not see checks live.

### The cart keeps until Done shopping (Rowan's call, October 10, 2026)

Round 9 forgot a cart after two untouched days, silently. The tenth review
found Done shopping dated the meat by the day the button was tapped, so a
cart checked off Saturday and put away Monday said to cook Saturday's
chicken by Wednesday. The cart now keeps until Done shopping or "Clear the
cart", and remembers when its first grocery that is not a staple was checked
(`since`): the shop is dated by that day. The list says when that was once it
is before today, beside "Clear the cart".

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

CLAUDE.md keeps only the result, under "The schema today". What each
migration changed, and why, is here.

### When each went live

00001 to 00005 on October 4, 2026, 00006 and 00007 on October 5, 00008 on
October 6, and 00009 and 00010 on October 9. A schema dump after 00008
showed `anon` with no table grants, `authenticated` with exactly the grants
CLAUDE.md describes, and the limits in place.

### What each one changed

- **00001** (Phase 1): `cook_logs`, the only table with state; select and
  insert for `authenticated`, own rows only.
- **00002**: `chefs`, one named chef per account.
- **00003**: the chef's skin tone and hair color, and editing the chef
  (update of the name, skin and hair).
- **00004** (Phase 2): `plan_items`, `pantry_items`, `grocery_checks`,
  `price_overrides` and `kit_items`, each keyed by `user_id` and its id, with
  the same own-rows RLS and explicit grants as `cook_logs` (select, insert
  and delete; `price_overrides` also update).
  `finish_shopping(bought_staples)` was "Done shopping" in one transaction
  (security invoker, `authenticated` only): the bought staples into the
  pantry, then the checks and the plan cleared. The cook log became editable: update of `cooked_on`, `rating` and
  `notes` (never `recipe_id`), and delete (see "The cook log is editable").
- **00005**: hairstyle, facial hair, glasses, more skin and hair colors, and
  `extras text[]`, the extras the chef wears.
- **00006**: `plan_items.shopped` (update granted on that column only), and
  `finish_shopping` marks the plan shopped instead of deleting it. An `after
  insert` trigger on `cook_logs` (security invoker, execute revoked from
  everyone) deletes the cook's plan row for that recipe in the same
  transaction, whatever the rating. Why: "Done shopping keeps the plan",
  under The shop.
- **00007**: `finish_shopping(bought_staples, shopped_recipes, seen_checks)`.
  The function had marked every plan row shopped and deleted every check, so
  with the app open on two devices a recipe added on the laptop after the
  phone loaded its list was marked bought without ever being on a list, and
  a check made elsewhere was wiped. Since then it marks shopped only the
  recipes the list covered and clears only the checks it showed.
- **00008**: the grants the migrations meant, and limits on notes, ids,
  prices and dates (see "Why 00008").
- **00009**: `plan_items.shopped_on` (update granted; a four-digit year) and
  `finish_shopping(bought_staples, shopped_recipes, seen_checks, bought_on)`,
  the cook's local date as a fourth argument with a default, so an installed
  app still running the code before it kept working. "Put it back on the
  list" clears both the mark and the date. Nothing ties the date to the
  mark, because the old app cleared only the mark, so the app reads
  `shopped_on` only while `shopped` is true. Why: "Dating the shop", under
  The shop.
- **00010**: `finish_shopping(bought_staples, shopped_recipes, bought_on,
  bought_kit, seen_checks)`: the kit checked off in the list's kit aisle
  goes into the kit in the same transaction as the pantry and the plan, and
  a recipe shopped already keeps its first date (a retry, or a second
  device). `seen_checks` is ignored, and everything after `shopped_recipes`
  has a default, so the two apps before it still find the function. `alter
  default privileges for role postgres revoke execute on functions from
  public`, so a new function is callable only by those it is granted to.
  Every grant on `grocery_checks` goes; the table and its rows stay. Why:
  "Why 00010", and "The kit's checks live on the phone too", under The
  shop.

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
  the seen checks cleared, a recipe and a check added elsewhere survive, the
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

### The security reviews (October 6 and 9, 2026)

The open items from both stay in CLAUDE.md, under "Security: open items",
and what going public needs, under "Going public" in "Later, unscheduled".
The October 9 review's finding about new functions is under "Why 00010".

### Sign out is this phone only (Rowan's call, October 9, 2026)

The auth client's default signed out every device (`scope: 'global'`),
while the screen spoke of this phone. Now `scope: 'local'`; and the menu
says "Signed in on this phone as …" beside Sign out.

### A signed-out phone asks too (Rowan's call, October 10, 2026)

A phone nobody was signed in to took any link's account without a word, so
a stranger's link could put a cook's cooks and notes into the stranger's
kitchen, with only the footer to tell. Every link now asks: "Sign in with
this link?", naming the account, with Sign in and "Not now" on a signed-out
phone, at the cost of one tap on every confirmation and reset link.

### Whose link it is (October 9, 2026)

Until October 9, 2026 the app decoded a link's token to name its account in
the "Switch accounts?" prompt, so a forged token could name any email there.
Since then whose link it is comes from Supabase (`linkOwner`, a plain request
to Auth's `/user` with the link's token; why not the auth client is under
"The Supabase clients, reviewed").

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
  instead, and came back as a raw permission error. Now it never goes out
  as nobody: `fetchAsTheCook` fails it at once, as "No connection" when the
  session could not be renewed for want of signal, and as "You are signed
  out on this phone." when there is none.

### The ninth review's sign-in fixes (October 9, 2026)

Two reviewers each found that an email link landing while the stored
sign-in could not be renewed (no signal, an hour past last use) skipped
"Switch accounts?": the auth client reports no session then, and for a
minute after a failed renewal it answers from that failure without asking
again. The link now waits for Try again until it is known who is signed in
here. Also: a 5xx or a stalled answer keeps a link for Try again instead of
calling it bad; a token not shaped like one is refused before the request
(some characters make the browser refuse to send it, which looked like no
signal for ever); the expired-sign-in screen's Try again reloads the page,
since the auth client would not ask again for a minute; a sign-out heard
meanwhile goes to Sign in; a gateway's HTML error page reads "Supabase is
not answering"; another account's stored timers can no longer stop this
one loading; and `.env` is ignored anywhere in the repo.

### The tenth review's sign-in fixes (October 10, 2026)

A hash carrying both a session and an error signed in, then said the link
had failed; it now signs no one in. `signInFromLink` checks the session it
ends with is the link's account: a link's token past its hour is renewed
first, and the auth client joins a renewal already on its way for the
account signed in here, which left that account signed in (and a reset
link would have changed its password). `linkOwner` keeps a link for Try
again on a 408 or 429 and on an answer that stops arriving partway, not
only a timeout, refuses a token over 8 KB unsent, and reads an empty email
as none. Left open, in CLAUDE.md: a renewal refused with a 429 signs the
phone out, and Sign out with no signal and an expired token does nothing.

### One cook in progress per recipe (Rowan's call, October 10, 2026)

The phone kept one cook in progress. Opening another recipe's cook mode
replaced it, and since round 9 a new cook also cleared that recipe's
timers, so starting the burger while the fries roasted lost the fries'
timer when the cook went back to them; and a dinner not yet logged was
forgotten as soon as the next cook began. Each recipe now keeps its own
(`first-course:cooking:<account>:<recipe>`), and the menu lists each, the
latest first. "Not cooking it now" asks first while a timer counts.

## Build history

- **Phase 2**, the shop and the kit, was built on October 4, 2026.
- **Phase 3**, cook mode hardened and leveling, was built on October 4,
  2026: timers that survive a reload and chime when the cook comes back,
  installing to the home screen, and the leveling layer (the promotion
  moment and the usual's moments, the level-up beat, the idle sprite, the
  streak and the badges).
- **A folder hidden by `.gitignore`** (October 4, 2026): an unanchored entry
  (`screens`, meant for the screenshot folder) hid `src/screens/`, and the
  CI build broke on screens that were never committed. The Playwright
  entries in `app/.gitignore` are anchored now (`/screens`). Run `git
  status` after committing a new folder.
- **The eighth review** (October 9, 2026): five reviewers (logic, security,
  what a beginner sees, the recipes, tests and docs) and the fixes above:
  the Supabase clients, meat past its day, the kit's checks on the phone,
  leftovers, the cook in progress, timers kept per account, a beginner's
  times, 80 XP a skill, and migration 00010.
- **The ninth review** (October 9, 2026): five reviewers again, and the fixes
  above: the email link in a dead spot, timer instructions, allergens,
  groceries that age, the cart keeping staples and kit until Done shopping
  and forgetting itself after two days, the cook in progress counted by
  cooks rather than dates, sign-out on this phone only, and the recipes'
  rewrites read again.
- **The tenth review** (October 10, 2026): five reviewers, and Rowan's four
  calls (thawing, a signed-out phone asks, a cook in progress per recipe,
  the cart keeping until Done shopping), the meat dated by the day it was
  checked off, the sign-in fixes above, a stir and a ring read together,
  cook mode's buttons unstuck at 200% text (round 9's rule never applied:
  it came before the rule it overrode), the plate above the dish's name at
  200% zoom, and the tenth read-back's recipe fixes.
