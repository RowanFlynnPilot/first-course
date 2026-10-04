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
| Look | The two things a cook chooses about the sprite: skin tone and hair color |
| XP, level | Earned by cooking. Level comes from total XP |
| Rank | Dishwasher, prep cook, line cook, sous chef, head chef, executive chef |
| Discipline | One of six kinds of skill: prep, pan, pot, oven, sauce, palate |
| Chef sheet | The `/chef` page: portrait, level, every skill, the kitchen ladder |

In UI copy say "ordering" or "delivered", never a delivery brand name.

## Locked decisions

1. **Recipes live in the repo, not the database.** `app/src/curriculum/*.ts`
   is typed data. Supabase holds only what a cook does.
2. **Progress is derived, never stored.** Locked, ready, cooked, mastered,
   learned skills and the kept total are all computed from the cook log in
   `lib/progress.ts` and `lib/cost.ts`. There is no progress table to drift.
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
12. **Only the chef's name and look are stored.** XP, level, rank and
    discipline stats are derived from the cook log in `lib/leveling.ts`,
    like all other progress. Changing the XP rules re-scores everyone with
    no migration. Rank decides the sprite's hat and outfit; the cook never
    picks those.
13. **One gate for cooking and logging.** `cookable()` in `lib/progress.ts`
    is the only thing that decides whether a recipe can be cooked or logged.
    Both cook mode and the log form call it before doing anything.

## Stack and layout

React 19, Vite 8, TypeScript 6, React Router 8 (imports come from
`react-router`), Supabase (Postgres, Auth), Vitest, Playwright (dev only), oxlint. Deployed by GitHub
Actions to GitHub Pages at `/first-course/`.

```
CLAUDE.md
README.md                      bring-up, definition of done, publishing
.github/workflows/deploy.yml   lint, test, e2e, build, deploy
supabase/migrations/           00001_phase1_foundation.sql (cook_logs + RLS)
                               00002_chef.sql (chefs: one named chef per account)
                               00003_chef_look.sql (skin, hair, and editing the chef)
app/
  playwright.config.ts         e2e: phone viewport, its own build against the fake
  e2e/                         fakeSupabase.ts, kitchen.ts (fixture), *.e2e.ts, screens.e2e.ts
  index.html                   fonts are loaded here
  src/
    main.tsx                   root + error boundary
    App.tsx                    auth gate, loads logs + chef, routes, scroll, notice
    supabase.ts                client; throws if env is missing
    styles.css                 the whole design system
    curriculum/
      techniques.ts            28 skills, 6 disciplines -> TechniqueId
      ingredients.ts           priced ingredients   -> IngredientId
      types.ts                 Recipe, RecipeContent, Step, Pairing
      recipes.ts               31 recipes, RECIPES, recipeById
      curriculum.test.ts       graph rules the types cannot express
    lib/
      progress.ts              the rules: learned, state, mastery, next, cookable
      leveling.ts              the chef: XP, level, rank, discipline stats
      notice.ts                what one cook earned, as lines for the menu
      cost.ts                  cook cost, order cost, kept
      cookLogs.ts, chefs.ts    the only Supabase reads/writes; rows -> app data
      format.ts                money, quantities, dates, lists
    components/
      Plate.tsx                the plate (see Design)
      chefSprites.ts           the six sprites as pixel rows, skin and hair palettes
      ChefSprite.tsx           draws a sprite as crisp SVG pixels
      ChefEditor.tsx           name + skin + hair form, used to create and to change
      XpBar.tsx, IngredientList.tsx
    screens/                   Auth, NameChef, Menu, Chef, EditChef, Recipe, Cook, Log
```

Routes: `/` menu, `/chef` chef sheet, `/chef/edit`, `/recipe/:id`,
`/cook/:id/:step` (step 0 is "get everything out", steps 1..n are the
method), `/cook/:id/log`.

A signed-in account with no chef row sees the create-your-chef screen before
anything else.

## The curriculum

31 recipes, 28 skills, 4 tracks: `foundations`, `burgers-sandwiches`,
`pizza-pasta`, `wok-curry`. The tracks come from Rowan's actual delivery
orders. Tier 5 has seven dishes: double smash burger, crispy chicken sandwich,
margherita pizza, ragù bolognese, pad thai, General Tso's chicken, chicken
tikka masala.

**Written so far: First course only (6 recipes).** Tiers 2 to 5 are on the
menu with titles, blurbs, skills and prerequisites, and `content: null`. The
UI shows them as locked rows; a recipe page with `content: null` says it is
not written yet.

Write the next course when the current one is about half cooked. That is
deliberate: how the first six go should shape how the next six are written.

### Writing a recipe

Fill in `content` for a recipe in `recipes.ts`. Rules:

- Assume zero knowledge. Name the pan, the heat setting, and what "done"
  looks, smells or sounds like. Never write "cook until done".
- Each step is one screen in cook mode. One action or one tight group.
- `why` is where the teaching happens. Give the reason, briefly. Not every
  step needs one.
- `timerSeconds` only where a clock is the right judge (oven, rice, resting).
  Where the cook should judge by eye, leave it `null` and describe the cue.
- A step that says "while that cooks" is fine: timers keep running across
  steps in cook mode.
- New ingredients go in `ingredients.ts` with a section, one unit, a package
  and a price estimate. Quantities must print: `formatQty` supports wholes,
  eighths, quarters, halves and three-quarters, and throws on anything else.
- Salt quantities assume Morton coarse kosher salt.
- `delivery.menuPriceCents` is the in-app menu price of one serving of the
  nearest thing you would order.
- `pairing.principle` is a general rule ("Match acid with acid"), so the
  cook learns how pairing works, not just what to buy.
- Prefer ingredients that later recipes reuse.
- `npm test` must pass. It checks the graph rules listed at the top of
  `recipes.ts` and that every written recipe costs less than ordering.

## The rules, precisely

`lib/progress.ts`:

- `learnedTechniques(logs)`: skills of every recipe with at least one good cook.
- `recipeState(recipe, logs)`: `locked` if any required skill is unlearned;
  else `ready` with no cooks; else `mastered` at 3 good cooks including a
  "Nailed it"; else `cooked`.
- `nextRecipe(logs)`: in menu order, the first unlocked, written recipe
  without a good cook (so a Rough cook is suggested again before anything
  new), else the first not yet mastered.

`lib/leveling.ts`:

- Cook XP = `tier * 10 * rating`. Tier 1 Rough is 10; tier 5 Nailed it is 150.
- Only a recipe's first 5 cooks earn XP (`XP_COOKS_PER_RECIPE`).
- +50 per skill learned, +100 per recipe mastered.
- Level `n` needs `50 * n * (n - 1)` total XP: 100, 300, 600, 1000, ...
- Ranks by level: dishwasher 1, prep cook 3, line cook 6, sous chef 10, head
  chef 14, executive chef 18.
- Pacing this was tuned for: the first good cook reaches level 2. Mastering
  the First course lands near line cook. Head chef arrives about when the
  usual comes into reach. Executive chef needs close to five strong cooks of
  everything (a perfect run tops out at 18,750 XP, level 19).

`lib/cost.ts`:

- Cook cost = sum of `qty * package.priceCents / package.units`.
- Order cost = `menuPrice * servings * (1 + 0.15 fees + 0.18 tip)` plus one
  `$3.99` delivery fee. The three constants are at the top of the file.
- Kept per cook = order cost minus cook cost. Total kept sums it over every
  cook, including Rough ones (you still did not order).

**Known generosity:** kept assumes every serving a recipe makes replaces a
delivered meal. A three-serving sheet pan counts as three meals not ordered.
If that reads as inflated in real use, change `orderCostCents` only.

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
all-caps labels, no monospace.

**The plate is the signature.** `components/Plate.tsx` draws a white plate
with a cobalt rim. Locked is a dashed steel outline. Each good cook grows the
yolk in the middle (one, two, three), and mastery adds a yolk ring. A recipe
with only Rough cooks gets a yolk outline. Spend boldness there and keep the
rest quiet.

**The chef is a pixel sprite.** A 16-bit console RPG look, with EarthBound
as the reference Rowan gave: a small front-facing character, 16 pixels wide,
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
  yolk) plus a grey, navy trousers, five skin tones and five hair colors.
  Do not add colors casually; the sprite belongs on this page because it
  shares the page's colors.
- `ChefSprite` takes `scale`, whole screen pixels per sprite pixel. It must
  be an integer or the pixels render uneven. In use: 2 on the ladder, 3 on
  the menu, 5 on the chef sheet, 6 in the editor.
- Sprites are different heights (the hat grows), so align them by the feet.

Other rules:

- Each section opens with a 3px rim line. Rows are separated by hairlines.
  No shadows, no gradient decoration, no card grid.
- In the interface, yolk always means something earned or worth noticing:
  the plate, the XP bar, skill pips, the left edge of a notice or a "Why",
  and the marker under the kept amount. Never decoration. The sprite uses
  yolk as a costume color (gloves, neckerchief, gold trim), which is the one
  exception.
- The sprite is the only pixel art. Do not pixelate the rest of the
  interface or swap in a pixel font to match it.
- Two pieces of motion, both answering "Save this cook": the yolk lands on
  the plate you just cooked (`.plate-celebrate`) and the XP bar fills from
  where it was (`.xp-fill`). Both respect reduced motion. Do not add more.
- Mobile first. The page column is 36rem. Tap targets are at least 3rem.
- Copy is plain and direct. A button says what it does and keeps that name:
  "Save this cook" produces "Saved."

## Commands (PowerShell 5.1)

```powershell
cd C:\Users\rpfly\Projects\first-course\app; npm install
npm run dev
npm test; npm run lint; npm run build; npm run e2e
npm run screens                # every screen at 390x844, into app/screens/ (gitignored)
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
to match. `kitchen.ts` is the fixture (`kitchen.open(route, seed)`), the
seeds and the shared steps. The deploy workflow runs the suite before the
build; a failed run keeps its traces as an artifact.

## Things to know before changing them

- **Wake lock needs HTTPS.** `navigator.wakeLock` does not exist on the
  plain-HTTP LAN URL, so cook mode shows "This browser will not keep the
  screen awake here." It works on the deployed site and on localhost.
- **The timer chime is Web Audio**, created on the tap that starts a timer.
  Not yet verified on an iPhone with the ring switch off; it may be silent.
- **Timers live in `CookScreen` state**, keyed by step. They survive moving
  between steps and die when you leave cook mode or reload. "Leave cook mode"
  asks first if a timer is running, and every step has an "Ingredients and
  amounts" panel so there is no reason to leave. A phone that reloads a
  backgrounded tab will still lose them; if that bites, persist the end
  times in `sessionStorage`.
- **The after-cook notice is app state**, held in `App.tsx`, shown on the
  menu once and cleared when you leave the menu. It is not in the URL or
  history. The log form navigates with `replace`, so Back from the menu can
  never return to the form and log a cook twice.
- **New pages open at the top.** `App.tsx` scrolls to top on every push or
  replace navigation; Back and Forward keep the browser's position.
- **The cook log is append-only.** No edit or delete yet. Fix a mistaken
  row in the Supabase dashboard.
- **The chef can be changed but not deleted.** Name, skin and hair are
  editable at `/chef/edit`. The grant is column-level, so `user_id` and
  `created_at` cannot be updated even by the owner. Supabase refuses an
  update with no filter, which is why `updateChef` takes the user id.
- **All three migrations have run against plain Postgres 16** with stand-ins
  for `auth.users`, `auth.uid()` and the `authenticated` role: own-rows RLS,
  grants, the rating, name and look checks, cascade delete, and `00003`
  applied on top of a chef created before it. They have not run against a
  real Supabase project.
- **Grocery prices are estimates** for a midwestern supermarket, October
  2026. They are wrong for anyone else until Phase 2 price overrides.
- **Email confirmation** is off for development (see README). Turn it on
  before anyone else signs up.

## Phase 2: the shop

The grocery list, the pantry, and prices you can correct.

Migration `00002_phase2_shop.sql`, all tables keyed by `user_id` with the
same own-rows RLS and explicit grants as `cook_logs`:

- `plan_items (user_id, recipe_id, added_at)`, primary key `(user_id, recipe_id)`
- `pantry_items (user_id, ingredient_id)`, primary key both
- `grocery_checks (user_id, ingredient_id)`, primary key both
- `price_overrides (user_id, ingredient_id, price_cents > 0)`, primary key
  `(user_id, ingredient_id)`

Behavior:

- **Plan.** "Add to this week" on any unlocked, written recipe. One batch per
  recipe; no servings scaling.
- **Grocery list.** Sum `qty` per ingredient across the plan. Drop anything
  in the pantry. Packages to buy = `ceil(qty / package.units)`. Show the
  package label, count and price, grouped by `section` in store order:
  produce, meat, dairy, bakery, pantry. Show the checkout total. This is the
  checkout cost, and it will be much higher than the per-serving cost on a
  first shop. Say so on the screen.
- **Checking off.** Tap to check. "Done shopping" clears the checks, clears
  the plan, and adds every bought `staple: true` ingredient to the pantry.
- **Pantry.** A screen listing `staple: true` ingredients with a toggle.
- **Price overrides.** Tap a price on the grocery list to correct it. Route
  every price read through one function in `cost.ts` that takes the
  overrides. Kept totals use current prices, not the price on the day.
- **Install to home screen.** Web manifest and icons so cook mode opens
  standalone on the phone.
- **The kit.** Equipment is free text today. Give it typed ids like
  ingredients, add a `kit_items` table, and show "what you need to own
  before this course" with the pantry. A true beginner may not have a sheet
  pan or a 12-inch skillet, and the app should say so before the shop.

## Later, unscheduled

- **Courses 2 to 5.** Content work, continuous, one course ahead of the cook.
- **Send the list to a store.** Turn the grocery list into a store cart or
  pickup order. Which store APIs allow this needs checking at build time.
- **Pour from the journal.** Show bottles rated in Pinpoint Noir that fit a
  recipe's pairing. Needs a decision on shared auth between two Supabase
  projects.
- **Edit and delete cooks.**
- **More of the sprite.** A walk cycle or a small idle bounce, a back view,
  or a pixel kitchen behind the chef on the sheet. Only if it earns its
  place; one sprite standing still is the whole feature today.
- **A cooking streak.** Weeks in a row with at least one cook, derived from
  `cooked_on`. Display only; decide later whether it earns XP.
- **Servings scaling.**
- **Import a recipe from a link**, with Claude tagging its skills. Only
  after the curriculum exists, and storing the link plus your own notes, not
  the source's text.
- **Going public.** Pick your own "usual" at signup, a placement step for
  people who are not starting from zero, regional prices, an age gate or an
  off switch for wine pairings, and email confirmation on.
