# First Course — bring-up and definition of done

A cooking app that teaches a beginner one skill at a time, toward cooking the
things they currently order. Built so far:

- **Phase 1, the foundation.** Sign-in, a pixel-sprite chef who earns XP and
  climbs the kitchen ladder, the menu (31 recipes, 28 skills), recipe pages
  with cook-vs-order cost and a wine pairing, cook mode with timers, logging
  a cook, and the unlock rules.
- **Phase 2, the shop and the kit.** This week's plan, a grocery list in
  whole packages and store order, checking it off, correcting prices, the
  pantry, the kit of equipment each course needs, and changing or deleting
  a cook.
- **Phase 3, cook mode hardened and leveling.** Timers that survive a reload
  and chime when you come back, installing to the home screen, the
  promotion moment, the idle chef, the cooking streak, and 15 badges.
- **Recipes.** The First, Second and Third courses (18 recipes) are written.

Read `CLAUDE.md` for the brief, the locked decisions and how everything works
before changing anything.

## Prerequisites

- Node 24 (22 also works)
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

Applies four migrations, each with explicit grants and row-level security so
a cook touches only their own rows:

- `00001_phase1_foundation.sql`: the cook log
- `00002_chef.sql`: one named chef per account
- `00003_chef_look.sql`: the chef's skin tone and hair color, and editing the chef
- `00004_shop_kit_and_cook_edits.sql`: the plan, pantry, grocery checks,
  price corrections and kit; `finish_shopping()`; changing and deleting a cook

If earlier migrations are already pushed, the same command applies only the
new ones. `npx supabase db push --dry-run` shows which first.

**3. Auth setting (dev convenience)**

Dashboard → Authentication → Sign In / Up → Email → turn **off** "Confirm
email" while developing, so "Create account" signs you straight in. Turn it
back on before anyone else uses the app.

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

- [x] `npm test`: 76 unit tests. The curriculum's graph rules, raw-meat
      safety, burners turned off, step length, XP and levels, costs and
      corrected prices, the grocery list, the kit, timers, the streak and
      the badges.
- [x] `npm run lint`, where a warning fails like an error.
- [x] `npm run build`.
- [x] `npm run e2e`: 58 tests that drive the built app at phone size against
      a fake Supabase that enforces the real grants. They cover:
  - signing in and up, and creating and changing the chef
  - cooking and logging, the after-cook notice and what unlocks, and Back
    after logging
  - every step of every written recipe
  - timers across steps, reloads and leaving
  - the plan, the grocery list, prices, Done shopping, the pantry and the kit
  - changing and deleting a cook
  - promotions, the usual's moments, badges, the streak and reduced motion
  - the manifest and icons, and the error screens

### On a real phone, with the deployed site

These need hardware, a kitchen, or a store:

- [ ] Add to Home Screen (Safari's share sheet, or Chrome's menu). The icon
      is the plate, and it opens at the menu with no browser bar.
- [ ] Cook mode keeps the screen awake.
- [ ] A timer reaching zero chimes with the ring switch on. Note whether it
      chimes with the switch off; it may be silent.
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
- [ ] Done shopping puts the checked-off staples in the pantry, and next
      week's list leaves them off.
- [ ] Sign out and sign back in: everything is still there.
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

Before sharing the URL with anyone: turn "Confirm email" back on, and set
Authentication → URL Configuration → Site URL to the Pages URL so
confirmation links land in the right place.
