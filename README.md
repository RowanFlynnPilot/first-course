# First Course — Phase 1 bring-up

A cooking app that teaches a beginner one skill at a time, toward cooking the
things they currently order. This package is the Phase 1 foundation: sign-in,
a pixel-sprite chef who earns XP and climbs the kitchen ladder, the menu (31
recipes, 28 skills), recipe pages with cook-vs-order cost and a wine pairing,
cook mode with timers, logging a cook, and the unlock rules. The First course
(6 recipes) is fully written.

Read `CLAUDE.md` for the brief, the locked decisions and the Phase 2 spec
before changing anything.

## Prerequisites

- Node 24 (22 also works)
- A new Supabase project (free tier) and the Supabase CLI (`npm i -g supabase`)

## Bring-up (PowerShell)

**1. Extract and link Supabase**

Extract to `C:\Users\rpfly\Projects\first-course`, then:

```powershell
cd C:\Users\rpfly\Projects\first-course; supabase init; supabase link --project-ref <your-project-ref>
```

`supabase init` generates `supabase/config.toml` next to the migration that
is already in this package.

**2. Database**

```powershell
supabase db push
```

Applies three migrations: `00001_phase1_foundation.sql` (the `cook_logs`
table), `00002_chef.sql` (the `chefs` table, one chef per account) and
`00003_chef_look.sql` (the chef's skin tone and hair color, and permission
to edit your own chef). Each comes with grants and row-level security so a
cook touches only their own rows.

If you already pushed earlier migrations from a previous version of this
package, the same command applies only the new ones. A chef created before
`00003` gets a default look that you can change on the chef sheet.

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

## Definition of done — Phase 1

- [ ] `npm test`, `npm run lint` and `npm run build` are all clean
- [ ] Create an account and sign in
- [ ] Create your chef (name, skin, hair): the menu shows the sprite as a
      level 1 dishwasher in a bandana and rubber gloves
- [ ] The menu shows "Cook this next: Chopped salad", two ready plates, and
      everything else locked with the skills it needs
- [ ] Open a recipe: cost per serving, the ordering price, the pairing
- [ ] Start cooking: step 0 lists what to get out, then one step per screen
- [ ] Any step: open "Ingredients and amounts" without leaving cook mode
- [ ] On the sheet-pan recipe, start the step 3 timer, go to step 4, and see
      the timer still counting in the strip at the top
- [ ] With that timer running, "Leave cook mode" asks before stopping it
- [ ] A timer reaching zero chimes (check on the phone, ring switch on and off)
- [ ] Finish, rate it "Decent", save: the menu says "+120 XP. Level 2.",
      what you learned and what unlocked, the XP bar fills, and the yolk
      lands on that plate
- [ ] Press Back from the menu: you land on the last step, not the log form
- [ ] Rate a different recipe "Rough": it shows as cooked but unlocks nothing
- [ ] Open the chef sheet: level, six disciplines, every skill and which
      recipe teaches it, the kitchen ladder with all six outfits
- [ ] "Change name or look" saves and the sprite updates everywhere
- [ ] The sprite's pixels are square and even on the phone, not blurry
- [ ] The kept total in the header goes up with every cook
- [ ] Sign out, sign back in: everything is still there
- [ ] Actually cook the chopped salad

## Publishing to GitHub

The order matters. Pages must exist before the workflow's first run.

```powershell
cd C:\Users\rpfly\Projects\first-course; git init -b main; git add .; git commit -m "Phase 1 foundation"
gh repo create RowanFlynnPilot/first-course --public --source . --remote origin
gh api repos/RowanFlynnPilot/first-course/pages -X POST -f build_type=workflow
gh variable set VITE_SUPABASE_URL --body "https://<ref>.supabase.co"; gh variable set VITE_SUPABASE_ANON_KEY --body "<publishable key>"
git push -u origin main; gh run watch
```

`.github/workflows/deploy.yml` lints, tests and builds `app/` with those repo
variables, then deploys `app/dist`. If a variable is missing the first step
fails and names it. The publishable key is public by design; row-level
security is the boundary, which is why plain repo variables are fine.

Live at `https://rowanflynnpilot.github.io/first-course/`.

Before sharing the URL with anyone: turn "Confirm email" back on, and set
Authentication → URL Configuration → Site URL to the Pages URL so
confirmation links land in the right place.
