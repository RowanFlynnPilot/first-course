# First Course

A cooking app for a true beginner. It is a skill tree, not a recipe box: every
recipe teaches one or two named skills, harder recipes stay locked until you
have the skills they need, and the whole menu builds toward cooking the dishes
you currently pay to have delivered. A light RPG layer sits on top: you name
a chef, every cook earns XP, and the chef climbs from dishwasher to executive
chef.

Personal project (not Wausau Pilot & Review). Built for Rowan first, with
"public someday" in mind, so auth and row-level security are in from day one.

Repo: `RowanFlynnPilot/first-course`. Local: `C:\Users\rpfly\Projects\first-course`.

## Engineering rules

These apply to every change.

- One correct path. No fallbacks, no alternates, no backups.
- Fail fast and loud. Throw with a message that says what is wrong. The root
  error boundary in `main.tsx` puts any thrown message on screen, except one
  thrown while a file loads, before React is up: that is a blank page. So
  code at the top of a module only builds static data the unit tests import
  (the badges, the curriculum); anything a screen works out, it works out
  while it renders.
- Surgical changes. One responsibility per function. Fix root causes.
- Let TypeScript catch it. The curriculum is typed data, so a misspelled skill
  or ingredient id is a compile error, not a runtime check.
- Don't overengineer. No state library, no CSS framework, no query cache.
  One React context, `useKitchen()` (`src/kitchen.ts`), carries what the
  screens read and the ways they change it.

## Vocabulary (locked)

Use these words in the UI and in code comments.

| Word | Meaning |
| --- | --- |
| The menu | The whole curriculum, shown on the home screen |
| Course | A tier. First course through Fourth course are tiers 1 to 4 |
| The usual | Tier 5: the delivery orders the menu builds toward |
| Skill | A technique (`TechniqueId`). Taught by exactly one recipe |
| Cook | One logged attempt at a recipe (`cook_logs` row) |
| Rough / Decent / Nailed it | Ratings 1, 2, 3 |
| Good cook | A cook rated Decent or better |
| Kept | Money not spent on delivery |
| Cook mode | The one-step-per-screen view used at the stove |
| Chef | The player's character, a pixel sprite. Has a name, a look, a level and a rank |
| Look | What a cook chooses about the sprite: skin tone, hair color, hairstyle, facial hair, glasses |
| Extra | Something the chef wears or carries over the rank's outfit (a tool in hand, clogs, a towel, a patch), earned by cooking one kind of dish |
| XP, level | Earned by cooking. Level comes from total XP |
| Rank | Dishwasher, prep cook, line cook, sous chef, head chef, executive chef |
| Discipline | One of six kinds of skill: prep, pan, pot, oven, sauce, palate |
| Chef sheet | The `/chef` page: portrait, level, every skill, the kitchen ladder |

In UI copy say "ordering" or "delivered", never a delivery brand name.

## Locked decisions

1. **Recipes live in the repo, not the database.** `app/src/curriculum/*.ts`
   is typed data. Supabase holds only what a cook does.
2. **Progress is derived, never stored.** Locked, ready, cooked, mastered,
   learned skills, the kept total, the streak and the badges are all
   computed from the cook log in `lib/progress.ts`, `lib/cost.ts`,
   `lib/streak.ts` and `lib/badges.ts`. There is no progress table to drift.
3. **One recipe teaches each skill.** No alternate routes to a skill.
4. **A skill is learned on one good cook** of the recipe that teaches it.
   A recipe is **mastered** at three good cooks with at least one "Nailed it".
5. **Every ingredient has one unit**, and recipes use only that unit. No unit
   conversion exists anywhere, by design.
6. **Two kinds of cost, never mixed.** The recipe page shows the cost of what
   you use (a share of each package). The Phase 2 grocery list shows what you
   pay at checkout (whole packages).
7. **Recipe text is original.** Never paste from a book or site.
8. **Recipe ids are permanent.** Cook logs reference them as plain text.
9. **Hash routing**, because GitHub Pages cannot rewrite paths.
10. **The cook's local date** is sent by the client. `current_date` in
    Postgres is UTC and would misdate an evening cook.
11. **Level never gates anything.** Recipes unlock through skills only. XP,
    level and rank are a scoreboard, not a lock.
12. **Only the chef's name, look and chosen extras are stored.** XP, level,
    rank, discipline stats and which extras are earned are derived from the
    cook log (`lib/leveling.ts`, `lib/extras.ts`), like all other progress.
    Changing the XP or unlock rules re-scores everyone with no migration.
    Rank decides the sprite's hat and outfit; the cook never picks those.
    Extras are drawn over the outfit and never replace it, so the sprite
    always shows the rank (Rowan's call, October 4, 2026).
13. **One gate for cooking and logging.** `cookable()` in `lib/progress.ts`
    is the only thing that decides whether a recipe can be cooked or logged.
    Both cook mode and the log form call it before doing anything. It
    returns the content or the skills still missing; a locked recipe shows
    "… is locked" and the way there in place of the form, because a
    catch-up can lock a recipe again while its screen is open.

## Stack and layout

React 19, Vite 8, TypeScript 7 (the native compiler), React Router 8 (imports come from
`react-router`), Supabase (Postgres, Auth) through `@supabase/auth-js` and
`@supabase/postgrest-js`, the two parts of supabase-js the app calls,
Vitest, Playwright (dev only), oxlint. Deployed by GitHub Actions to GitHub
Pages at `/first-course/`.

```
CLAUDE.md
README.md                      bring-up, definition of done, publishing
docs/decisions.md              the record behind CLAUDE.md: what changed, when, and why
.github/workflows/deploy.yml   build job (lint, type check, test, e2e, build; read-only), deploy job
                               (Pages); a pull request runs the checks only, type check included.
                               Actions pinned to commits.
.github/dependabot.yml         weekly, with a 7-day cooldown before a release is proposed: minor
                               and patch dev tools in one pull request, a major on its own,
                               @types/node held to the Node CI runs (24)
supabase/migrations/           00001_phase1_foundation.sql (cook_logs + RLS)
                               00002_chef.sql (chefs: one named chef per account)
                               00003_chef_look.sql (skin, hair, and editing the chef)
                               00004_shop_kit_and_cook_edits.sql (plan, pantry, checks,
                                 prices, kit, finish_shopping(), editing the cook log)
                               00005_chef_creator.sql (hairstyle, facial hair, glasses,
                                 more colors, chosen extras)
                               00006_keep_the_plan.sql (Done shopping marks the plan
                                 shopped; saving a cook takes its recipe off)
                               00007_shop_what_you_saw.sql (Done shopping changes only
                                 the recipes and checks this device showed)
                               00008_grants_and_limits.sql (the grants the migrations
                                 meant, and limits on notes, ids, prices and dates)
                               00009_shopped_on.sql (the day the groceries were bought;
                                 finish_shopping takes it as a fourth argument)
                               00010_kit_at_the_register.sql (Done shopping puts the
                                 kit checked off into the kit; no new function exposed
                                 by default; grocery_checks shut)
app/
  playwright.config.ts         e2e: phone viewport, its own build against the fake
  e2e/                         fakeSupabase.ts, kitchen.ts (fixture), *.e2e.ts (weeknight.e2e.ts:
                                 Tonight, a cook the phone interrupted, stirring, bought meat and
                                 leftovers; resilience.e2e.ts: no signal, weak signal and other
                                 devices), screens.e2e.ts
  scripts/icons.ts             draws the home-screen icons (npm run icons)
  public/                      icon.svg, manifest.webmanifest, icon-192/512.png, apple-touch-icon.png,
                               fonts/ (the two typefaces, self-hosted, and their licenses)
  index.html                   font preloads, the manifest and the touch icon are linked here
  src/
    main.tsx                   root + error boundary
    App.tsx                    auth gate, loads logs + chef + shop, provides the kitchen, routes, scroll, notice
    kitchen.ts                 the kitchen context: userId, chef, logs, shop and their changes (useKitchen)
    database.types.ts          the tables and finish_shopping as types, generated from the migrations
    copy.test.ts               rules about the app's own words, read off the source
    supabase.ts                client; throws if env is missing; reads an email link's result first;
                                 a 15-second limit on every request, no silent retries; linkOwner()
                                 asks Supabase whose link it is
    styles.css                 the whole design system
    curriculum/
      techniques.ts            28 skills, 6 disciplines -> TechniqueId
      ingredients.ts           priced ingredients   -> IngredientId
      equipment.ts             the kit catalogue    -> EquipmentId
      spices.ts                the spice guide: taste, buy, use, try it on -> SpiceId
      types.ts                 Recipe, RecipeContent, Step, Pairing
      recipes.ts               all 31 recipes, RECIPES, recipeById
      curriculum.test.ts       graph rules the types cannot express
    lib/
      progress.ts              the rules: learned, state, mastery, next, cookable, progressLost
      leftovers.ts             what is left from a recent cook, and what leftover rice can become
      allergens.ts             what a recipe contains of the nine major allergens ("Contains …")
      courses.ts               filing things under the course that first needs them, and its heading
      leveling.ts              the chef: XP, level, rank (and its costume), discipline stats
      streak.ts                weeks in a row with a cook, from cooked_on
      badges.ts                the 31 badges and the rule for each, read off the log
      notice.ts                what one cook earned: lines, level-up, promotion, badges, the usual
      timers.ts                cook-mode timers in localStorage, keyed by label
      cooking.ts               the cook in progress on this phone, for the menu's way back to it
      cart.ts                  the cart, kept on this phone until Done shopping (settleCart): see
                                 "The cart lives on the phone"
      memoryStorage.ts         a Storage for the tests of what the phone keeps
      cost.ts                  cook cost, order cost, kept; packagePriceCents() is the one price read
      grocery.ts               the grocery list: whole packages per store section, checkout total
      freshness.ts             the day a bought recipe's meat should be cooked by
      kit.ts                   what equipment a set of recipes needs, and what is missing
      extras.ts                the 8 extras, the track and good-cook count that earns each, what is worn
      spices.ts                the spice shelf: each spice under the course that first uses it
      cookLogs.ts, chefs.ts,   the only Supabase table reads/writes; rows -> app data
        shop.ts                  (shop.ts: plan, pantry, prices, kit, finish_shopping). Auth
                                 calls live in App, AuthScreen, SetPasswordScreen, supabase.ts
      format.ts                money, quantities, dates, lists
      errors.ts                plainMessage(): a Supabase or network error in the app's own words
    components/
      Plate.tsx                the plate (see Design)
      PixelArt.tsx             draws any pixel art (rows of palette keys) as crisp SVG, with frames
      chefSprites.ts           the six rank sprites as pixel rows, the look options and extras as
                                 patches drawn over them, the idle frames, the palettes
      ChefSprite.tsx           the chef, standing or idling
      badgeSprites.ts          the badge medals and symbols, earned and locked palettes
      BadgeArt.tsx             one badge
      Beats.tsx                the full-screen moments: a promotion, a dish of the usual in reach
      ChefEditor.tsx           name, look and extras form, used to create (extras are one
                                 line then: nothing is earned yet) and to change
      CheckRow.tsx             a checkbox row: the list's checks change at once (on the phone), the
                                 pantry's and kit's once Supabase has them
      useWrite.ts              busy + error for one write from a button; a tap while busy does nothing
      WriteStatus.tsx          Saving (an always-there "Saving…" status) and ErrorNotice: every write's words
      useNow.ts                the time, kept current: a minute tick, and on coming back into view;
                                 useToday, the local date the same way
      MenuLink.tsx             the "Menu" way back at the top of a screen
      useFocusTarget.ts        where focus goes when a write takes away the control that made it
      LockedNotice.tsx         "Locked. Learn … from …" and the way there; the page cook mode and
                                 the log form show for a locked recipe
      usePageTitle.ts          each screen's title: "This week · First Course"
      useCookTimers.ts         cook mode's timers: persisted, chimed from one check
      menuScroll.ts            where the menu was scrolled, for the "Menu" back links
      XpBar.tsx, IngredientList.tsx, EquipmentList.tsx, RatingPicker.tsx
    screens/                   Auth, SetPassword, NameChef, Menu, Chef, EditChef, Recipe, Cook, Log,
                               EditCook, Shop, Pantry, Kit, Spices
```

Routes: `/` menu, `/chef` chef sheet, `/chef/edit`, `/recipe/:id`,
`/cook/:id/:step` (step 0 is "get everything out", steps 1..n are the
method), `/cook/:id/log`, `/cook-log/:id` (change or delete a cook), `/shop`
(this week), `/pantry`, `/kit`, `/spices`.

A signed-in account with no chef row sees the create-your-chef screen before
anything else, and a cook who arrives from a password reset link sees "Set a
new password" first.

## The curriculum

31 recipes, 28 skills, 4 tracks: `foundations`, `burgers-sandwiches`,
`pizza-pasta`, `wok-curry`. The tracks come from Rowan's actual delivery
orders. Tier 5 has seven dishes: double smash burger, crispy chicken sandwich,
margherita pizza, ragù bolognese, pad thai, General Tso's chicken, chicken
tikka masala.

**Courses are gates** (Rowan's call; docs/decisions.md). Every recipe in the
Second, Third and Fourth courses requires a skill taught in the course just
before, so a course opens only once the one before it is under way, and
`curriculum.test.ts` checks it. That is why carbonara needs the aioli's egg
separating and the pan sauce's spooning off fat, and the green curry needs
the masala base's cue. The courses hold 6, 7, 8 and 3 recipes, and the
Fourth course adds no new kit or spice. The usual is not gated by course:
a dish comes into reach when its skills are learned.

**Every recipe is written, the usual included (31 recipes).** `content` is
required on `Recipe`, so the type system rules out an unwritten recipe, and
nothing in the app handles one. Once a dish of the usual is in reach, the
menu says "In reach. Cook it any time" (row notes take no full stop).

The usual sits below the Fourth course until one of its dishes is in reach,
then moves above the First course (Rowan's call; docs/decisions.md), so a
beginner meets what they can cook before seven locked plates.

From here, real cooks should shape the recipes: when a step reads wrong at
the stove, change it under the rules below.

### Writing a recipe

Fill in `content` for a recipe in `recipes.ts`. Rules:

- Assume zero knowledge. Name the pan, the heat setting, and what "done"
  looks, smells or sounds like. Never write "cook until done" (tested).
- Each step is one screen in cook mode. One action or one tight group.
- `why` is where the teaching happens. Give the reason, briefly. Not every
  step needs one. Cook mode shows it under the step, and the recipe page
  under each step of the method, for a cook reading ahead.
- `timer` only where a clock is the right judge (oven, rice, resting):
  `{ seconds, label, done }`, where the label is a word or two ("Potatoes",
  "First rise", at most 16 characters) that names it on the chips cook mode
  shows while it runs on another step, and `done` is what the cook does when
  it rings ("Turn off its burner and leave the lid on."): a short imperative
  of at most 90 characters that never says the time is up (the app says
  "Rice: time is up." before it), naming oven mitts where a pan comes out;
  where the ring only asks for a look, the check ("Check it: the sauce
  should coat a spoon."). Cook mode shows it under the clock and beside the
  chip on any other step, and reads it out with the ring (tested: the
  shape). Labels are permanent once shipped, since phones store running
  timers by label (tested: pinned). Where the cook should judge by eye,
  leave it `null` and describe the cue. The recipe page prints each timer
  under its step ("Timer: 15 minutes"), so a timer runs in whole minutes.
- No timer may ring while the cook's hands are in raw meat: a ring stops
  only at a tap on the phone. Before raw meat is unwrapped, a step waits
  for any timer still running ("Wait for the rice timer, if it has not rung
  yet…") and says what to do at its ring, while the hands are clean. A
  rice step says "turn the heat to its lowest setting, then start the
  timer", so the boil-up is not counted.
- A step that says "while that cooks" is fine: timers keep running across
  steps in cook mode.
- New ingredients go in `ingredients.ts` with a section, one unit, a package
  and a price estimate. Quantities are whole quarters (tested): a standard
  set of measuring spoons stops at ¼ teaspoon, any sum of quarters prints on
  the grocery list, and the self-hosted fonts carry ¼ ½ ¾ but no eighths.
  `formatQty` throws on anything else. No recipe uses a whole package of a
  staple, or it is not a staple (tested; what a staple is: under "Pantry").
- Salt quantities assume Morton coarse kosher salt.
- When one ingredient is used in several steps, say which part each step
  uses ("½ teaspoon of the salt", "the remaining 2 tablespoons") and put the
  split in the `prep` note, so the amounts add up to the list (tested: a
  step that says "of the X", "the remaining X", "half the X" or "the rest of
  the X" needs a prep note on X's line, and a split such as "1 for the beef,
  ½ for the sauce" adds up to the list). When a recipe has two of something
  (two oils), name which one: "the neutral oil".
- Equipment is a list of `EquipmentId`s from `equipment.ts`, and it lists
  everything a step uses, down to measuring spoons, oven mitts and paper
  towels: the kit screen and "Not in your kit yet" are only as honest as
  this list. A step that names a tool (a fork, paper towels, tongs, a
  saucepan, "the board", plastic wrap or "wrap the rest"…) finds it in the
  list, and a step that cuts, chops or slices lists the knife and the
  cutting board (tested). `kit.test.ts` fails on a catalogue item no recipe
  uses.
- A step's text is at most `STEP_MAX` (360) characters (tested), about ten
  lines in cook mode on a phone. Longer steps get split.
- Meat, and handling raw meat:
  - Every ingredient in the meat section declares `fridgeDays`, how long it
    keeps in the fridge from the day it is bought (the USDA chart's short
    end: raw poultry and ground meat 2, a whole cut of beef 3, bacon 7, a
    smoked sausage 14), and `safeTempF`, and the type requires both. For
    `safeTempF`: a temperature for raw meat (chicken 165, ground beef 160, a
    whole cut of beef such as flank steak 145), `'cured'` for bacon, or
    `'fully-cooked'` for the smoked sausage. Bacon is cured and cooked until
    crisp, so crisp is the cue, but it is still raw pork in the package, so
    it gets cut last and its board, knife and hands get washed.
  - A recipe using raw meat must list `thermometer`, say "at least N°F"
    where the cook checks, say "wash your hands", and clean what the raw
    meat touched in "hot, soapy water"; with bacon, the last two (tested).
    It needs doneness (taught by the seared thighs) somewhere below it
    (tested). Never rinse chicken (tested), keep a raw plate and a cooked
    plate, wash tongs after they touch raw meat, and never pour fat down the
    sink.
  - Every thermometer check says where to push the probe, to keep the tip
    off the pan (which reads high, the dangerous direction), to wait until
    the number stops climbing, and what to do if it is low; each safe
    temperature gets one such check (tested). In thin food (a cutlet in oil,
    a strip of chicken on a spoon) the tip must sit in the middle of the
    meat: a tip that pokes out reads the oil or the spoon.
  - Meat keeps from the day it was bought, never from today: "keeps until a
    week after you bought it, or freeze it".
  - Raw meat comes out of the fridge in the step that uses it, and sliced
    raw meat waiting for its turn goes back in, covered. Sliced raw meat
    that marinates or velvets waits covered in the fridge. Cook mode's step
    0 says "Leave the meat in the fridge until the step that uses it" for
    any recipe with a meat ingredient.
  - Salt and pepper for raw meat are measured into a small bowl before the
    package opens, so hands that touched raw meat never touch the salt box.
    Salt bowls touched by raw-meat hands get washed.
  - Hands that touched raw meat get washed before they touch plastic wrap, a
    bottle, or the fridge door. Tear off plastic wrap and paper towels
    ("Tear off 4 paper towels and set them by the raw plate") before the
    package opens, and put leftover raw meat back in the fridge before your
    hands touch it (lift what you need out with a fork).
  - Hands washed after shaping raw meat never touch it again: smash balls go
    into the pan with the tongs, the parchment pressed on a patty comes off
    with the tongs onto the raw-meat plate (and into the trash at the
    clean-up), and the tongs join the final wash. Raw meat
    going into a hot pan: the heat goes to medium-low, the meat is tipped in,
    the package goes in the trash, and hands are washed before they touch
    the spatula or the salt bowl; the next step brings the heat back up.
    Hands that tip, hold or cover a bowl of raw meat are washed in the step
    that puts the bowl in hot, soapy water, before they touch finished food
    (basil, lime, peanuts), with the burner turned to low first if one is on.
  - Cut vegetables before raw meat, and move whatever was cut off the
    board, onto a plate or into a bowl, before the meat lands on it.
  - A utensil that touched raw meat (tongs, a spatula that spread it in the
    pan) is washed before it moves or stirs cooked meat, or the cooked food
    is lifted with one that never touched raw meat. Six chicken thighs do
    not fit a 12-inch skillet with room between them: cook them in two
    batches of 3, the first resting loosely covered with foil. A cloth that
    touched raw meat (the towel pressed on a smash patty) goes in the
    laundry.
- Check that the food fits: a 12-inch skillet has a flat bottom about 10
  inches across. Pounded cutlets of 4 ounces fit two at a time; bigger ones
  do not. Smash patties are pressed to about 5 inches across, at opposite
  edges of the pan: two at ¼ inch would be 12 inches, wider than the pan's
  flat.
- Oven mitts. A skillet that has been on the heat is moved, tipped or tilted
  only with an oven mitt on the handle: any move, lift, slide, tilt or swirl
  of a pan that has been on the heat names an oven mitt in that step, small
  nonstick skillet included (tested). Name them too wherever a hot pan comes
  out of the oven, a hot metal handle gets held, or a pot of boiling water
  gets drained (colander in the sink, tip the pot away from you: tested).
  Push the food aside before tilting a pan to spoon off fat: one hand
  tilts, the other spoons. Never tip a hot skillet onto a plate: lift the
  food out with the spatula. Never tip or tilt a full skillet over a
  saucepan, even resting on its rim: a cast-iron one weighs about 8 pounds
  and can knock the saucepan over. Turn off the burner, set the saucepan on
  a cool burner beside it, ladle across, and lift the brown bits with the
  liquid already in the pan or ¼ cup of water; the skillet never leaves its
  burner. Sauce goes over pasta by the ladle too, and the ladle is in the
  equipment list. A skillet that toasted buns in butter is wiped out (a
  paper towel held in the tongs) before it goes to high heat.
- Say "turn off the burner" (and "turn off the oven") where the heat is done,
  once for each pan that was heated ("both burners" counts twice), and in the
  same step that drains a pot (tested, all three).
- When the cook steps away from a hot pan (washing a tool, waiting on a
  timer), the step turns the burner to low or off and says where it comes
  back up; a washed tool is dried before it goes near hot oil. A pan moved
  off its burner is moved back, with an oven mitt, before it heats again.
- Measure in spoons a standard set has: "1½ teaspoons", never "½
  tablespoon" (tested), and never less than ¼ teaspoon.
- A step that starts a long timer the cook should not wait on (a dough's
  rise while the oven heats) says to go straight on to the next step, and
  any timer of 30 minutes or more says to go on, or what happens meanwhile
  (tested). A timer rings only at zero, so never write "when the timer shows
  30 minutes left": split the wait into two timers (the ragù simmers 2¼
  hours on one step, then 15 minutes on the next, while the pasta water
  heats; the carbonara's pasta gets 8 minutes, then a "Last minute" timer
  while the eggs are tempered). A pan stirred or turned halfway gets a timer
  for each half, with the turn in the step that starts the second (the sheet
  pan), and a timed simmer's done cue goes in the step after it (the pizza
  sauces).
- A step the cook will sit on for a long time (water coming to a boil, pasta
  cooking) repeats any reminder that matters, such as stirring a simmering
  sauce, because the earlier step is no longer on screen.
- A timed simmer whose step says "stirring every 5 minutes" gives its timer
  `stirEvery: 300` (seconds): cook mode beeps once, softly, and shows "Sauce:
  stir it now" with "Stirred" on whatever step the cook is on. The two are
  kept in step both ways (tested). A schedule with no timer (judged by eye)
  has nothing to count from.
- Times are a beginner's: a first-timer chops slowly and reads every step.
  `totalMinutes` is what the menu's "start now and eat around …" counts
  from (Rowan's call; docs/decisions.md), so it covers the timers that run
  one after another and the work between them, at that pace. It is at least
  the longest timer plus 5 minutes, and `activeMinutes` at most it (tested).
- The kit has one of each pan, so never "use a second pan": say how to
  manage with one. Food built to order (a sandwich) is built for those
  eating now; the rest keeps in parts.
- A sauce that simmers tomatoes for 20 minutes or more (tested), and tomato
  that only sits in a pan for half an hour, goes in a saucepan, not the
  skillet: the kit steers a buyer to cast iron, and long acid simmers strip
  its seasoning and taste of metal.
- Start pasta water no sooner than it takes to boil.
- Any recipe a cook can reach before the aglio (which teaches it) says how
  to peel garlic (tested).
- When two very different products share a name, the ingredient says which
  one (pourable Thai tamarind concentrate, not the thick black paste), and a
  why says what to do with the other.
- A sauce with a raw egg yolk uses `pasteurized-eggs`, and says why, with:
  "A regular egg is not a stand-in here. Look for “pasteurized” on the
  carton, beside the other eggs; not every store has them." A recipe with a
  step that separates an egg uses them (tested).
- Open cans during prep, before any heat: never while garlic or ground
  spices sit in hot oil. Every can is opened, by name ("open the can of
  broth") or as "both cans" or "all three cans" when the count matches, in
  or before the first step that names it, and any part of it measured for
  later is measured then; the can opener is in the list (tested). "Keep the
  rest" notes go on a calm step (a simmer, or its why), never the
  time-critical one; freezing advice comes before the pasta is tossed,
  never on the last step.
- Potatoes soak in cold water, never hot tap water, which can carry metal
  from old pipes.
- Every ingredient lists its `allergens` from the FDA's nine (milk, egg,
  fish, shellfish, tree nuts, peanuts, wheat, soy, sesame) for a typical US
  supermarket product; where brands differ, the one most contain (curry
  paste: shellfish). The recipe page says "Contains …" from them
  (`lib/allergens.ts`). A dish commonly topped with a major allergen
  (peanuts) offers it on the side, and a why names one a label may hide
  (shrimp in curry paste).
- Say how to keep a leftover part of a package: half a can of tomatoes
  keeps a week in the fridge or 3 months frozen; leftover raw chicken can
  be frozen; the rest of a can of broth keeps 4 days in a lidded jar, or 3
  months frozen; bacon keeps a week from when it was bought, or freezes; the
  loaf lives in the freezer. Leftover rice is spread in a lidded container
  and in the fridge within an hour. Say "a lidded container", always.
- A recipe that makes 3 or more servings says how to keep the leftovers in
  its last step (a lidded container, in the fridge within 2 hours, 4 days),
  and how to reheat them in `leftovers.reheat`, safely: chicken to at least
  165°F, rice reheated only once (warm only the rice eaten now; the rest
  stays cold, for egg fried rice). The reheat is required on exactly those
  recipes, with the 165°F where there is poultry and "once" where there is
  rice (tested).
- An ingredient listed as softened needs a step that softens it, and bread
  from the freezer a step that thaws it. Part of a staple is measured by
  weight with a picture ("2 ounces, a quarter of a new 8-ounce block"),
  never as a fraction of the package, which may be part used.
- A knife is washed by hand and set in the dish rack, never left in a sink
  of soapy water, where a hand reaching in finds the edge.
- Nonstick stays at medium-high at most and never meets a metal tool. The
  `spatula` is silicone, heatproof to 500°F (it meets cast iron on high),
  and the `tongs` are silicone-tipped; the stiff metal spatula does not
  stand in for either.
- Every id that has shipped is permanent, not only recipe ids: a cook's
  rows hold ingredient ids (pantry, prices), equipment ids (kit) and extra
  ids (the chef), and loading throws on one the curriculum no longer has,
  so the cook would see "Could not load your kitchen" every time.
  `ids.test.ts` pins every shipped id; add a new one there in the commit
  that ships it. To stop using an ingredient or a tool, mark it `retired:
  true`: no recipe may use it, and the "unused" tests skip it.
- After writing, have someone read every step as a person who has never
  cooked. What each read-back found, and the rules here that came from it,
  is in docs/decisions.md. A pan comes off the burner before eggs go in: an
  electric burner stays hot under it (the carbonara).
- `delivery.menuPriceCents` is the in-app menu price of one serving of the
  nearest thing you would order. A pizza's serving is a share of the one you
  would order, not a whole pizza: the margherita is $10 a serving, half of a
  large one.
- A side dish (`delivery.side: true`: the chopped salad, the oven fries) is
  compared with adding it to an order you would place anyway: its menu
  price, fees and tip, and no delivery fee of its own (Rowan's call;
  docs/decisions.md).
- `pairing.principle` is a general rule ("Match acid with acid"), so the
  cook learns how pairing works, not just what to buy.
- Prefer ingredients that later recipes reuse.
- Ingredient and equipment names carry no commas ("80% lean ground beef",
  "12-inch skillet"), since lists of them are joined with commas (tested);
  prep goes in the prep note ("Fresh ginger", "peeled and grated"). A
  counted (`each`) ingredient has a `plural`, which the type requires and the
  list shows above one: "3 Large eggs", "½ Lemon".
- Skill names are actions: "Steaming rice", "Making a pan sauce",
  "Whisking an emulsion". They read in sentences: "Learned steaming rice."
  `techniques.ts` lists skills in menu order, the order the chef sheet shows
  them in (tested).
- Lists take the serial comma ("salt, oil, and lemon"), in recipes and in
  the app (tested: "X, Y and Z" is flagged in every step, why, blurb,
  pairing, summary, note and spice entry, except four phrases that only
  look like lists: "stirring and scraping", "wash and dry", "low and close",
  "seeds and all"). The app joins lists with `listOf`, which does it
  already.
- `npm test` must pass. `curriculum.test.ts` checks every rule marked
  tested, the graph rules listed at the top of `recipes.ts`, and that every
  recipe costs less to cook than to order.

## The rules, precisely

`lib/progress.ts`:

- `progressOf(logs)` reads the log once (good cooks, "Nailed it"s, the
  last cook and the ratings of each recipe, and the skills learned) and
  keeps the result per log array in a `WeakMap`. The functions below read
  from it, so the menu's 31 rows cost one pass, not 31. That is only right
  while a log array never changes, so the app freezes every one it makes
  (`fetchCookLogs`, `changeLogs` in `App.tsx`): a change in place throws
  instead of showing stale progress. Tests build new arrays with spreads.
- `learnedTechniques(logs)`: skills of every recipe with at least one good cook.
- `recipeState(recipe, logs)`: `locked` if any required skill is unlearned;
  else `ready` with no cooks; else `mastered` at 3 good cooks including a
  "Nailed it"; else `cooked`.
- `nextRecipe(logs, plan, shopped, cookBy, today)`: the first unlocked
  recipe on this week's plan, groceries bought before groceries still to
  buy; among the bought, the one whose meat should be cooked soonest first
  (`cookBy`, by recipe id: `lib/freshness.ts`), then those with no day to
  cook by, in the order added, then those whose meat is past its day (the
  menu labels it "Groceries bought" or "On this week's plan"); else the
  first in suggestion order, which `readyToPlan` shares: a dish of the usual
  that has come into reach without a good cook yet (what everything builds
  toward), then, in menu order, recipes without a good cook (a Rough one
  keeps its place in that order; a side never cooked waits behind the
  meals, so night one is the eggs, not the side salad), then those not yet
  mastered, then mastered ones, the longest uncooked first, the usual's
  before the courses'. A recipe with a good cook that was cooked at all in
  the last `REST_DAYS` (7) goes to the back, so the suggestion is never what
  was just cooked; a recipe with only Rough cooks skips the rest, since its
  skill is still the way on. There is always a suggestion: once everything
  is mastered, the card says "Mastered, and not cooked since …". (Rowan's
  calls; docs/decisions.md.)
- `plannable(recipe, logs, plan)`: whether a recipe can go on this week's
  plan: it is unlocked, or every recipe on its way there (`pathTo`) is
  planned already, so one shop covers a week that runs past what is open
  today (Rowan's call; docs/decisions.md). `readyToPlan`
  offers those after the open ones, saying "Opens after you cook …", and a
  locked recipe's page has "Add to this week" once it is plannable.
  Planning is not cooking: `cookable()` still gates cook mode and the log.
- `teacherOf(technique)`: the one recipe that teaches a skill. A locked
  recipe page names it, with a link: "Locked. Learn heat control from Soft
  scrambled eggs on toast."
- `pathTo(recipe, logs)`: every recipe to cook, each at Decent or better,
  before a locked one opens, each after the ones it needs. When a teacher is
  locked too, the locked notice adds "The way there, each cooked at Decent
  or better: …, then this." A course
  whose every recipe is locked says "Opens as you learn … skills".
- `lastNote` reads the notes itself; everything else above reads `progressOf`.
- `masteryLeft(recipe, logs)` is the one wording of how far a recipe is from
  mastery ("A “Nailed it” masters it."), used by the log form
  (`whatTheRatingDecides`), the recipe page and the menu rows (`rowNote`).
  `ratingLabel(rating)` is the one place a rating gets its name.

`lib/leveling.ts`:

- Cook XP = `tier * 10 * rating`. Tier 1 Rough is 10; tier 5 Nailed it is 150.
- Only a recipe's best 5 cooks earn XP (`XP_COOKS_PER_RECIPE`), so a better
  cook replaces a weaker one and getting better pays (Rowan's call;
  docs/decisions.md).
- +80 per skill learned (`XP_PER_SKILL`), +100 per recipe mastered
  (`XP_PER_MASTERY`). 80, not 50, so night one levels up (Rowan's call;
  docs/decisions.md).
- Level `n` needs `50 * n * (n - 1)` total XP: 100, 300, 600, 1000, ...
- Ranks by level: dishwasher 1, prep cook 3, line cook 6, sous chef 10, head
  chef 14, executive chef 18.
- Pacing this was tuned for: any first good cook reaches level 2, the eggs'
  included (`leveling.test.ts` checks every recipe open from the start).
  Mastering the First course lands at line cook (1,660 XP, level 6).
  Executive chef needs close to five strong cooks of everything (a perfect
  run tops out at 18,990 XP, level 19).
  How a year of cooking played out in simulation (at 50 XP a skill; not
  re-run at 80) is in docs/decisions.md.

`lib/cost.ts`:

- Cook cost = sum of `qty * package.priceCents / package.units`.
- Counted servings = the servings a recipe makes, up to two
  (`COUNTED_SERVINGS`; Rowan's call, docs/decisions.md). A cook is dinner
  for one or two; leftovers count for nothing, neither as meals kept nor as
  cost. The recipe page says so under "Cook it or order it" on any recipe
  that makes more than two servings.
- Order cost = `menuPrice * counted servings * (1 + 0.15 fees + 0.18 tip)`
  plus one `$3.99` delivery fee, except for a side (`delivery.side`), which
  rides on another order and pays no delivery fee. The constants are at the
  top of the file. The recipe page's "You keep" says how many servings it
  counts.
- Kept per cook = order cost minus the counted servings' share of the cook
  cost. Total kept sums it over every cook, including Rough ones (you still
  did not order).

`lib/streak.ts` (display only, earns nothing, gates nothing):

- A week runs Monday to Sunday, from the cook's local `cooked_on` dates.
- The streak is the run of weeks with at least one cook ending this week, or
  ending last week if this week has no cook yet ("Cook this week to keep
  it"). Two weeks back with nothing and it is gone.
- The longest run ever is kept for the badge, so a broken streak does not
  take the badge away.

`lib/badges.ts` (derived, never stored, so editing a cook can take one away):

- 31 badges: First cook, Nailed it (any cook rated 3),
  Mastered (any recipe mastered), one per course cleared (every skill that
  course teaches, I to IV, white numerals), one per course mastered (every
  recipe in it mastered, yolk numerals) and The usual mastered (a plate with
  the yolk ring), one per discipline (every prep, pan, pot, oven, sauce or
  palate skill), $100, $500, $1,000 and $2,500 kept (at today's prices),
  Four weeks running (longest streak 4 or more), The whole menu (every
  recipe cooked once, the usual included), and one per dish of the usual for
  a good cook of it. About when each arrives is in docs/decisions.md.
- The log form says, before saving, what the rating decides
  (`whatTheRatingDecides` in `progress.ts`): the skills a good cook
  teaches, or how far the recipe is from mastery. Menu rows say the same in
  short: "Rough so far. A Decent cook teaches heat control", "2 of 3 good
  cooks", "3 good cooks. A “Nailed it” masters it".

`lib/notice.ts` (what one cook earned, played by `MenuScreen` and
`Beats.tsx`). This is the one description of the after-cook notice and the
moments after a cook; other sections point here.

- The moments come first: a promotion holds the whole screen, then each
  dish of the usual whose skills are now all learned, each until the cook
  taps on ("Next" while another moment follows, "Back to the menu" on the
  last). The usual never appears as a line in the notice. Only then does
  the menu play its own celebration: the level-up hop, the XP bar, the yolk.
  While a moment holds the screen the menu is `inert`, so Tab cannot reach
  what the moment covers.
- The notice's first line names the dish and the rating ("Sheet-pan sausage
  and vegetables: Decent. +100 XP."), recipes it unlocked are links, a new
  extra is named and has "Wear it" when its slot is free ("Swap it in" when
  not), and the notice offers to add the tools the cook used that are not
  checked off in the kit.
- It shows the badges that cook earned (`earnedBadges(after)` minus
  `earnedBadges(before)`) as their art, whose label names them; the
  notice's lines do not repeat them.
- It is app state, held in `App.tsx`, shown on the menu once and cleared
  when you leave the menu. It is not in the URL or history. The log form
  navigates with `replace`, so Back from the menu can never return to the
  form and log a cook twice.
- It is a region named "This cook", not a live region: focus moves to it
  once the moments are over, which reads it, and a status would read it
  again, whole, at every change inside it.

## Design

Enamelware: a cool white plate with a cobalt rim and one egg yolk.

| Token | Hex | Use |
| --- | --- | --- |
| `--enamel` | `#f2f4f1` | Page ground |
| `--plate` | `#ffffff` | Raised surfaces: the tray, inputs, notices |
| `--rim` | `#1d3a9e` | Cobalt. Rules, borders, links, primary buttons |
| `--ink` | `#131a33` | Text |
| `--muted` | `#566074` | Secondary text (5.7:1 on enamel) |
| `--steel` | `#76808f` | Locked plates only, never text |
| `--yolk` | `#f5b81c` | Progress and emphasis. Never text |
| `--ketchup` | `#c4321f` | The price of ordering, errors, a finished timer |

Type: **Bricolage Grotesque** (600 to 800) for the wordmark, titles and the
timer clock. **Atkinson Hyperlegible Next** for everything else, chosen
because cook mode is read from across a counter. Sentence case everywhere. No
all-caps labels, no monospace. Both are self-hosted: variable woff2 files in
`public/fonts` (latin and latin-ext, from Google Fonts, under the SIL Open
Font License whose text sits beside them), declared in `styles.css`, with the
latin files preloaded in `index.html`. Nothing from another site blocks the
first paint, and the e2e suite fails on any request to a site other than the
app's own and Supabase's.

**The plate is the signature.** `components/Plate.tsx` draws a white plate
with a cobalt rim. Locked is a dashed steel outline. Each good cook grows the
yolk in the middle (one, two, three), and mastery adds a yolk ring. A recipe
with only Rough cooks gets a yolk outline. Spend boldness there and keep the
rest quiet.

**The chef is a pixel sprite.** A 16-bit console RPG look, with EarthBound
as the reference Rowan gave: a small front-facing character, 16 pixels wide
(drawn 20 wide, with room beside it for a tool in hand),
big head, two tall dot eyes, a dark outline, flat color with one shade. The
sprites are original. Never copy or trace a character from that game or any
other.

- `components/chefSprites.ts` holds the art as rows of palette keys, one
  character per pixel. To change a sprite, edit the rows. A sprite is hat
  rows + shared face rows + body rows, so the hat and outfit change with
  rank and the face stays the same person.
- Rank is the costume: bandana and yellow rubber gloves for the dishwasher,
  skull cap and cobalt apron for the prep cook, then a white jacket and a
  toque that gets taller with every promotion, a yolk neckerchief from sous
  chef, cobalt buttons for head chef, gold buttons and a gold hat band for
  executive chef.
- The sprite palette is the app's palette (ink outline, white, cobalt,
  yolk, ketchup) plus a yolk shade, a grey, navy trousers, seven skin tones
  and nine hair colors, four of them fun ones (blue, pink, green, purple)
  that Rowan asked for. Do not add colors casually; the sprite belongs on
  this page because it shares the page's colors. Skin tones and hair colors
  are stored as indexes, so new ones go at the end of their lists.
- The look and the extras are patches: pixels drawn over the rank's art,
  positioned from the eye row (`Patch` in `chefSprites.ts`). Hairstyles,
  facial hair and glasses touch only the hairline, face and shoulders;
  extras touch only the body and the space beside it. Neither ever touches
  the hat, which `chefSprites.test.ts` checks for every rank, look and
  extra. Glasses are silver rims ('w'): cobalt or ink frames merged with
  the eyes into a mask.
- `ChefSprite` takes `scale`, whole screen pixels per sprite pixel. It must
  be an integer or the pixels render uneven. In use: 2 on the ladder, 3 on
  the menu, 5 on the chef sheet, 6 in the editor, 7 in the promotion moment.
  Badges are 16 pixels too, at 3 on the chef sheet and in the notice.
- The idle frame (`spriteFrames`) drops everything above the trousers by
  one pixel: the chef dips at the knees, feet planted, same height.
- Sprites are different heights (the hat grows), so align them by the feet.

Other rules:

- Each section opens with a 3px rim line. Rows are separated by hairlines.
  No shadows, no gradient decoration, no card grid.
- In the interface, yolk always means something earned: the plate, the XP
  bar, skill pips, the left edge of the after-cook notice or a "Why", and
  the marker under the kept amount. Never decoration. A plain notice (the
  last note, "Check your email", what the plan still needs) is
  `.notice-info`, with a cobalt edge (Rowan's call; docs/decisions.md).
  The sprite uses yolk as a costume color (gloves, neckerchief, gold trim),
  which is the one exception.
- Pixel art is the chef sprite and the badges (Rowan's call;
  docs/decisions.md), in the same format and palette: rows of palette keys
  drawn by `components/PixelArt.tsx`. Badges add two colors to the sprite
  palette, ketchup (already the app's) and one yolk shade. Do not pixelate
  the rest of the interface or swap in a pixel font.
- Motion (all answering a saved cook or a standing chef, all off under
  reduced motion; Rowan's call, docs/decisions.md): the yolk lands on the
  plate just cooked, at the top of the after-cook notice where
  the cook is looking (`.plate-celebrate`), the XP bar fills from
  where it was (`.xp-fill`), a level-up hops the chef and pops the level
  (`.chef-card-levelup`), new badges pop into the notice (`.badge-pop`), the
  full-screen moments fade and rise in (`.beat`), and the chef idles in two
  frames (`.pixels-idle`) on the menu, the chef sheet and the promotion,
  twice and then still: motion that runs on draws the eye from everything
  else (WCAG 2.2.2 allows 5 seconds).
  The ladder and the editor stay still. Keep the rest of the interface
  still.
- Mobile first. The page column is 36rem. Tap targets are at least 3rem
  each way, links included: the "Menu" back links and "Leave cook mode" are
  the only exits once the app is installed, so they get the full 3rem too.
  A link inside a sentence is the one exception. The e2e suite measures
  every control on eleven screens (`navigation.e2e.ts`).
- Copy is plain and direct. A button says what it does and keeps that name:
  "Save new password" produces "Saved." A box is checked off, never ticked.
  A write that takes a moment says "Saving…" beside its button: `Saving`
  in `components/WriteStatus.tsx`, a status that is always on the page and
  empty while idle, so a screen reader hears its words arrive. Its
  `ErrorNotice` is the one way a write's failure is shown.
- Errors are in the app's words. `plainMessage` in `lib/errors.ts` turns a
  failed request into "No connection. Check your signal and try again." and
  the auth errors a cook can cause into what to do ("That email and
  password do not match an account."); anything else keeps the server's
  text. Every Supabase read and write goes through it, except an email
  link's check and sign-in (`supabase.ts`), which say in their own words
  what the link did, and never repeat the link's text.

## Commands (PowerShell 5.1)

```powershell
cd C:\Users\rpfly\Projects\first-course\app; npm install
npm run dev
npm test; npm run lint; npm run build; npm run e2e
npm run screens                # every screen at 390x844, into app/screens/ (gitignored)
npm run icons                  # redraw the home-screen icons into public/
                               # lint fails on warnings (--deny-warnings)
npx playwright install chromium   # once, before the first e2e run
```

Phone testing: `npm run dev -- --host`, then open the LAN URL.

**The e2e suite** (`app/e2e/`, Playwright, Chromium at 390x844 in Central
time) drives a production build pointed at `https://e2e.supabase.test`.
`fakeSupabase.ts` answers every request to that host from in-memory tables
that mirror the migrations: each table's columns, primary key, check
constraints, which columns a cook may update, whether rows can be deleted,
and own-rows RLS. An unknown column, a write the grants forbid, or a request
the fake does not understand fails the test, as do uncaught page errors and
console errors. When a migration changes a table, change `TABLES` in the fake
to match. Reads are checked too: a column in `select` or `order` that the
table does not have answers 400, as PostgREST does, and every read stops at
1,000 rows (`MAX_ROWS`), as the Data API does, so a read that needs more
has to page. Besides `failNext` (tables, `rpc/<function>`, or `auth/<path>`
such as `auth/logout`), the fake can carry out a request and lose its answer
(`loseNextAnswer`), carry it out and answer only when the test says
(`holdNext`, weak signal: a read answers with what the database held when it
arrived), never let one request reach it (`dropNext`, no signal for one
request), fail every request as the browser does with no signal until the
test says (`loseSignal`, `restoreSignal`), and write or delete rows as
another device would (`writeElsewhere`, `deleteElsewhere`). `recoveryHash()`,
`signupHash()` and `strangerHash()` (another account's link) make an email
link's landing. The fake can also drop one kind of call until told otherwise
(`dropEvery`, `letThrough`: a renewal that never gets through), end every
session as a sign-out on every device would (`endSessions`: a renewal is
refused), and records each sign-out's scope (`logouts`). A table it does not
know fails the test. A seed's `sessionExpired` stores a session whose hour is up,
so the auth client must renew it before any read, and its `checks` and
`kitChecks` go into the phone's storage as the app keeps them, checked for
the seeded plan's list. Playwright will not tap a control marked
`aria-disabled`; a test that means a finger's tap passes `force: true`. A
request to any other site fails the test too. `kitchen.ts` is the fixture
(`kitchen.open(route, seed)`), the seeds and the shared steps; open a
seed once per test. A test that jumps the clock (`fastForward`) waits for
the page to load first: the 15-second request limit runs on the page's
clock, so a jump while the opening reads are out fails them; a test that
needs the clock past a renewal jumps once, then lets the reads go out on the
running clock. The fake has no `grocery_checks`: 00010 shut it, so a request
for it fails the test. The
deploy workflow runs the suite before the build; a failed run keeps its
traces as an artifact.

## Things to know before changing them

- **Wake lock needs HTTPS.** `navigator.wakeLock` does not exist on the
  plain-HTTP LAN URL, so cook mode shows "This browser will not keep the
  screen awake here." It works on the deployed site and on localhost.
- **The timer ring is Web Audio**, created on the tap that starts a timer:
  three square-wave beeps every 5 seconds until the cook taps the page, for
  up to 2 minutes from the first ring. While it rings, Safari 16.4 and later
  get `navigator.audioSession.type = 'playback'`, which should sound with
  the ring switch off and pauses other audio; a stir's soft beep leaves it
  alone, or a podcast would pause every 5 minutes of a simmer. A ring queued
  while the phone woke plays only if a timer still wants it, and a phone
  that refuses to play says so in cook mode. Not yet verified on an iPhone.
  A timer of 10 minutes or more says under its clock that the page can ring
  only while it is on screen, so set the phone's own timer too: no web page
  can ring from a locked phone. The beeps carry no words, so a status says
  which timer ran out and what to do ("Potatoes: time is up. With oven
  mitts, take the pan out and add the vegetables.", the timer's `done`), or
  which simmer wants stirring. The `done` line also shows under the clock,
  and beside the chip on any other step, while the time is up. "Start timer" is a full-width solid button above the Why and
  hands focus to "Stop timer", which asks first when more than a minute is
  left, hands focus back, and reads "Clear timer" once the time is up; a
  dashed chip hands focus to the chip that then counts it down. "Finish and
  log it", like "Leave cook mode", asks first when a timer is running. Each
  step ends with "Next:" and the first sentence of the next one.
- **Timers are end times in `localStorage`** (`lib/timers.ts`), per account
  and recipe, keyed by label (unique in a recipe, which `curriculum.test.ts`
  checks), not by step number: a deploy that splits a step mid-cook would
  move the timer to the wrong step. A stored label the recipe no longer has
  is left out when cook mode opens. A cook left mid-way has its timers
  forgotten on a load once they ended longer ago than a cook in progress is
  kept (`forgetOldTimers`, the signed-in account's only: another account's
  stored data is never read, so it cannot stop this one loading), and cook
  mode clears a recipe's stored timers when it opens a new cook of it (none
  of that recipe in progress), so an old cook's never count as started. One check (`components/useCookTimers.ts`) plays every
  ring, so a timer that ran out while the phone was locked rings when the
  cook looks again. Sound needs a tap first: after a reload cook mode says
  "Tap anywhere so your timers can ring", hears the tap at its end
  (`pointerup`, `touchend`, or a key: what a phone counts as a tap that may
  play sound), and drops the prompt only once the sound is on. A timer
  finished more than 30 minutes ago (`STALE_AFTER_MS`), or stopped, is
  hidden but stays stored until the cook is over, so on the step right
  after one the cook passed by unstarted, a dashed chip ("Potatoes: start
  15:00") starts it: only there, so a cook who judged by eye is not asked on
  every step, and only if this cook was on that step (one that began
  partway, as leftover rice does at egg fried rice's step 3, never saw it).
  "Leave cook mode" and saving the cook clear the recipe's timers, and
  `end()` stops cook mode saving them again, so a ring's late tap cannot
  bring them back.
- **Install to the home screen.** `public/manifest.webmanifest` (standalone,
  start and scope `./`, so it opens at the menu under `/first-course/`), the
  plate as `icon-192.png`, `icon-512.png` (also maskable: the plate sits in
  the middle 80%) and `apple-touch-icon.png`, drawn by `npm run icons`
  (`scripts/icons.ts`, using Playwright's Chromium; the PNGs are committed).
  There is no service worker: the app needs the network for Supabase anyway,
  and a cache would serve stale deploys. Standalone mode has no browser Back
  button, so every screen keeps its own way back to the menu.
- **A cook the phone interrupted comes back.** Cook mode keeps the cook in
  progress on the phone (`lib/cooking.ts`: recipe, step, the step it began
  at, how many cooks of it the log held then, when), and "Finish and log
  it" marks it cooked. An installed app the phone closed reopens at the
  menu, which says "You were cooking …: step 7 of 12" with "Back to step 7",
  and any timer still on ("Potatoes timer: ends at 6:42 PM.", or "Potatoes:
  time is up."; only cook mode can ring it), for 12 hours
  (`RESUME_FOR_MS`), or "You finished …. How did it go?" with "Log it",
  until the end of the next day; until "Leave cook mode", a saved cook,
  "Not cooking it now", or one more cook of that recipe in the log than
  when it began (logged on another device; a second cook of a dish the same
  day still comes back). "Log it" the next morning dates the cook the day
  it was finished, not today. "Log a cook" from the recipe page while a
  timer of the recipe runs asks before saving stops it. Cook
  mode's step counter is its live region, with the step's words hidden
  after it, so a screen reader hears each new step while focus stays on
  Next step.
- **What is ready tonight.** The suggestion card says when dinner would be
  ready if the cook started now ("55 minutes: start now and eat around 6:55
  PM", `readyAt`, to the nearest 5 minutes, from a beginner's
  `totalMinutes`), and so does step 0, whose "Read every step once first"
  opens the steps. When the suggestion needs no shop (bought and fresh, or
  the pantry covers it, `readyTonight`; how bought groceries stand is under
  "Bought meat"), the card leads with Start cooking. Under the card, "Also ready tonight, with what you have"
  lists up to three other such recipes, quickest first.
- **A cook can be logged without cook mode**: "Log a cook" on the recipe
  page opens the same form (`/cook/:id/log`, behind the same `cookable()`).
  The form has a "Cooked on" date, today in the cook's time zone by default
  (or the day cook mode finished it) and never later, for a cook made away
  from the app.
- **The last note comes back.** The most recent note on a recipe's cooks
  (`lastNote` in `progress.ts`: latest `cooked_on`, then latest saved) shows
  under the recipe page's buttons and on step 0 of cook mode, as "Last time
  you wrote: …".
- **New pages open at the top, with focus on the heading.** `App.tsx`
  scrolls to top on every push or replace navigation and focuses the page's
  `h1`, so a screen reader starts there; Back and Forward keep the browser's
  position, and so does a "Menu" back link (`menuScroll.ts`: the installed
  app has no Back button, and a cook browsing the Fourth course should not
  land at the top each time). A save lands at the top, where its notice is.
  Focus stays put when the screen already placed it: the tapped
  link is still there (Next step in cook mode keeps focus for the next tap),
  or a full-screen moment took it. Every screen names itself with
  `usePageTitle` ("This week · First Course"; cook mode says the step).
- **A failed load offers "Try again".** If any of the opening reads fails,
  the message stays on screen with a button that loads everything again,
  for a phone with weak signal. While it loads, the screen shows the
  wordmark and a plate, not a line of text. Every request gives up after
  15 seconds (`fetchWithTimeout` in `supabase.ts`), so a store with one bar
  of signal gets "No connection" and Try again, not a page that never
  finishes; past 5 seconds the loading screen adds "No answer yet. Your
  phone may have no signal." The Data API client's own retries are off
  (`retry: false`), or a minute would pass before "No connection". An error
  page from a gateway is never shown as HTML: `plainMessage` says "Supabase
  is not answering. Try again in a minute." A request that must renew the session first
  can take longer: the auth client retries a renewal for up to about 30
  seconds. A request with no session never goes out as nobody:
  `fetchAsTheCook` fails it at once, as "No connection" when the session
  could not be renewed for want of signal, and as "You are signed out on
  this phone." when there is none.
- **A session that ran out with no signal is not a sign-out.** Opened more
  than an hour after last use, with no signal, the stored session cannot be
  renewed, and the auth client reports none. The app asks again, sees the
  renewal failed for want of signal, and says the sign-in needs signal to
  renew, that the cook is still signed in, and that it opens by itself once
  the phone has signal (the auth client renews in the background, and the
  app hears `TOKEN_REFRESHED`), never the sign-in screen. Its Try again
  reloads the page: after a failed renewal the auth client will not ask
  again for a minute, and a fresh page asks at once. A sign-out heard
  meanwhile (the session ended on another device) goes to Sign in.
- **The app catches up after a while away.** Back from 10 minutes or more
  hidden (`REFRESH_AFTER_MS` in `App.tsx`), it loads the log, the chef and
  the shop again, so a cook logged or a recipe planned on another device
  shows up: an installed app is never reloaded otherwise. A failed catch-up
  keeps what is on screen and says so above the page, with "Try again".
  Every write's change applies to the latest state, never to what a screen
  drew from, and `App.tsx` counts writes: a catch-up that was out while a
  write landed may have read the database before it, so it is thrown away
  and read again. A cook deleted elsewhere
  turns its change screen into "That cook is not in your log".
- **A save is never logged twice.** The log form makes the cook's id once
  (`newCookId` in `cookLogs.ts`), and sends it with the insert. When a save
  lands but its answer is lost on weak signal, the retry hits the duplicate
  key and saves what the form says now over it (`updateCookLog`), so a
  rating changed between taps sticks. A cook already in the log (a
  catch-up brought it in) is replaced, not added again, and the notice is
  worked out without it. Deleting finds nothing to delete when an earlier
  try landed: the cook is gone either way. Creating the chef twice returns
  the chef that exists.
- **A cook is never dated after today**, nor before 1900 (the database
  takes four-digit years): `checkCookedOn` in `format.ts` says so beside the
  date field, tied to it, on both cook forms, as well as the field's `max`
  and `min`. The change-cook form checks the date only when it was changed,
  so a cook logged on a device a day ahead still saves its notes.
- **Email links come back in the hash**, where the hash router would take
  them for a page. The client is created with `detectSessionInUrl: false`,
  and `supabase.ts` reads the hash itself, removes it with `replaceState`
  (so neither the tokens nor an error stay one Back away in the history),
  and signs in from the tokens with `setSession` (`signInFromLink`).
  `App.tsx` shows nothing until that finishes, then "Set a new password"
  for a reset link (`type=recovery`) before anything else. A failed link is
  shown in the app's own words ("That email link has expired.", from
  `error_code`), never the link's text, which anyone could write; the
  screen then says how to get a new link. It is shown once (App state, not
  the module constant), so it does not come back after a later sign-out,
  and a cook still signed in from before sees it above the menu with
  "Hide this". The reset email goes to the Supabase project's Site URL, the
  Pages URL, so a reset asked for on localhost lands on the live site.
  Supabase's built-in email sender allows only a few emails an hour.
- **Another account's email link asks first.** A link carrying a different
  account's tokens (anyone can send one) does not sign in on its own: the
  app asks "Switch accounts?" with the current account as the default.
  Whose link it is comes from Supabase (`linkOwner`: a plain request to
  Auth's `/user` with the link's token, not the auth client, which signs
  out the cook signed in here when the server refuses a token), never from
  reading the token: a forged token could name any email in the prompt
  (docs/decisions.md). A link Supabase refuses, or a token that is not a
  token's shape, says "That email link did not work." and asks nothing. A
  link that lands with no signal, while Supabase answers with a 5xx, or
  while the sign-in already here cannot be renewed (so who is signed in
  here is unknown) is kept in memory for Try again (`LinkUnreachable`),
  never used to sign in without asking. Errors never repeat text from the
  address bar (`recipeFromRoute`). The menu says "Signed in as …" beside
  Sign out, so a cook can see whose kitchen this is.
- **A content security policy** is a meta tag in the built page
  (`vite.config.ts`): scripts, styles, fonts and images from the app itself,
  requests only to its Supabase project.
- **Sign in, create an account and reset are three modes of one screen.**
  Creating an account has its own form ("New here? Create an account"),
  with `autocomplete="new-password"` and the 8-character hint. Each mode has
  its own heading, which takes focus when the mode changes.
- **Before the first cook**, the menu shows "Where to start": check off the kit,
  check off the pantry, plan, shop, cook, each checked off from the data. Until
  any kit is checked off, equipment lists show one pointer to the kit instead of
  "Not in your kit yet" on every tool, and the menu's First course says
  "Check your kit" instead of a count of things to get.
- **The menu folds a course** whose every recipe is mastered, behind "All N
  recipes mastered". Its suggestion card leads with the move the week
  needs: "Add to this week" when the dish is not planned, "Shop for it"
  when it is planned but not bought, "Start cooking" once it is. The card's
  heading is named with its label ("Cook this next: …").
- **Focus follows the change.** A control that a write takes away hands
  focus to what replaced it (`focusAfter` and `useFocusTarget`): "Add"
  under More for this week to the recipe on the plan, "Have it" to the next line
  of the list (not the top of a long one), "I have all of these" to "You
  have all of it.", "Wear it" to "Wearing it.", Done shopping to its
  message, "All eaten" on the last leftover and "Not cooking it now" to the
  suggestion's heading, "Stirred" to Next step. Where a write only renames
  its button ("Add to this week" becomes "Take off this week"), the status
  beside it says what landed ("Added to this week."). The target is named
  only after the write succeeds (a failed one leaves focus on its button),
  only if the cook is still on the same screen, and only for 1.5 seconds;
  navigating clears it. A button that cannot act yet (busy with its write, or a form not ready)
  says so with `aria-disabled` rather than `disabled`, which would drop
  focus to the top of the page, and ignores the tap (`useWrite`): Save this
  cook with no rating moves focus to the ratings, Create chef with no name
  to the name. Tapping a price puts the cursor in it, and closing the form
  goes back to the price. A field's hint ("At least 8 characters.") sits
  outside its label and is tied to it with `aria-describedby`, as is a
  field's error.
- **Every screen has a `main h1`**, which navigation focuses; a screen
  without one throws "The page at … has no heading". An address that is not
  a screen throws "That page is not on the menu.", which the error screen shows.
- **Money reads like money** ("$1,338.32", `formatCents`), and times of an
  hour or more read in hours ("2 hours 45 minutes", `formatMinutes`).
- **Zoomed far in** (a page about 200 CSS pixels wide, as at 200% on a
  phone), the gutters slim down and cook mode's buttons, the price lines and
  the chef sheet's head stack; cook mode's buttons stop sticking to the
  bottom, where stacked they would hold a third of the screen, and the
  full-screen moment's plate and art shrink (the art at a whole 4 pixels a
  pixel). With text at 200% instead, rows wrap: a price under its name,
  cook mode's buttons a row each, the chef sheet's record fewer across.
  The e2e suite checks that no screen runs off the side, both ways. The
  installed app turns with the phone (no `orientation` in the manifest).
- **A cook can be changed or deleted** at `/cook-log/:id`, reached from
  "Your cooks" on the recipe page. The date, rating and notes change; the
  recipe never does. Because progress is derived, the screen first says what
  a change or a delete would take away (`progressLost` in `progress.ts`:
  skills unlearned, recipes locked again, masteries undone), and the delete
  asks to confirm. "Your cooks" lists the newest cooking day first, and a
  line under the blurb ("13 cooks, last Oct 2, 2026") jumps to it, past a
  long method. The log is read 1,000 rows at a time (the Data API's
  limit), so a long history loads in full.
- **Sign-out signs out this phone only** (`scope: 'local'`), as the screen
  says; another device stays signed in.
- **Sign-out says what happened.** The auth client signs the phone out even
  when the server never hears it (no signal), and the sign-in screen says
  so. The exception is a session that cannot even be loaded (no signal and
  a token past its hour): then nothing changed, and the menu says "Could
  not sign out: No connection. Check your signal and try again." The app
  tells the two apart by the `SIGNED_OUT` event.
- **React Router navigates inside a transition.** A screen that removes the
  thing it is showing (deleting a cook) must make both changes in one
  `startTransition`, or React draws the screen once without its data and
  reports error 520. The e2e suite catches this as a page error.
- **The cart lives on the phone; the other shop writes are not
  optimistic.** This is the one description of the cart. A store is where
  signal is weakest, so a check, a grocery line or a tool in the list's kit
  aisle, is kept in localStorage (`lib/cart.ts`, per account) and never
  waits on the network; the checks reach Supabase together, in the one
  `finish_shopping` call (Done shopping), which puts the staples in the
  pantry and the kit in the kit, and stay on the phone if it fails ("Your
  checks are kept on this phone."). (Rowan's calls; docs/decisions.md.) The
  cost is that a second device does not see checks live, and that a phone
  that closed the app needs signal to load the list again, which the list
  says (share it to Notes first). The cart keeps the recipes its list was
  for and when a check last changed, and settles to the list on every load
  and every change of the shop (`settleCart`): what it holds stays bought,
  so a checked staple stays until Done shopping puts it in the pantry and
  checked kit until it is in the kit, even when the recipe it was for was
  cooked first (This week then offers Done shopping for them); a check on
  anything else stays only on a line still listed and not used by a recipe
  new to the list (planned on another device, say). A cart nobody has
  checked anything in for two days (`CART_KEEPS_MS`) is forgotten. Its
  checks never say "Saving…": nothing is sent. Every other shop write (the pantry, the kit screen, the
  plan, prices) changes the screen only after Supabase says it succeeded,
  and says "Saving…" until then. The `grocery_checks` table is shut (00010).
- **The chef can be changed but not deleted.** Name, look and extras are
  editable at `/chef/edit`. The grant is column-level, so `user_id` and
  `created_at` cannot be updated even by the owner. Supabase refuses an
  update with no filter, which is why `updateChef` takes the user id.
- **Extras are earned per track** (`lib/extras.ts`): good cooks of every
  recipe on the track, usual included, at 5 and at 15. The chef row keeps
  the extras the cook chose (`extras text[]`, at most one per slot, which
  `toChef` checks); the sprite wears only those still earned
  (`wornExtras`), so deleting a cook can take one off, and it comes back
  when it is earned again. The editor shows locked extras with how to earn
  them, the chef sheet counts progress, and the after-cook notice names a
  new one.
- **All ten migrations are applied to the live project** (00001 to 00010;
  what each changed, when it went live, why, and what its test checked are
  in docs/decisions.md, and the result is under "The schema today"). Rowan
  pushes each migration before the app code that needs it deploys: a
  migration always goes first.
- **Testing a migration on a throwaway stack.** Before the push, run the
  migration on a throwaway local Supabase stack (Postgres 17, PostgREST,
  Auth) and have a script make the app's calls through supabase-js as two
  cooks and as anon. Copy `supabase/` to a scratch folder, give
  `config.toml` its own `project_id` and ports outside Windows' reserved
  ranges (`netsh interface ipv4 show excludedportrange protocol=tcp`), and
  `npx supabase start --workdir <folder>`. Another project's stack may
  already hold the default ports; leave it running. Set
  `auto_expose_new_tables = false` under `[api]` in the scratch config:
  without it the local stack grants everything to `anon` and
  `authenticated`, and the grant checks fail for the wrong reason. (00008,
  00009 and 00010 were checked on a stack left at the exposing default
  instead, as the live project is.) The script can use the app's own
  `@supabase/auth-js` and `@supabase/postgrest-js`, built as `supabase.ts`
  builds them.
- **Upserting a price override needs the update grant on `ingredient_id`**,
  not only `price_cents`: PostgREST's upsert sets every column it was sent,
  and Postgres checks that privilege before it knows whether the row exists.
  Tested both ways.
- **Grocery prices are estimates** for a midwestern supermarket, October
  2026, until the cook corrects one on the grocery list. A corrected price
  replaces the estimate everywhere, past cooks' kept totals included.
- **Email confirmation is on for the live project**, and its Site URL is
  the Pages URL. Sign-up returns no session until the email link is
  clicked; the sign-in screen says "Check your email" as a plain notice.
  Signing in before the link is clicked fails with "Email not confirmed",
  and the screen offers "Send the confirmation email again" (`auth.resend`).
  An expired link's message comes with how to get a new one. The e2e fake
  does this with `confirmEmail: true` (and `unconfirmed: true` for the
  seeded account) in the seed and otherwise behaves like development
  (confirmation off).
- **Security: open items**, from the reviews of October 6 and 9, 2026 (what
  they found and fixed is in docs/decisions.md).
  - The app is served from `rowanflynnpilot.github.io`, an origin it shares
    with about 40 of Rowan's other Pages sites, some loading third-party
    scripts. localStorage, and so the session, is per origin: a compromised
    script on any of them could read the refresh token. The fix is an
    origin of its own (a dedicated GitHub organization, whose `*.github.io`
    is a separate site, or a custom subdomain), then the Supabase Site URL
    and redirect list. Rowan's call; not done.
  - Sign-ups are open and nothing limits rows per account, so anyone could
    fill the free database or use up the email allowance a password reset
    needs. Turn "Allow new users to sign up" off until going public. The
    live minimum password length should be 8 (the server default is 6; the
    app checks 8 only in the browser), with "secure password change" and
    "secure email change" on.
  - What going public needs is under "Going public", in "Later,
    unscheduled".
- **Generating the database types.** `src/database.types.ts` is generated
  from the migrations, never written by hand. After a new migration, copy
  `supabase/` to a scratch folder with its own `project_id` and ports (as
  for testing a migration), delete `.temp/project-ref` and
  `.temp/linked-project.json` there so nothing can reach the live project,
  start it, and run `npx supabase gen types typescript --local --workdir
  <folder> --schema public`. Keep the header comment. The types know
  nothing of column grants or row-level security; the e2e fake checks
  those. `db` in `supabase.ts` is typed with them, so a column that does not
  exist is a compile error.
- **The Supabase clients.** `supabase.ts` makes `auth` (`AuthClient`) and
  `db` (`PostgrestClient<Database>`). The session is stored under
  supabase-js's key, `sb-<project ref>-auth-token`, so changing libraries
  signed nobody out; every Data API request carries the key and the
  signed-in cook's token (`fetchAsTheCook`), as supabase-js did.
- **Leftovers.** From the day after a cook of a recipe with leftovers until
  its fourth day (`LEFTOVER_DAYS`), the menu lists them ("From yesterday.
  Eat by Saturday."), with the reheat line and "All eaten" (kept on the
  phone, per account, `lib/leftovers.ts`). Leftover rice points to egg
  fried rice, from step 3, when that recipe is open. The recipe page has a
  Leftovers section.
- **Never `npx supabase config push` the repo's `config.toml`.** It holds
  local-development values (site URL `127.0.0.1`, confirmation off, MFA off)
  and pushing it would reset ten live settings. To change one live setting,
  push a throwaway `config.toml` that declares only that setting (undeclared
  settings are left alone), after `npx supabase config diff --workdir
  <folder> --project-ref yqqxhsacxnvybffrittz` shows that it is the only
  update. That is how confirmation was turned on.

## The schema today

The result of the ten migrations (what each changed, and why: Migrations, in
docs/decisions.md). Every table is keyed by `user_id` with own-rows RLS; only
`authenticated` has grants, exactly the ones the app uses, and nothing new is
exposed by default (tables since 00008, functions since 00010). The live
project was made exposing new tables, which 00008 took back.

- `cook_logs`: select, insert, delete; update of `cooked_on`, `rating` and
  `notes`, never `recipe_id`. An `after insert` trigger (00006) deletes the
  cook's plan row for that recipe in the same transaction, whatever the
  rating; the app drops it when the save returns (`withoutPlanned`).
- `chefs`: select, insert; update of the name, the look and `extras`.
- `plan_items`, `pantry_items`, `kit_items`: select, insert (ignoring
  duplicates, so adding twice is harmless), delete. The plan also updates
  `shopped` and `shopped_on`, both cleared by "Put it back on the list"; the
  app reads `shopped_on` only while `shopped` is true, as an app from before
  00009 clears only the mark. `price_overrides`: select, insert, update,
  delete.
- `finish_shopping(bought_staples, shopped_recipes, bought_on, bought_kit,
  seen_checks)`, `authenticated` only: Done shopping in one transaction.
  Staples into the pantry, kit into the kit, the listed recipes marked
  shopped on `bought_on`, the cook's local date; a recipe shopped already
  keeps its first date. `seen_checks` is ignored and everything after
  `shopped_recipes` has a default, so apps from before 00010 still find it.
- `grocery_checks` is shut (00010): no grants; its rows stay.
- Limits (00008): notes at most 2,000 characters, ids in the curriculum's
  shape (`ids.test.ts` checks every id fits), four-digit years, prices at
  most $1,000, and extras as ids.

## The shop and the kit (Phase 2)

The grocery list, the pantry, prices you can correct, and the kit, reached
from links on the menu (This week, Pantry, Kit, Spices).

- **Plan.** "Add to this week" (and "Take off this week") on any unlocked
  recipe page, and on a locked one once it is `plannable`. One batch per
  recipe; no servings scaling. A recipe stays on the plan until a cook of it
  is saved, marked "Groceries bought" once shopped for (with "Put it back on
  the list" for groceries not bought or gone off), and the menu suggests it
  first. A planned recipe that is locked (planned ahead, or locked again by
  a deleted cook) says "Opens after you cook …", and the change-cook screen
  warns that it is on the plan.
- **Bought meat, and groceries that age.** The app works out the day to
  cook a bought recipe by (`cookBy` in `lib/freshness.ts`: the bought day
  plus the `fridgeDays` of the meat that keeps least, for meat that keeps a
  week or less). Done shopping says it ("Seared chicken thighs with roasted
  broccoli: cook it by Tuesday, or freeze the meat tonight and thaw it in
  the fridge the night before you cook."), the plan row and the recipe page
  say "Groceries bought. Cook it by Tuesday", and the menu suggests the
  bought recipe whose meat is due soonest first, with "Cook it by tomorrow,
  while the meat is fresh." How bought groceries stand (`boughtState`;
  `groceryState` in `shop.ts`) is one of four, and only `fresh` is ready
  tonight:
  - `past`: past the meat's day, the card is labelled "Bought Sunday" and
    says "Unless you froze it, the meat is past its days: throw it out and
    put it back on the list", with that button and "I froze it", and no way
    to start cooking; the suggestion puts it after fresh meat.
  - `frozen`: meat that keeps only days and no date, which is what "I froze
    it" leaves (the recipe stays bought; a recipe bought before 00009 reads
    the same). The card is labelled "In the freezer": "Move it to the fridge
    tonight, and cook it tomorrow." Start cooking is there, not leading.
  - `old`: bought more than a week ago (`ASK_AFTER_DAYS`) with no such meat.
    The card is labelled "Bought Oct 4" and asks "Still have everything it
    needs?", with "Still have them" (it counts from today then) and "Put it
    back on the list", and no way to start cooking until then (Rowan's
    call; docs/decisions.md). The plan row asks too.
- **Grocery list** (`lib/grocery.ts`, `/shop`). In the store the list comes
  first (the count, Share, the aisles, the kit the plan still needs as a
  last aisle, then Done shopping), then the plan; at home, the plan first.
  Under both, "More for this week" offers up to four unplanned recipes in
  the menu's order (`readyToPlan` in `progress.ts`), each with "Add". A
  staple line has "Have it", which puts it in the pantry. Sum `qty` per
  ingredient across the plan's recipes not yet shopped for, drop what the
  pantry has (and list each with what this list uses, and "Put it on the
  list" for one that ran out), packages = `ceil(qty / package.units)`,
  grouped by `section` in store order: produce, meat, dairy, bakery,
  pantry, frozen. Each line shows the package, the count when it is more
  than one, and what the plan uses when that is not whole packages. The
  checkout total is the register cost, and the screen says it runs far
  above the per-serving prices on a first shop. "Share the list" sends what
  is not yet in the cart as plain text through the phone's share sheet
  (`navigator.share`, HTTPS only), to Notes for a store with no signal or to
  whoever is shopping; closing the sheet is not an error.
- **Checking off.** A check goes in the cart ("The cart lives on the
  phone", above). "Done shopping" asks first if anything is unchecked,
  naming it and the recipes that stay on the list for it, then
  `finish_shopping()` puts the checked-off staples in the pantry and the
  checked-off kit in the kit, and marks shopped only the recipes the shop
  covered, every ingredient checked off or in the pantry (`boughtFor` in
  `grocery.ts`), in one transaction. A recipe with a line left unchecked
  (the store was out of chicken) stays on the list with that line's check,
  so its card never says "Groceries bought" over an empty fridge. With
  everything checked, the list says to tap "Done shopping". Recipe titles
  are never joined with "and" (a title can hold one): "2 recipes stay on
  the list for them: A; B.", "Opens after you cook A, then B".
- **Pantry** (`/pantry`). Every `staple: true` ingredient, filed like the kit
  under the first course that uses it (`staplesByCourse` in `grocery.ts`),
  with a toggle. The kit ends with "Next: your pantry" and the pantry with
  "Next: plan this week". What a staple is: used a little at a time and
  keeps for weeks. A can or a pack of meat is used up whole, so it is not
  one; garlic, fresh ginger, a parmesan wedge, eggs, a tube of tomato paste,
  a block of cheddar and a loaf of sandwich bread (kept in the freezer) are.
  A box of spaghetti is not: two recipes use all of it. The salad uses its
  whole 4 oz tub of feta, which nothing else uses. Packages are sized so a
  beginner wastes little: a can of broth, not a carton; a half pint of
  cream; a single large russet; a 5 lb bag of rice, which ten recipes draw
  on.
- **Price overrides.** Tap a price on the grocery list to correct the
  package price, or go back to the estimate. Every price read goes through
  `packagePriceCents(id, prices)` in `cost.ts`; kept totals use current
  prices, not the price on the day.
- **The kit** (`curriculum/equipment.ts`, `lib/kit.ts`, `/kit`). Equipment
  has typed ids like ingredients. `coveredBy` says when one item does
  another's job (a stainless or cast-iron 12-inch skillet is also a 12-inch
  skillet). The kit screen files each item under the first course that
  needs it, with "I have all of these" on each course (one request); the
  menu says how many things each course still needs; recipe pages and step
  0 of cook mode mark "Not in your kit yet"; the shop screen lists what the
  week's plan still needs, as the list's last aisle.
- **The spice guide** (`curriculum/spices.ts`, `lib/spices.ts`, `/spices`).
  The eight spices the recipes use, each filed under the first course that
  needs it (derived from the recipes, like the kit) with a link to that
  recipe: what it tastes like, what to buy, how to use it, and everyday food
  to try it on. It opens with seven habits (buy small, read the label,
  refill jars from bags, the smell test, cool and dark, bloom in fat, add a
  little and taste) and ends with five jars worth adding later. It marks
  what is in the pantry and stores nothing. A guide entry is keyed by
  `IngredientId`, and `spices.test.ts` fails if no recipe uses one. A recipe
  that adds a new spice should add its guide entry, and the guide's advice
  must match the recipes (what the read-back found where it did not:
  docs/decisions.md). An everyday idea that involves raw meat points to a
  recipe with a thermometer step, not a free-form rub.

## Where things stand, and what comes next

As of October 9, 2026: Phases 1 to 3 are built and deployed, all 31
recipes are written (four courses and the usual), all ten migrations
(00001 to 00010) are on the live project, and every push runs 198 unit
tests and 226 e2e tests before it deploys. How the project got here,
decision by decision, is in docs/decisions.md.

What comes next, in order:

1. **Cook on a real phone**: the things only a phone can show are listed in
   the README's definition of done.
2. **Revise from real cooks.** Every recipe has been read back by a
   beginner reviewer but none has been cooked from the app yet. Note what
   reads wrong at the stove and fix it under "Writing a recipe".
3. Then the list below.

## Later, unscheduled

- **Send the list to a store.** Turn the grocery list into a store cart or
  pickup order. Which store APIs allow this needs checking at build time.
- **Pour from the journal.** Show bottles rated in Pinpoint Noir that fit a
  recipe's pairing. Needs a decision on shared auth between two Supabase
  projects.
- **More of the sprite.** A walk cycle, a back view, or a pixel kitchen
  behind the chef on the sheet. The idle bob is built; the rest only if it
  earns its place.
- **Whether the streak earns XP.** It is display only today.
- **Servings scaling.**
- **Import a recipe from a link**, with Claude tagging its skills. Only
  after the curriculum exists, and storing the link plus your own notes, not
  the source's text.
- **Going public.** Per-account row caps, CAPTCHA on sign-up, sign-in and
  reset, a custom email sender, token-hash email links (`verifyOtp`) so
  session tokens never sit in the address or the browser's history list,
  account deletion and export, a privacy policy and terms, an age gate or an
  off switch for wine pairings, picking your own "usual" at signup, a
  placement step for people who are not starting from zero, and regional
  prices. Email confirmation and password reset are done; until going
  public, see "Security: open items".
