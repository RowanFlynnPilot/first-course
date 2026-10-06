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
  error boundary in `main.tsx` puts any thrown message on screen.
- Surgical changes. One responsibility per function. Fix root causes.
- Let TypeScript catch it. The curriculum is typed data, so a misspelled skill
  or ingredient id is a compile error, not a runtime check.
- Don't overengineer. No state library, no CSS framework, no query cache.

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

React 19, Vite 8, TypeScript 6, React Router 8 (imports come from
`react-router`), Supabase (Postgres, Auth), Vitest, Playwright (dev only), oxlint. Deployed by GitHub
Actions to GitHub Pages at `/first-course/`.

```
CLAUDE.md
README.md                      bring-up, definition of done, publishing
.github/workflows/deploy.yml   build job (lint, test, e2e, build; read-only), deploy job (Pages);
                               a pull request runs the checks only. Actions pinned to commits.
.github/dependabot.yml         weekly updates for npm and the actions
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
                                 the recipes and ticks this device showed)
                               00008_grants_and_limits.sql (the grants the migrations
                                 meant, and limits on notes, ids, prices and dates)
app/
  playwright.config.ts         e2e: phone viewport, its own build against the fake
  e2e/                         fakeSupabase.ts, kitchen.ts (fixture), *.e2e.ts, screens.e2e.ts
  scripts/icons.ts             draws the home-screen icons (npm run icons)
  public/                      icon.svg, manifest.webmanifest, icon-192/512.png, apple-touch-icon.png,
                               fonts/ (the two typefaces, self-hosted, and their licenses)
  index.html                   font preloads, the manifest and the touch icon are linked here
  src/
    main.tsx                   root + error boundary
    App.tsx                    auth gate, loads logs + chef + shop, routes, scroll, notice
    supabase.ts                client; throws if env is missing; reads an email link's result first
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
      leveling.ts              the chef: XP, level, rank (and its costume), discipline stats
      streak.ts                weeks in a row with a cook, from cooked_on
      badges.ts                the 31 badges and the rule for each, read off the log
      notice.ts                what one cook earned: lines, level-up, promotion, badges, the usual
      timers.ts                cook-mode timers in sessionStorage, keyed by label
      cost.ts                  cook cost, order cost, kept; packagePriceCents() is the one price read
      grocery.ts               the grocery list: whole packages per store section, checkout total
      kit.ts                   what equipment a set of recipes needs, and what is missing
      extras.ts                the 8 extras, the track and good-cook count that earns each, what is worn
      spices.ts                the spice shelf: each spice under the course that first uses it
      cookLogs.ts, chefs.ts,   the only Supabase reads/writes; rows -> app data
        shop.ts                  (shop.ts: plan, pantry, checks, prices, kit, finish_shopping)
      format.ts                money, quantities, dates, lists
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
      CheckRow.tsx             a checkbox row that saves itself (grocery list, pantry, kit)
      useWrite.ts              busy + error for one write from a button; a tap while busy does nothing
      useFocusTarget.ts        where focus goes when a write takes away the control that made it
      LockedNotice.tsx         "Locked. Learn … from …" and the way there; the page cook mode and
                                 the log form show for a locked recipe
      usePageTitle.ts          each screen's title: "This week · First Course"
      useCookTimers.ts         cook mode's timers: persisted, chimed from one check
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

**Courses are gates** (Rowan's call, October 5, 2026). Every recipe in the
Second, Third and Fourth courses requires a skill taught in the course just
before, so a course opens only once the one before it is under way, and
`curriculum.test.ts` checks it. Before that, five Fourth-course dishes
opened during the Second course and shallow frying could be a ninth recipe.
The oven fries moved to the Second course, and the pan pizza, the cutlets
and the chicken tikka to the Third; carbonara now needs the aioli's egg
separating and the pan sauce's spooning off fat, and the green curry needs
the masala base's cue. The courses now hold 6, 7, 8 and 3 recipes, and the
Fourth course adds no new kit or spice. The usual is not gated by course:
a dish comes into reach when its skills are learned.

**Every recipe is written, the usual included (31 recipes).** `content` is
required on `Recipe`, so the type system rules out an unwritten recipe, and
nothing in the app handles one. Once a dish of the usual is in reach, the
menu says "In reach. Cook it any time."

The Second, Third and Fourth courses and the usual were all written on
October 4, 2026, ahead of the "one course ahead of the cook" pace, at
Rowan's request. From here, real cooks should shape the recipes: when a
step reads wrong at the stove, change it under the rules below.

### Writing a recipe

Fill in `content` for a recipe in `recipes.ts`. Rules:

- Assume zero knowledge. Name the pan, the heat setting, and what "done"
  looks, smells or sounds like. Never write "cook until done".
- Each step is one screen in cook mode. One action or one tight group.
- `why` is where the teaching happens. Give the reason, briefly. Not every
  step needs one.
- `timer` only where a clock is the right judge (oven, rice, resting):
  `{ seconds, label }`, where the label is a word or two ("Potatoes",
  "First rise", at most 16 characters) that names it on the chips cook mode
  shows while it runs on another step. Where the cook should judge by eye,
  leave it `null` and describe the cue. The recipe page prints each timer
  under its step ("Timer: 15 minutes"), so a timer runs in whole minutes.
- A step that says "while that cooks" is fine: timers keep running across
  steps in cook mode.
- New ingredients go in `ingredients.ts` with a section, one unit, a package
  and a price estimate. Quantities are whole quarters (`curriculum.test.ts`
  checks): a standard set of measuring spoons stops at ¼ teaspoon, any sum
  of quarters prints on the grocery list, and the self-hosted fonts carry
  ¼ ½ ¾ but no eighths. `formatQty` throws on anything else. (On October 5,
  2026 the eggs' ⅛ teaspoon of pepper plus the salad's ¼ crashed This week;
  eighths were added, then dropped on October 6 when the pepper became ¼.)
- Salt quantities assume Morton coarse kosher salt.
- When one ingredient is used in several steps, say which part each step
  uses ("½ teaspoon of the salt", "the remaining 2 tablespoons") and put the
  split in the `prep` note, so the amounts add up to the list.
  `curriculum.test.ts` fails when a step says "of the X", "the remaining X",
  "half the X" or "the rest of the X" and X's line has no prep note. When a
  recipe has two of something (two oils), name which one: "the neutral oil".
- Equipment is a list of `EquipmentId`s from `equipment.ts`, and it lists
  everything a step uses, down to measuring spoons, oven mitts and paper
  towels: the kit screen and "Not in your kit yet" are only as honest as
  this list. `kit.test.ts` fails on a catalogue item no recipe uses, and
  `curriculum.test.ts` fails when a step names a tool (a fork, paper towels,
  tongs, a saucepan…) its recipe does not list.
- A step's text is at most `STEP_MAX` (360) characters, about ten lines in
  cook mode on a phone. Longer steps get split.
- Every ingredient in the meat section declares `safeTempF`, and the type
  requires it: a temperature for raw meat (chicken 165, ground beef 160, a
  whole cut of beef such as flank steak 145), `'cured'` for bacon, or
  `'fully-cooked'` for the smoked sausage. Bacon is cured and cooked until
  crisp, so crisp is the cue, but it is still raw pork in the package, so it
  gets cut last and its board, knife and hands get washed. A recipe using raw
  meat must list `thermometer`, say "at least N°F" where the cook checks,
  say "wash your hands", and clean what the raw meat touched in "hot, soapy
  water"; with bacon, the last two. `curriculum.test.ts` checks all of it.
  Cut vegetables before raw meat, never rinse chicken, keep a raw plate and a
  cooked plate, wash tongs after they touch raw meat, and never pour fat
  down the sink.
- Salt and pepper for raw meat are measured into a small bowl before the
  package opens, so hands that touched raw meat never touch the salt box.
  Six chicken thighs do not fit a 12-inch skillet with room between them:
  cook them in two batches of 3, and wash the tongs before they touch cooked
  chicken, or lift the cooked food with a utensil that never touched raw meat.
- Hands that touched raw meat get washed before they touch plastic wrap, a
  bottle, or the fridge door. Tear off plastic wrap before the package
  opens, and put leftover raw meat back in the fridge before your hands
  touch it (lift what you need out with a fork).
- Whatever was cut before the raw meat moves off the board, onto a plate or
  into a bowl, before the meat lands on it.
- Raw meat comes out of the fridge in the step that uses it, and sliced raw
  meat waiting for its turn goes back in, covered. Cook mode's step 0 says
  "Leave the meat in the fridge until the step that uses it" for any recipe
  with a meat ingredient. Salt bowls touched by raw-meat hands get washed.
- A skillet that has been on the heat is moved, tipped or tilted only with an
  oven mitt on the handle. Push the food aside before tilting a pan to spoon
  off fat: one hand tilts, the other spoons.
- Check that the food fits: a 12-inch skillet has a flat bottom about 10
  inches across. Pounded cutlets of 4 ounces fit two at a time; bigger ones
  do not.
- Every thermometer check says where to push the probe, to keep the tip off
  the pan (which reads high, the dangerous direction), to wait until the
  number stops climbing, and what to do if it is low. In thin food (a cutlet
  in oil, a strip of chicken on a spoon) the tip must sit in the middle of
  the meat: a tip that pokes out reads the oil or the spoon.
- Measure in spoons a standard set has: "1½ teaspoons", never "½
  tablespoon", and never less than ¼ teaspoon.
- A step that starts a long timer the cook should not wait on (a dough's
  rise while the oven heats) says to go straight on to the next step. A
  timer rings only at zero, so never write "when the timer shows 30 minutes
  left": split the wait into two timers (the ragù simmers 2 hours on one
  step, then 30 minutes on the next, while the pasta water heats).
- A utensil that touched raw meat (tongs, a spatula that spread it in the
  pan) is washed before it moves or stirs cooked meat. Sliced raw meat that
  marinates or velvets waits covered in the fridge.
- Any move, lift, slide, tilt or swirl of a pan that has been on the heat
  names an oven mitt in that step (`curriculum.test.ts` checks), small
  nonstick skillet included. Never tip a hot skillet onto a plate: lift the
  food out with the spatula.
- Smash patties are pressed to about 5 inches across, at opposite edges of
  the pan: two at ¼ inch would be 12 inches, wider than the pan's flat.
- Any recipe a cook can reach before the aglio (which teaches it) says how
  to peel garlic.
- When two very different products share a name, the ingredient says which
  one (pourable Thai tamarind concentrate, not the thick black paste), and a
  why says what to do with the other.
- Say "turn off the burner" (and "turn off the oven") where the heat is done,
  once for each pan that was heated ("both burners" counts twice), and in the
  same step that drains a pot; `curriculum.test.ts` checks all three.
  Name oven mitts wherever a hot pan comes out of the oven, a hot metal
  handle gets held, or a pot of boiling water gets drained (colander in the
  sink, tip the pot away from you).
- A step the cook will sit on for a long time (water coming to a boil, pasta
  cooking) repeats any reminder that matters, such as stirring a simmering
  sauce, because the earlier step is no longer on screen.
- A sauce with a raw egg yolk uses `pasteurized-eggs`, and says why.
- After writing, have someone read every step as a person who has never
  cooked. The October 2026 read-back of the Second and Third courses found
  burners never turned off, raw-meat hands on the salt box, and no plan for
  a second batch; all three are now rules above. The read-back of the Fourth
  course found vegetables still on the board when raw meat landed on it (in
  the shipped chicken stir-fry too), plastic wrap and the fridge door touched
  with raw hands, cutlets too big for the pan, a thermometer tip reading the
  oil, and an electric burner still hot under the carbonara; the first four
  are rules above, and the last is why a pan comes off the burner before
  eggs go in. The read-back of the usual found the meat out of the fridge for
  most of an hour, hot skillet handles held bare, a "30 minutes left" cue on
  the wrong step, a cutting board rested on a 500°F pan, and the wrong kind
  of tamarind; those are rules above too.
- `delivery.menuPriceCents` is the in-app menu price of one serving of the
  nearest thing you would order. A pizza's serving is a share of the one you
  would order, not a whole pizza: the margherita is $10 a serving, half of a
  large one.
- `pairing.principle` is a general rule ("Match acid with acid"), so the
  cook learns how pairing works, not just what to buy.
- Prefer ingredients that later recipes reuse.
- `npm test` must pass. It checks the graph rules listed at the top of
  `recipes.ts` and that every recipe costs less than ordering, plus the
  rules above that a test can read: a recipe with raw meat needs doneness
  (taught by the seared thighs) somewhere below it; a step that cuts, chops
  or slices lists the knife, "the board" lists the cutting board, and "open
  the can" lists the can opener; a split prep note ("1 for the beef, ½ for
  the sauce") adds up to the list; every safe temperature has one full
  thermometer check (the tip or probe, "stops climbing", what to do if it
  is lower); a step that separates an egg uses `pasteurized-eggs`; a timer
  of 30 minutes or more says to go on, or what happens meanwhile; pouring
  into the colander names oven mitts and "away from you"; quantities are
  whole quarters; moving a hot pan names an oven mitt; each heated pan gets
  its own "turn off the burner"; no step rinses raw meat; `techniques.ts`
  lists skills in menu order (the chef sheet shows them in that order); and
  no recipe uses a whole package of a staple (that is not a staple).
- A sauce that simmers tomatoes for 20 minutes or more goes in a saucepan,
  not the skillet: the kit steers a buyer to cast iron, and long acid
  simmers strip its seasoning and taste of metal.
- Say how to keep a leftover part of a package: half a can of tomatoes
  keeps a week in the fridge or 3 months frozen; leftover raw chicken can
  be frozen; the rest of a can of broth keeps 4 days in a lidded jar, or 3
  months frozen; bacon keeps a week or freezes; the loaf lives in the
  freezer. Leftover rice is spread in a lidded container and in the fridge
  within an hour.
- A side dish (`delivery.side: true`: the chopped salad, the oven fries) is
  compared with adding it to an order you would place anyway: its menu
  price, fees and tip, and no delivery fee of its own. On October 6, 2026
  the salad was briefly a $12 entrée; Rowan chose sides that ride on an
  order instead.
- Open cans during prep, before any heat: never while garlic or ground
  spices sit in hot oil. "Keep the rest" notes go on a calm step (a simmer,
  or its why), never the time-critical one.
- When the cook steps away from a hot pan (washing a tool, waiting on a
  timer), the step turns the burner to low or off and says where it comes
  back up; a washed tool is dried before it goes near hot oil. A pan moved
  off its burner is moved back, with an oven mitt, before it heats again.
- An ingredient listed as softened needs a step that softens it, and bread
  from the freezer a step that thaws it. Part of a staple is measured by
  weight with a picture ("2 ounces, a quarter of a new 8-ounce block"),
  never as a fraction of the package, which may be part used.
- A cloth that touched raw meat (the towel pressed on a smash patty) goes in
  the laundry. Tomato that sits in a pan for half an hour, not only one that
  simmers, goes in a saucepan. Start pasta water no sooner than it takes to
  boil. Say "a lidded container", always.
- "Wrap the rest" lists `plastic-wrap`, and a step that cuts lists the
  cutting board as well as the knife (`curriculum.test.ts` checks both).

## The rules, precisely

`lib/progress.ts`:

- `learnedTechniques(logs)`: skills of every recipe with at least one good cook.
- `recipeState(recipe, logs)`: `locked` if any required skill is unlearned;
  else `ready` with no cooks; else `mastered` at 3 good cooks including a
  "Nailed it"; else `cooked`.
- `nextRecipe(logs, plan, shopped, today)`: the first unlocked recipe on
  this week's plan, groceries bought before groceries still to buy, each in
  the order added (the menu labels it "Groceries bought" or "On this week's
  plan"); else the first in suggestion order, which `readyToPlan` shares: a
  dish of the usual that has come into reach without a good cook yet (what
  everything builds toward), then, in menu order, recipes without a good
  cook (so a Rough cook comes back before anything new), then those not yet
  mastered, then mastered ones, the longest uncooked first, the usual's
  before the courses'. A recipe cooked in the last `REST_DAYS` (7) goes to
  the back, so the suggestion is never what was cooked yesterday. There is
  always a suggestion: once everything is mastered, the card says "Mastered,
  and not cooked since …". (Rowan's call, October 6, 2026: a year-long
  simulation found the menu running dry for the keen cook, re-suggesting the
  dish just made, and a once-a-week cook first reaching a dish of the usual
  around week 46.)
- `teacherOf(technique)`: the one recipe that teaches a skill. A locked
  recipe page names it, with a link: "Locked. Learn heat control from Soft
  scrambled eggs on toast."
- `pathTo(recipe, logs)`: every recipe to cook, each at Decent or better,
  before a locked one opens, each after the ones it needs. When a teacher is
  locked too, the locked notice adds "The way there: …, then this." A course
  whose every recipe is locked says "Opens as you learn … skills".
- `masteryLeft(recipe, logs)` is the one wording of how far a recipe is from
  mastery ("A “Nailed it” masters it."), used by the log form
  (`whatTheRatingDecides`), the recipe page and the menu rows (`rowNote`).
  `ratingLabel(rating)` is the one place a rating gets its name.


`lib/leveling.ts`:

- Cook XP = `tier * 10 * rating`. Tier 1 Rough is 10; tier 5 Nailed it is 150.
- Only a recipe's best 5 cooks earn XP (`XP_COOKS_PER_RECIPE`), so a better
  cook replaces a weaker one and getting better pays. (Rowan's call, October
  6, 2026. With the first five counting, a cook who rated each recipe Decent
  four times and Nailed it once topped out at 14,510 XP, level 17, short of
  executive chef at 15,300, and the keen cook's XP stopped by week 40.)
- +50 per skill learned, +100 per recipe mastered.
- Level `n` needs `50 * n * (n - 1)` total XP: 100, 300, 600, 1000, ...
- Ranks by level: dishwasher 1, prep cook 3, line cook 6, sous chef 10, head
  chef 14, executive chef 18.
- Pacing this was tuned for: the first good cook reaches level 2. Mastering
  the First course lands near line cook. Executive chef needs close to five
  strong cooks of everything (a perfect run tops out at 18,150 XP, level 19).
- Pacing as simulated on October 6, 2026 over a year, five seeds each:
  - At 2 to 3 cooks a week (about a third Nailed it): line cook in weeks 8
    to 11, sous chef in weeks 22 to 31, head chef in weeks 43 to 50. A
    stricter rater (a fifth Nailed it) reaches sous chef around week 31 and
    no head chef in the year.
  - About once a week: prep cook by week 10, line cook by week 52.
  - 4 to 5 a week: head chef by week 26; with best-five XP, executive chef
    in weeks 40 to 47.
  - The usual starts coming into reach around line cook.

`lib/cost.ts`:

- Cook cost = sum of `qty * package.priceCents / package.units`.
- Counted servings = the servings a recipe makes, up to two
  (`COUNTED_SERVINGS`). A cook is dinner for one or two; leftovers count for
  nothing, neither as meals kept nor as cost.
- Order cost = `menuPrice * counted servings * (1 + 0.15 fees + 0.18 tip)`
  plus one `$3.99` delivery fee, except for a side (`delivery.side`), which
  rides on another order and pays no delivery fee. The constants are at the
  top of the file. The recipe page's "You keep" says how many servings it
  counts.
- Kept per cook = order cost minus the counted servings' share of the cook
  cost. Total kept sums it over every cook, including Rough ones (you still
  did not order).

Until October 5, 2026 every serving counted, so one six-serving ragù kept
$150 and the "$100 kept" badge came almost free. Rowan approved the cap of
two. The recipe page says so under "Cook it or order it" on any recipe that
makes more than two servings.

`lib/streak.ts` (display only, earns nothing, gates nothing):

- A week runs Monday to Sunday, from the cook's local `cooked_on` dates.
- The streak is the run of weeks with at least one cook ending this week, or
  ending last week if this week has no cook yet ("Cook this week to keep
  it"). Two weeks back with nothing and it is gone.
- The longest run ever is kept for the badge, so a broken streak does not
  take the badge away.

`lib/badges.ts` (derived, never stored, so editing a cook can take one away):

- 31 since October 6, 2026: First cook, Nailed it (any cook rated 3),
  Mastered (any recipe mastered), one per course cleared (every skill that
  course teaches, I to IV, white numerals), one per course mastered (every
  recipe in it mastered, yolk numerals) and The usual mastered (a plate with
  the yolk ring), one per discipline (every prep, pan, pot, oven, sauce or
  palate skill), $100, $500, $1,000 and $2,500 kept (at today's prices),
  Four weeks running (longest streak 4 or more), The whole menu (every
  recipe cooked once, the usual included), and one per dish of the usual for
  a good cook of it. The fifteen before October 5 all arrived by about week
  8; the 26 after it by about week 21 for a regular cook; the five mastery
  badges land in weeks 22 to 52.
- The after-cook notice shows the badges that cook earned
  (`earnedBadges(after)` minus `earnedBadges(before)`) as their art, whose
  label names them; the notice's lines do not repeat them.
- The notice's first line names the dish and the rating ("Sheet-pan sausage
  and vegetables: Decent. +70 XP."), recipes it unlocked are links, and a
  new extra has "Wear it" when its slot is free ("Swap it in" when not).
- The log form says, before saving, what the rating decides
  (`whatTheRatingDecides` in `progress.ts`): the skills a good cook
  teaches, or how far the recipe is from mastery. Menu rows say the same in
  short: "Rough so far. A Decent cook teaches heat control", "2 of 3 good
  cooks", "3 good cooks. A “Nailed it” masters it".

The moments after a cook (`notice.ts`, played by `MenuScreen` and
`Beats.tsx`): a promotion holds the whole screen first, then each dish of
the usual whose skills are now all learned, each until the cook taps on
("Next" while another moment follows, "Back to the menu" on the last).
The usual never appears as a line in the notice. Only then does the menu
play its own celebration: the level-up hop, the XP bar, the yolk.

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
- In the interface, yolk always means something earned or worth noticing:
  the plate, the XP bar, skill pips, the left edge of a notice or a "Why",
  and the marker under the kept amount. Never decoration. The sprite uses
  yolk as a costume color (gloves, neckerchief, gold trim), which is the one
  exception.
- Pixel art is the chef sprite and the badges (October 4, 2026: Rowan
  relaxed this rule to include badges), in the same format and palette:
  rows of palette keys drawn by `components/PixelArt.tsx`. Badges add two
  colors to the sprite palette, ketchup (already the app's) and one yolk
  shade. Do not pixelate the rest of the interface or swap in a pixel font.
- Motion (relaxed the same day from two pieces to these, all answering a
  saved cook or a standing chef, all off under reduced motion): the yolk
  lands on the plate just cooked (`.plate-celebrate`), the XP bar fills from
  where it was (`.xp-fill`), a level-up hops the chef and pops the level
  (`.chef-card-levelup`), new badges pop into the notice (`.badge-pop`), the
  full-screen moments fade and rise in (`.beat`), and the chef idles in two
  frames (`.pixels-idle`) on the menu, the chef sheet and the promotion.
  The ladder and the editor stay still. Keep the rest of the interface
  still.
- Mobile first. The page column is 36rem. Tap targets are at least 3rem,
  links included: the "Menu" back links and "Leave cook mode" are the only
  exits once the app is installed, so they get the full 3rem too.
- Copy is plain and direct. A button says what it does and keeps that name:
  "Save this cook" produces "Saved."

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
table does not have answers 400, as PostgREST does. Besides `failNext`
(tables, `rpc/<function>`, or `auth/<path>` such as `auth/logout`), the fake
can carry out a request and lose its answer (`loseNextAnswer`), carry it out
and answer only when the test says (`holdNext`, weak signal: a read answers
with what the database held when it arrived), and write or delete rows as
another device would (`writeElsewhere`, `deleteElsewhere`). `recoveryHash()`
and `signupHash()` make an email link's landing. A request to any other site
fails the test too. `kitchen.ts` is the fixture
(`kitchen.open(route, seed)`), the seeds and the shared steps. The deploy workflow runs the suite before the
build; a failed run keeps its traces as an artifact.

## Things to know before changing them

- **Wake lock needs HTTPS.** `navigator.wakeLock` does not exist on the
  plain-HTTP LAN URL, so cook mode shows "This browser will not keep the
  screen awake here." It works on the deployed site and on localhost.
- **The timer ring is Web Audio**, created on the tap that starts a timer:
  three square-wave beeps, repeated every 5 seconds until the cook taps the
  page, and given up 2 minutes after the first ring. While it rings, Safari
  16.4 and later get `navigator.audioSession.type = 'playback'`, which should
  sound with the ring switch off and pauses other audio; it goes back to
  `'auto'` once each ring's beeps end. A ring that was queued while the
  phone woke plays only if a timer still wants it, and a phone that refuses
  to play says so in cook mode. Not yet verified on an iPhone. The audio
  context is one per page load, kept outside the hook, so going to the log
  form and back does not lose the sound. "Start timer" is a full-width
  solid button above the Why, and "Stop timer" asks first when more than a
  minute is left; once the time is up it reads "Clear timer". "Finish and log it", like "Leave cook mode", asks first
  when a timer is running. Each step ends with "Next:" and the first
  sentence of the next one.
- **Timers are end times in `sessionStorage`** (`lib/timers.ts`), one entry
  per recipe, keyed by the timer's label (unique in a recipe, which
  `curriculum.test.ts` checks), each `{ endsAt, rang, stopped }`. Not by step number:
  a deploy that splits a step mid-cook would move the timer to the wrong
  step. The storage key names the format (`timers-by-label`). They survive moving
  between steps, a reload, and a phone discarding a backgrounded tab.
  `components/useCookTimers.ts` plays every ring from one check that runs on
  a quarter-second tick and again on `visibilitychange`, so a timer that ran
  out while the phone was locked rings when the cook looks again (the 2
  minutes count from the first ring, not from the end). `rang` means the
  ring is over: the cook tapped, or it rang out. Sound needs a tap on the
  page first: starting a timer is one, and after a reload cook mode says
  "Tap anywhere so your timers can chime"; a timer that runs out before
  that tap rings once at the tap. The tap is heard at its end (`pointerup`,
  `touchend`, or a key), which is what a phone counts as a tap that may
  play sound, and the prompt goes only once the sound is actually on. A
  timer finished more than 30 minutes ago, or stopped, is hidden
  (`STALE_AFTER_MS`, `shownTimers`) but stays stored until the cook is
  over, so cook mode knows which timers were never started: on the step
  right after one the cook passed by, it shows as a dashed chip, "Potatoes:
  start 15:00", that starts it (only there, so a cook who judged by eye is
  not asked again on every step). "Leave cook mode" (which asks first if
  one is running) and saving the cook both clear the recipe's timers, and
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
- **The after-cook notice is app state**, held in `App.tsx`, shown on the
  menu once and cleared when you leave the menu. It is not in the URL or
  history. The log form navigates with `replace`, so Back from the menu can
  never return to the form and log a cook twice.
- **A cook can be logged without cook mode**: "Log a cook" on the recipe
  page opens the same form (`/cook/:id/log`, behind the same `cookable()`).
  The form has a "Cooked on" date, today in the cook's time zone by default
  and never later, for a cook made away from the app.
- **The last note comes back.** The most recent note on a recipe's cooks
  (`lastNote` in `progress.ts`: latest `cooked_on`, then latest saved) shows
  under the recipe page's buttons and on step 0 of cook mode, as "Last time
  you wrote: …".
- **New pages open at the top, with focus on the heading.** `App.tsx`
  scrolls to top on every push or replace navigation and focuses the page's
  `h1`, so a screen reader starts there; Back and Forward keep the browser's
  position. Focus stays put when the screen already placed it: the tapped
  link is still there (Next step in cook mode keeps focus for the next tap),
  or a full-screen moment took it. Every screen names itself with
  `usePageTitle` ("This week · First Course"; cook mode says the step).
- **A failed load offers "Try again".** If any of the opening reads fails,
  the message stays on screen with a button that loads everything again,
  for a phone with weak signal.
- **The app catches up after a while away.** Back from 10 minutes or more
  hidden (`REFRESH_AFTER_MS` in `App.tsx`), it loads the log, the chef and
  the shop again, so a cook logged or a recipe planned on another device
  shows up: an installed app is never reloaded otherwise. A failed catch-up
  keeps what is on screen and says so above the page, with "Try again".
  Every write's change applies to the latest state, never to what a screen
  drew from, and `App.tsx` counts writes: a catch-up that was out while a
  write landed may have read the database before it, so it is thrown away
  and read again. (Before October 6, 2026 a catch-up could take a cook just
  saved off the screen, inviting a second log.) A cook deleted elsewhere
  turns its change screen into "That cook is not in your log".
- **A save is never logged twice.** The log form makes the cook's id once
  (`newCookId` in `cookLogs.ts`), and sends it with the insert. When a save
  lands but its answer is lost on weak signal, the retry hits the duplicate
  key and saves what the form says now over it (`updateCookLog`), so a
  rating changed between taps sticks. A cook already in the log (a
  catch-up brought it in) is replaced, not added again, and the notice is
  worked out without it. Deleting finds nothing to delete when an earlier
  try landed: the cook is gone either way. Creating the chef twice returns
  the chef that exists. The e2e fake can lose an answer on purpose
  (`loseNextAnswer`).
- **A cook is never dated after today**: `checkCookedOn` in `format.ts`
  throws, on both cook forms, as well as the date field's `max`.
- **Email links come back in the hash**, where the hash router would take
  them for a page. The client is created with `detectSessionInUrl: false`,
  and `supabase.ts` reads the hash itself, removes it with `replaceState`
  (so neither the tokens nor an error stay one Back away in the history),
  and signs in from the tokens with `setSession` (`landingSignIn`).
  `App.tsx` shows nothing until that finishes, then "Set a new password"
  for a reset link (`type=recovery`) before anything else. A failed link is
  shown in the app's own words ("That email link has expired.", from
  `error_code`), never the link's text, which anyone could write; the
  screen then says how to get a new link. It is shown once (App state, not
  the module constant), so it does not come back after a later sign-out,
  and a cook still signed in from before sees it above the menu with
  "Hide this". A sign-out that never reaches the server (no signal) still
  signs the phone out, so the sign-in screen says so. The reset email goes to the
  Supabase project's Site URL, the Pages URL, so a reset asked for on
  localhost lands on the live site. Supabase's built-in email sender allows
  only a few emails an hour.
- **Sign in, create an account and reset are three modes of one screen.**
  Creating an account has its own form ("New here? Create an account"),
  with `autocomplete="new-password"` and the 8-character hint. Each mode has
  its own heading, which takes focus when the mode changes.
- **Before the first cook**, the menu shows "Where to start": tick the kit,
  tick the pantry, plan, shop, cook, each ticked off from the data. Until
  any kit is ticked, equipment lists show one pointer to the kit instead of
  "Not in your kit yet" on every tool.
- **The menu folds a course** whose every recipe is mastered, behind "All N
  recipes mastered". Its suggestion card leads with the move the week
  needs: "Add to this week" when the dish is not planned, "Shop for it"
  when it is planned but not bought, "Start cooking" once it is. The card's
  heading is named with its label ("Cook this next: …"). After a cook, the
  notice offers to add the tools it used that the kit does not have ticked.
- **Focus follows the change.** A control that a write takes away hands
  focus to what replaced it (`focusAfter` and `useFocusTarget`): "Add"
  under Ready to cook to the recipe on the plan, "Have it" to the next line
  of the list (not the top of a long one), "I have all of these" to "You
  have all of it.", "Wear it" to "Wearing it.", Done shopping to its
  message. The target is named only after the write succeeds (a failed one
  leaves focus on its button), only if the cook is still on the same
  screen, and only for 1.5 seconds; navigating clears it. The after-cook notice takes focus once the moments are over. A
  button busy with its write says so with `aria-disabled` rather than
  `disabled`, which would drop focus to the top of the page, and
  `useWrite` ignores a second tap. Tapping a price puts the cursor in it,
  and closing the form goes back to the price.
- **Money reads like money** ("$1,338.32", `formatCents`), and times of an
  hour or more read in hours ("2 hours 45 minutes", `formatMinutes`).
- **Zoomed far in** (a page about 200 CSS pixels wide, as at 200% on a
  phone), the gutters slim down and cook mode's buttons, the price lines and
  the chef sheet's head stack; cook mode's buttons stop sticking to the
  bottom, where stacked they would hold a third of the screen. The e2e
  suite checks that no screen runs off the side.
- **A cook can be changed or deleted** at `/cook-log/:id`, reached from
  "Your cooks" on the recipe page. The date, rating and notes change; the
  recipe never does. Because progress is derived, the screen first says what
  a change or a delete would take away (`progressLost` in `progress.ts`:
  skills unlearned, recipes locked again, masteries undone), and the delete
  asks to confirm. "Your cooks" lists the newest cooking day first, and a
  line under the blurb ("13 cooks, last Oct 2, 2026") jumps to it, past a
  long method. The log is read 1,000 rows at a time (the Data API's
  limit), so a long history loads in full.
- **Sign-out says what happened.** supabase-js signs the phone out even
  when the server never hears it, except when the session cannot even be
  loaded (no signal and a token past its hour): then nothing changed, and
  the menu says "Could not sign out … Try again with signal." The app tells
  the two apart by the `SIGNED_OUT` event.
- **React Router navigates inside a transition.** A screen that removes the
  thing it is showing (deleting a cook) must make both changes in one
  `startTransition`, or React draws the screen once without its data and
  reports error 520. The e2e suite catches this as a page error.
- **Shop writes are not optimistic.** A checkbox changes only after Supabase
  says the write succeeded, and says "Saving…" until then; a failure shows
  its message under the row. In a store with weak signal that is slower,
  and it is never wrong. "Done shopping" waits until no tick is saving, so
  a staple ticked a moment ago still reaches the pantry.
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
- **All eight migrations are applied to the live project** (00001 to
  00005 on October 4, 2026, 00006 and 00007 on October 5, 00008 on October
  6; a schema dump afterwards showed `anon` with no table grants,
  `authenticated` with exactly the grants above, and the limits in place).
  `00008_grants_and_limits.sql` fixed what a read-only schema dump of the
  live project showed on October 6: the project was made with the dashboard's default of
  exposing new tables, which granted everything (truncate included) on
  every table to `anon` and `authenticated`, so none of the column grants
  in 00001 to 00006 held live (a cook's recipe could be changed through the
  API). Row-level security kept every cook to their own rows throughout.
  00008 revokes everything from `anon` and `authenticated`, grants again
  exactly what the app uses, stops new tables and functions being exposed by
  default, and adds limits: notes at most 2,000 characters, ids in the
  curriculum's shape (`ids.test.ts` checks every id fits), four-digit years,
  prices at most $1,000, and extras as ids. It was checked on a throwaway
  stack left at the exposing default, as the live project is (26 checks
  before it, showing the recipe change getting through; 36 after: every
  call the app makes still works, the recipe, `created_at` and `added_at`
  updates are refused, anon is refused, every limit holds, and a new table
  is exposed to nobody). Rowan pushes each migration before the app code
  that needs it deploys: a migration always goes first. `00007` was checked on a throwaway stack (14 checks: only the listed
  recipes are marked shopped and only the seen ticks cleared, a recipe and
  a tick added elsewhere survive, the one-argument function is gone, anon
  refused, the 00006 trigger still fires, and a cook can carry its own id,
  which a second insert refuses with 23505). `00006` was checked on a
  throwaway stack first
  (30 checks: Done shopping keeps the plan and marks only the caller's rows
  shopped, a recipe added afterwards is not shopped, saving a cook takes
  only that cook's recipe off only their plan, a cook of an unplanned
  recipe still saves, `shopped` is the only column that updates, the
  trigger function is not callable, anon refused). `00005` had 18 checks
  (defaults for old chefs, every new column, the range checks, `user_id`
  and `created_at` refused, own rows only, anon refused). Set
  `auto_expose_new_tables = false` under `[api]` in the scratch config:
  without it the local stack grants everything to `anon` and
  `authenticated`, and the grant checks fail for the wrong reason.
  Before the push, `00004` ran on a throwaway local Supabase stack (Postgres
  17, PostgREST, Auth) with `auto_expose_new_tables = false`, and a script
  made the app's calls through supabase-js as two cooks and as anon: own rows
  only, anon refused everywhere, idempotent adds, no recipe change on a cook,
  the rating and price checks, and `finish_shopping` leaving the other cook's
  rows alone. To repeat that for a new migration, copy `supabase/` to a
  scratch folder, give `config.toml` its own `project_id` and ports outside
  Windows' reserved ranges (`netsh interface ipv4 show excludedportrange
  protocol=tcp`), and `npx supabase start --workdir <folder>`. Another
  project's stack may already hold the default ports; leave it running.
- **Upserting a price override needs the update grant on `ingredient_id`**,
  not only `price_cents`: PostgREST's upsert sets every column it was sent,
  and Postgres checks that privilege before it knows whether the row exists.
  Tested both ways.
- **Grocery prices are estimates** for a midwestern supermarket, October
  2026, until the cook corrects one on the grocery list. A corrected price
  replaces the estimate everywhere, past cooks' kept totals included.
- **Email confirmation is on for the live project** (October 4, 2026), and
  its Site URL is the Pages URL. Sign-up returns no session until the email
  link is clicked; the sign-in screen says "Check your email" as a plain
  notice. Signing in before the link is clicked fails with "Email not
  confirmed", and the screen offers "Send the confirmation email again"
  (`supabase.auth.resend`). An expired link's message comes with how to get
  a new one. The e2e fake does this with `confirmEmail: true` (and
  `unconfirmed: true` for the seeded account) in the seed and otherwise
  behaves like development (confirmation off).
- **Security, as reviewed on October 6, 2026.**
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
  - A link carrying a different account's tokens (anyone can send one)
    does not sign in on its own: the app asks "Switch accounts?" with the
    current account as the default. Errors never repeat text from the
    address bar (`recipeFromRoute`). The built page carries a content
    security policy as a meta tag (`vite.config.ts`): scripts, styles,
    fonts and images from the app itself, requests only to its Supabase
    project.
  - Before going public: per-account row caps, CAPTCHA on sign-up, sign-in
    and reset, a custom email sender, token-hash email links (`verifyOtp`)
    so session tokens never sit in the address or the browser's history
    list, account deletion and export, a privacy policy and terms, and an
    age gate or an off switch for wine pairings.
- **Never `npx supabase config push` the repo's `config.toml`.** It holds
  local-development values (site URL `127.0.0.1`, confirmation off, MFA off)
  and pushing it would reset ten live settings. To change one live setting,
  push a throwaway `config.toml` that declares only that setting (undeclared
  settings are left alone), after `npx supabase config diff --workdir
  <folder> --project-ref yqqxhsacxnvybffrittz` shows that it is the only
  update. That is how confirmation was turned on.
- **Run `git status` after committing a new folder.** An unanchored
  `.gitignore` entry (`screens`, meant for the screenshot folder) once hid
  `src/screens/` and broke the CI build. The Playwright entries in
  `app/.gitignore` are anchored now (`/screens`).

## Phase 2: the shop and the kit (built)

The grocery list, the pantry, prices you can correct, and the kit. Built
October 4, 2026; reached from links on the menu (This week, Pantry, Kit,
Spices).

Migration `00004_shop_kit_and_cook_edits.sql` (applied), all tables keyed by
`user_id` with the same own-rows RLS and explicit grants as `cook_logs`:

- `plan_items (user_id, recipe_id, added_at)`, primary key `(user_id, recipe_id)`
- `pantry_items (user_id, ingredient_id)`, primary key both
- `grocery_checks (user_id, ingredient_id)`, primary key both
- `price_overrides (user_id, ingredient_id, price_cents > 0)`, primary key
  `(user_id, ingredient_id)`; select, insert, update, delete
- `kit_items (user_id, equipment_id)`, primary key both
- `finish_shopping(bought_staples text[])`: "Done shopping" in one
  transaction, security invoker, executable by `authenticated` only (since
  00007, `finish_shopping(bought_staples, shopped_recipes, seen_checks)`:
  it marks shopped only the recipes the list covered and clears only the
  ticks it showed, so another device's additions are left alone)
- `cook_logs` gains update of `cooked_on`, `rating` and `notes` (never
  `recipe_id`) and delete

Plan, pantry, checks and kit grant select, insert and delete (the plan also
updates `shopped`, from 00006); adding is an insert that ignores duplicates,
so adding twice is harmless.

Migration `00006_keep_the_plan.sql` (October 5, 2026) changes two things,
because clearing the plan at "Done shopping" emptied This week right when
the food was in the fridge:

- `plan_items` gains `shopped boolean` (default false; update granted on
  that column only). `finish_shopping()` now marks the plan shopped instead
  of deleting it; the grocery list counts only recipes not yet shopped for.
- An `after insert` trigger on `cook_logs` (security invoker, execute
  revoked from everyone) deletes the cook's plan row for that recipe, in
  the same transaction as the cook. Any rating counts: the groceries are
  used either way. The app drops it from its own state when the save
  returns (`withoutPlanned` in `shop.ts`).

Behavior:

- **Plan.** "Add to this week" (and "Take off this week") on any unlocked
  recipe page. One batch per recipe; no servings scaling. A recipe stays on
  the plan until a cook of it is saved, marked "Groceries bought" once
  shopped for (with "Put it back on the list" for groceries not bought or
  gone off), and the menu suggests it first. A planned recipe that a
  deleted cook locks again says "Locked again: needs …", and the
  change-cook screen warns that it is on the plan.
- **Grocery list** (`lib/grocery.ts`, `/shop`). In the store the list comes
  first (the count, Share, the aisles, Done shopping), then the plan; at
  home, the plan first. Under both, "Ready to cook" offers up to four
  unplanned recipes in the menu's order (`readyToPlan` in `progress.ts`),
  each with "Add". A staple line has "Have it", which puts it in the
  pantry. Sum `qty` per ingredient
  across the plan's recipes not yet shopped for, drop what the pantry has
  (and list each with what this list uses, and "Put it on the list" for
  one that ran out), packages =
  `ceil(qty / package.units)`, grouped by `section` in store order: produce,
  meat, dairy, bakery, pantry, frozen. Each line shows the package, the
  count when it is more than one, and what the plan uses when that is not
  whole packages. The checkout total is the register cost, and the screen
  says it runs far above the per-serving prices on a first shop. "Share the
  list" sends what is not yet in the cart as plain text through the phone's
  share sheet (`navigator.share`, HTTPS only), to Notes for a store with no
  signal or to whoever is shopping; closing the sheet is not an error.
- **Checking off.** Tap to check. "Done shopping" asks first if anything is
  unchecked, naming it ("They come off the list"), then `finish_shopping()`
  puts the checked-off staples in the pantry, clears the checks and marks
  the plan shopped, in one transaction. With everything ticked, the list
  says to tap "Done shopping". Ticks left from a shop that never got "Done
  shopping" (for recipes since cooked or taken off) are cleared before the
  list grows again (`clearStaleChecks` in `shop.ts`, run before "Add to this
  week" and "Put it back on the list"), so a new list never opens with
  things ticked that were never bought for it.
- **Pantry** (`/pantry`). Every `staple: true` ingredient, filed like the kit
  under the first course that uses it (`staplesByCourse` in `grocery.ts`),
  with a toggle. The kit ends with "Next: your pantry" and the pantry with
  "Next: plan this week". What a staple is: used a little at a time and keeps for
  weeks. A can or a pack of meat is used up whole, so it is not one; garlic,
  fresh ginger, a parmesan wedge, eggs, a tube of tomato paste, a block of
  cheddar and a loaf of sandwich bread (kept in the freezer) are. A box of
  spaghetti is not: two recipes use all of it. The salad uses its whole 4 oz
  tub of feta, which nothing else uses. Packages are sized so a
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
  week's plan still needs.
- **Install to home screen.** Built: see "Install to the home screen" above.
- **The spice guide** (`curriculum/spices.ts`, `lib/spices.ts`, `/spices`).
  The eight spices the recipes use, each filed under the first course that
  needs it (derived from the recipes, like the kit) with a link to that
  recipe: what it tastes like, what to buy, how to use it, and everyday food
  to try it on. It opens with seven habits (buy small, read the label,
  refill jars from bags, the smell test, cool and dark, bloom in fat, add a
  little and taste) and ends with five jars worth adding later. It marks what
  is in the pantry and stores nothing. A guide entry is keyed by
  `IngredientId`, and `spices.test.ts` fails if no recipe uses one. A recipe
  that adds a new spice should add its guide entry, and the guide's advice
  must match the recipes: the October 2026 read-back found it contradicting
  them on blooming times, where cumin goes in the dal, and how much pepper
  flakes the aglio uses, plus a Diamond Crystal salt conversion that was too
  high. An everyday idea that involves raw meat points to a recipe with a
  thermometer step, not a free-form rub.

## Phase 3: cook mode hardened, and leveling (built)

Built October 4, 2026. Timers that survive a reload and chime when the cook
comes back, installing to the home screen (both under "Things to know"), and
the leveling layer: the promotion moment and the usual's moments, the
level-up beat, the idle sprite, the streak and the badges (under "The rules,
precisely" and "Design").

## Where things stand, and what comes next

As of October 5, 2026: Phases 1 to 3 are built and deployed, all 31
recipes are written (four courses and the usual), all eight migrations
are on the live project, and every push runs 136 unit tests and 173 e2e tests before it deploys.

Decisions that changed on October 4, 2026, all at Rowan's request:

- The Second, Third and Fourth courses and the usual were written the same
  day, ahead of the "one course ahead of the cook" pace.
- The cook log is no longer append-only: a cook's date, rating and notes
  can change, and a cook can be deleted (never its recipe).
- Motion is no longer limited to two pieces, and pixel art is no longer
  only the sprite (see Design for what is allowed now).
- Equipment has typed ids, like ingredients.

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
- **Going public.** Pick your own "usual" at signup, a placement step for
  people who are not starting from zero, regional prices, and an age gate or
  an off switch for wine pairings. Email confirmation and password reset are
  done.
