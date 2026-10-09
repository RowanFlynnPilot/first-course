# First Course — bring-up and definition of done

A cooking app that teaches a beginner one skill at a time, toward cooking the
things they currently order. Built so far:

- **Phase 1, the foundation.** Sign-in, a pixel-sprite chef who earns XP and
  climbs the kitchen ladder, the menu (31 recipes, 28 skills), recipe pages
  with cook-vs-order cost and a wine pairing, cook mode with timers, logging
  a cook, and the unlock rules.
- **Phase 2, the shop and the kit.** This week's plan, a grocery list in
  whole packages and store order, checking it off, correcting prices, the
  pantry, the kit of equipment each course needs, a spice guide, and
  changing or deleting a cook.
- **Phase 3, cook mode hardened and leveling.** Timers that survive a reload
  and chime when you come back, installing to the home screen, the
  promotion moment, the idle chef, the cooking streak, and 26 badges.
- **The character creator.** Hairstyle, facial hair, glasses and more
  colors, and 8 extras (tools in hand, clogs, a towel, a patch) earned by
  cooking each kind of dish and worn over the rank's outfit.
- **Recipes.** All 31 are written: four courses and the seven dishes of the
  usual.

Read `CLAUDE.md` for the brief, the locked decisions and how everything works
before changing anything.

## Prerequisites

- Node 24 (22.18 or later also works: `npm run icons` runs a `.ts` file directly)
- A Supabase project (free tier). The Supabase CLI runs through `npx supabase`;
  a global npm install of it is not supported.
- For the e2e suite, Playwright's Chromium, once: `npx playwright install chromium`
  from `app/`.

## Bring-up (PowerShell)

**1. Link Supabase**

```powershell
cd C:\Users\rpfly\Projects\first-course; npx supabase link --project-ref <your-project-ref>
```

`supabase/config.toml` is already in the repo.

**2. Database**

```powershell
npx supabase db push
```

Applies eight migrations, each with explicit grants and row-level security so
a cook touches only their own rows:

- `00001_phase1_foundation.sql`: the cook log
- `00002_chef.sql`: one named chef per account
- `00003_chef_look.sql`: the chef's skin tone and hair color, and editing the chef
- `00004_shop_kit_and_cook_edits.sql`: the plan, pantry, grocery checks,
  price corrections and kit; `finish_shopping()`; changing and deleting a cook
- `00005_chef_creator.sql`: hairstyle, facial hair, glasses, more skin and
  hair colors, and the extras the chef wears
- `00006_keep_the_plan.sql`: Done shopping marks the plan shopped instead of
  clearing it, and saving a cook takes its recipe off the plan
- `00007_shop_what_you_saw.sql`: Done shopping changes only the recipes and
  ticks the device showed, so another device's additions are left alone
- `00008_grants_and_limits.sql`: takes back the everything-to-everyone grants
  a project made with the dashboard's defaults has, grants exactly what the
  app uses, and limits notes, ids, prices and dates

If earlier migrations are already pushed, the same command applies only the
new ones. `npx supabase db push --dry-run` shows which first.

**3. Auth settings**

"Confirm email" is **on** for the live project (since October 4, 2026), and
its Site URL is the Pages URL, so a new account gets a link that lands on the
app. "Create account" then says to check your email. For a brand-new
project, set both in Dashboard → Authentication.

Never run `npx supabase config push` with the repo's `supabase/config.toml`:
it holds local-development values (a `127.0.0.1` site URL, confirmation off,
MFA off) and would push them all to the live project. To change one live
setting from the CLI, push a throwaway `config.toml` that declares only that
setting (undeclared settings are left alone), after previewing it with
`npx supabase config diff --workdir <folder> --project-ref <ref>`.

**4. Frontend env**

```powershell
cd app; copy .env.example .env
```

Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from Dashboard →
Project Settings → API Keys. Use the publishable key (`sb_publishable_...`)
as the anon key value.

**5. Run it**

```powershell
npm install; npm run dev
```

On the phone: `npm run dev -- --host` and open the LAN URL. Everything works
there except keeping the screen awake, which browsers only allow over HTTPS.
Cook mode says so on screen. It works on the deployed site.

**6. Check it**

```powershell
npm test; npm run lint; npm run build; npm run e2e
npm run screens
```

`npm run screens` saves every screen at 390x844 to `app/screens/` for a look.

## Definition of done

### Every push, automatically

The deploy workflow runs these, and nothing deploys unless all pass:

- [x] `npm test`: 143 unit tests. The curriculum's graph rules, raw-meat
      safety, burners turned off, step length, the serial comma and names
      without commas, XP and levels, costs and corrected prices, the
      grocery list, the kit, timers, the streak, the badges, and errors in
      plain words.
- [x] `npm run lint`, where a warning fails like an error.
- [x] `npm run build`.
- [x] `npm run e2e`: 180 tests that drive the built app at phone size against
      a fake Supabase that enforces the real grants. They cover:
  - signing in and up, a password reset, an expired or forged email link, creating
    and changing the chef, the character
    creator, and earning and wearing extras
  - cooking and logging, the after-cook notice and what unlocks, and Back
    after logging
  - every step of every recipe, one test per recipe
  - timers across steps, reloads and leaving
  - the plan, the grocery list, sharing it, prices, Done shopping, the
    pantry, the kit and the spice guide
  - a save retried after its answer was lost, catching up after time away,
    and no screen running off the side at 200% zoom
  - each screen's title, where focus lands, where the menu was scrolled,
    and that nothing loads from another site
  - changing and deleting a cook
  - promotions, the usual's moments, badges, the streak and reduced motion
  - the manifest and icons, and the error screens

### On a real phone, with the deployed site

These need hardware, a kitchen, or a store:

- [ ] Add to Home Screen (Safari's share sheet, or Chrome's menu). The icon
      is the plate, and it opens at the menu with no browser bar.
- [ ] Cook mode keeps the screen awake.
- [ ] A timer reaching zero rings every 5 seconds until you tap the screen.
      Check it rings with the ring switch off too, loud enough over the
      range hood, and that a podcast pauses while it rings and what happens
      to it after.
- [ ] Start a timer, lock the phone, and unlock after it ends. The chime
      plays when you look again, and the step says "Time is up".
- [ ] Start a timer and leave Safari for a while, long enough that it may
      reload the page. Come back: the timer is still counting. If it asks,
      tap once so it can chime.
- [ ] The sprite and the badges are square and crisp, not blurry.
- [ ] The idle bob, the level-up hop and the promotion moment feel right,
      not busy. With Reduce Motion on, all of it is still.
- [ ] In a store: check the list off with one thumb, and correct a price
      with the number keypad.
- [ ] Done shopping keeps the plan, marked "Groceries bought", until each
      recipe is cooked. It puts the checked-off staples in the pantry, and next
      week's list leaves them off.
- [ ] Sign out and sign back in: everything is still there.
- [ ] "Share the list" opens the share sheet, and the list lands in Notes.
- [ ] "Forgot your password?" sends an email whose link opens the app at
      "Set a new password", and the new password signs in.
- [ ] Actually cook: the chopped salad first, and later the seared chicken
      thighs, your first raw meat, with the thermometer.

## Publishing to GitHub

Already done for this repo; kept for a fresh project. The order matters:
Pages must exist before the workflow's first run.

```powershell
cd C:\Users\rpfly\Projects\first-course; git init -b main; git add .; git commit -m "Phase 1 foundation"
gh repo create RowanFlynnPilot/first-course --public --source . --remote origin
gh api repos/RowanFlynnPilot/first-course/pages -X POST -f build_type=workflow
gh variable set VITE_SUPABASE_URL --body "https://<ref>.supabase.co"; gh variable set VITE_SUPABASE_ANON_KEY --body "<publishable key>"
git push -u origin main; gh run watch
```

`.github/workflows/deploy.yml` lints, tests, runs the e2e suite (against its
own build, pointed at the fake Supabase) and builds `app/` with those repo
variables, then deploys `app/dist`. If a variable is missing the first step
fails and names it. A failed e2e run keeps its Playwright traces as an
artifact. The publishable key is public by design; row-level security is the
boundary, which is why plain repo variables are fine.

Live at `https://rowanflynnpilot.github.io/first-course/`.

Email confirmation is on and the Site URL is the Pages URL, so the live site
is ready for other people to sign up.
