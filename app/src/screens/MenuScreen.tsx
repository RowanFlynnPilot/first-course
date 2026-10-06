import { Fragment, useState } from 'react'
import { Link } from 'react-router'
import { BadgeArt } from '../components/BadgeArt'
import { PromotionBeat, UsualBeat } from '../components/Beats'
import { usePageTitle } from '../components/usePageTitle'
import { useWrite } from '../components/useWrite'
import { ChefSprite } from '../components/ChefSprite'
import { Plate } from '../components/Plate'
import { XpBar } from '../components/XpBar'
import { RECIPES } from '../curriculum/recipes'
import type { Recipe, Tier } from '../curriculum/types'
import { badgeById } from '../lib/badges'
import { updateChef, type Chef } from '../lib/chefs'
import { cookCostPerServingCents, orderCostPerServingCents, totalKeptCents } from '../lib/cost'
import { extraById, wornExtras, type ExtraId } from '../lib/extras'
import { COURSE_NAMES, formatCents, formatMinutes, localDateString, plural, skillList } from '../lib/format'
import { hasKit, kitByCourse } from '../lib/kit'
import { levelForXp, rankIndexForLevel, RANKS, totalXp, type RankIndex } from '../lib/leveling'
import type { CookNotice } from '../lib/notice'
import {
  goodCooks,
  learnedTechniques,
  MASTERED_COOKS,
  missingTechniques,
  nextRecipe,
  recipeState,
  type CookLog,
} from '../lib/progress'
import { planRecipe, type Shop, type ShopChange } from '../lib/shop'
import { currentStreak, type Streak } from '../lib/streak'
import { supabase } from '../supabase'

const COURSES: readonly Tier[] = [1, 2, 3, 4]

// Each course counts only the kit it adds, as the kit screen files it, so the numbers agree.
const NEW_KIT = kitByCourse()

type Moment = { kind: 'promotion'; rank: RankIndex } | { kind: 'usual'; recipe: Recipe }

/** The full-screen moments a cook earned, in the order they play: the promotion, then each dish of the usual. */
function momentsOf(notice: CookNotice | null): Moment[] {
  if (notice === null) return []
  return [
    ...(notice.promotion === null ? [] : [{ kind: 'promotion' as const, rank: notice.promotion }]),
    ...notice.usualUnlocked.map((recipe) => ({ kind: 'usual' as const, recipe })),
  ]
}

export function MenuScreen({
  userId,
  chef,
  logs,
  shop,
  notice,
  onChefSaved,
  onShopChange,
}: {
  userId: string
  chef: Chef
  logs: readonly CookLog[]
  shop: Shop
  notice: CookNotice | null
  onChefSaved: (chef: Chef) => void
  onShopChange: ShopChange
}) {
  usePageTitle(null)
  const next = nextRecipe(logs, shop.plan, shop.shopped)
  const usual = RECIPES.filter((recipe) => recipe.tier === 5)
  const learned = learnedTechniques(logs)
  const xp = totalXp(logs)
  const level = levelForXp(xp)
  const rank = rankIndexForLevel(level)
  // The cook's local date, read once: the streak counts weeks where the cook is standing.
  const [today] = useState(() => localDateString(new Date()))
  const streak = currentStreak(logs, today)

  // Each moment holds the screen until the cook moves on. The menu's own
  // celebration (the level hop, the XP bar, the yolk) plays after the last one.
  const moments = momentsOf(notice)
  const [seen, setSeen] = useState(0)
  const moment = moments[seen]
  const settled = moment === undefined

  return (
    <>
      <main className="page" aria-hidden={settled ? undefined : true}>
        <header className="masthead">
          <h1 className="wordmark">First Course</h1>
          <p className="kept">
            <strong>{formatCents(totalKeptCents(logs, shop.prices))}</strong> kept by cooking
          </p>
        </header>

        <Link
          className={notice !== null && notice.levelUp !== null && settled ? 'chef-card chef-card-levelup' : 'chef-card'}
          to="/chef"
        >
          <ChefSprite rank={rank} look={chef} extras={wornExtras(chef.extras, logs)} scale={3} idle />
          <span>
            <span className="row-title">{chef.name}</span>
            <span className="row-note chef-level">
              Level {level} {RANKS[rank].name.toLowerCase()}
            </span>
            <XpBar key={settled ? 'settled' : 'waiting'} xp={xp} fromXp={notice === null ? null : notice.xpBefore} />
            <StreakLine streak={streak} />
          </span>
        </Link>

        {notice !== null && (
          <div className="notice" role="status">
            <ul className="notice-lines">
              {notice.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
              {notice.readyNow.length > 0 && (
                <li>
                  Now ready to cook:{' '}
                  {notice.readyNow.map((recipe, index) => (
                    <Fragment key={recipe.id}>
                      {index > 0 && (index === notice.readyNow.length - 1 ? ' and ' : ', ')}
                      <Link to={`/recipe/${recipe.id}`}>{recipe.title}</Link>
                    </Fragment>
                  ))}
                  .
                </li>
              )}
              {notice.newExtras.map((id) => (
                <NewExtra key={id} id={id} userId={userId} chef={chef} onChefSaved={onChefSaved} />
              ))}
            </ul>
            {notice.badges.length > 0 && (
              <ul className="notice-badges">
                {notice.badges.map((id) => (
                  <li key={id} className={settled ? 'badge-pop' : undefined}>
                    <BadgeArt id={id} earned scale={3} />
                    <span className="row-note">{badgeById(id).name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {logs.length === 0 && <FirstSteps shop={shop} />}

        <UpNext
          recipe={next}
          plan={next === null || !shop.plan.includes(next.id) ? null : shop.shopped.has(next.id) ? 'bought' : 'planned'}
          logs={logs}
          shop={shop}
          onShopChange={onShopChange}
        />

        <nav className="quick-links" aria-label="Shopping, kit and spices">
          <Link to="/shop">{shop.plan.length === 0 ? 'This week' : `This week (${shop.plan.length})`}</Link>
          <Link to="/pantry">Pantry</Link>
          <Link to="/kit">Kit</Link>
          <Link to="/spices">Spices</Link>
        </nav>

        <section className="section">
          <h2 className="section-title">{COURSE_NAMES[5]}</h2>
          <p className="section-note">What you order now. Everything below builds toward cooking these.</p>
          <ul className="usual">
            {usual.map((recipe) => {
              const state = recipeState(recipe, logs)
              const have = recipe.requires.length - missingTechniques(recipe, logs).length
              return (
                <li key={recipe.id}>
                  <Link className="usual-item" to={`/recipe/${recipe.id}`}>
                    <Plate state={state} goodCooks={goodCooks(recipe, logs)} size={56} />
                    <span className="usual-title">{recipe.title}</span>
                    <span className="row-note">
                      {state === 'locked'
                        ? `${have} of ${plural(recipe.requires.length, 'skill', 'skills')}`
                        : state === 'ready'
                          ? 'In reach. Cook it any time.'
                          : rowNote(recipe, logs)}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>

        {COURSES.map((tier) => {
          const recipes = RECIPES.filter((recipe) => recipe.tier === tier)
          const skills = recipes.flatMap((recipe) => recipe.teaches)
          const have = skills.filter((technique) => learned.has(technique)).length
          const toGet = (NEW_KIT.find((course) => course.tier === tier)?.items ?? []).filter((id) => !hasKit(id, shop.kit)).length
          // A course with every recipe mastered folds away, so what is still open is not 3,000 pixels down.
          const done = recipes.every((recipe) => recipeState(recipe, logs) === 'mastered')
          const rows = (
            <ul className="rows">
              {recipes.map((recipe) => (
                <RecipeRow
                  key={recipe.id}
                  recipe={recipe}
                  logs={logs}
                  celebrate={settled && notice?.cookedId === recipe.id}
                />
              ))}
            </ul>
          )
          return (
            <section className="section" key={tier}>
              <h2 className="section-title">{COURSE_NAMES[tier]}</h2>
              <p className="section-note">
                {have} of {skills.length} skills learned
                {toGet > 0 && (
                  <>
                    {'. '}
                    <Link to="/kit">
                      Kit: {tier === 1 ? plural(toGet, 'thing', 'things') : plural(toGet, 'new thing', 'new things')} to get
                    </Link>
                  </>
                )}
              </p>
              {done ? (
                <details className="course-done">
                  <summary>All {recipes.length} recipes mastered</summary>
                  {rows}
                </details>
              ) : (
                rows
              )}
            </section>
          )
        })}

        <footer className="footer">
          <button className="link-button" type="button" onClick={() => supabase.auth.signOut()}>
            Sign out
          </button>
        </footer>
      </main>

      {moment?.kind === 'promotion' && (
        <PromotionBeat
          chef={chef}
          extras={wornExtras(chef.extras, logs)}
          rank={moment.rank}
          last={seen === moments.length - 1}
          onDone={() => setSeen(seen + 1)}
        />
      )}
      {moment?.kind === 'usual' && (
        <UsualBeat recipe={moment.recipe} last={seen === moments.length - 1} onDone={() => setSeen(seen + 1)} />
      )}
    </>
  )
}

function StreakLine({ streak }: { streak: Streak }) {
  if (streak.weeks === 0) return null
  return (
    <span className="row-note streak">
      {streak.weeks}-week cooking streak{streak.needsThisWeek ? '. Cook this week to keep it.' : ''}
    </span>
  )
}

/**
 * Before the first cook, the order to do things in, each ticked off as it is
 * done: the kit and the pantry first, so the first list does not buy what
 * the kitchen already has.
 */
function FirstSteps({ shop }: { shop: Shop }) {
  const steps = [
    { done: shop.kit.size > 0, to: '/kit', text: 'Tick the kit you already own' },
    { done: shop.pantry.size > 0, to: '/pantry', text: 'Tick the staples already in your pantry' },
    { done: shop.plan.length > 0, to: '/shop', text: 'Add a recipe or two to this week' },
    { done: shop.shopped.size > 0, to: '/shop', text: 'Shop for them, and tap “Done shopping”' },
    { done: false, to: null, text: 'Cook, then log how it went' },
  ]
  return (
    <section className="section">
      <h2 className="section-title">Where to start</h2>
      <ol className="first-steps">
        {steps.map((step) => (
          <li key={step.text} className={step.done ? 'first-step-done' : undefined}>
            {step.to === null ? step.text : <Link to={step.to}>{step.text}</Link>}
            {step.done && <span className="row-note">Done</span>}
          </li>
        ))}
      </ol>
    </section>
  )
}

/** A new extra from this cook: put it on right here when its slot is free. */
function NewExtra({
  id,
  userId,
  chef,
  onChefSaved,
}: {
  id: ExtraId
  userId: string
  chef: Chef
  onChefSaved: (chef: Chef) => void
}) {
  const { busy, error, run } = useWrite()
  const extra = extraById(id)
  const wearing = chef.extras.includes(id)
  const slotTaken = chef.extras.some((other) => other !== id && extraById(other).slot === extra.slot)
  return (
    <li>
      New extra for {chef.name}: {extra.name}.{' '}
      {wearing ? (
        'Wearing it.'
      ) : slotTaken ? (
        <Link to="/chef/edit">Swap it in</Link>
      ) : (
        <button
          className="link-button"
          type="button"
          disabled={busy}
          onClick={() => void run(async () => onChefSaved(await updateChef(userId, { ...chef, extras: [...chef.extras, id] })))}
        >
          Wear it
        </button>
      )}
      {error !== null && (
        <span className="notice notice-error" role="alert">
          {error}
        </span>
      )}
    </li>
  )
}

function UpNext({
  recipe,
  plan,
  logs,
  shop,
  onShopChange,
}: {
  recipe: Recipe | null
  /** Whether the suggestion is on this week's plan, and its groceries bought. */
  plan: 'bought' | 'planned' | null
  logs: readonly CookLog[]
  shop: Shop
  onShopChange: ShopChange
}) {
  const add = useWrite()
  if (recipe === null) {
    return (
      <section className="tray">
        <p className="tray-body">
          You have mastered every recipe on the menu, the usual included. Nothing you order is out of reach.
        </p>
      </section>
    )
  }
  const { content } = recipe
  const state = recipeState(recipe, logs)
  return (
    <section className="tray">
      <Plate state={state} goodCooks={goodCooks(recipe, logs)} size={88} />
      <div>
        <p className="tray-label">
          {plan === 'bought'
            ? 'Groceries bought'
            : plan === 'planned'
              ? 'On this week’s plan'
              : state === 'ready'
                ? 'Cook this next'
                : 'Cook this again'}
        </p>
        <h2 className="tray-title">{recipe.title}</h2>
        <p className="tray-body">
          {formatMinutes(content.totalMinutes)}. {formatCents(cookCostPerServingCents(content, shop.prices))} a serving
          instead of {formatCents(orderCostPerServingCents(content))} delivered.
        </p>
        <div className="actions">
          <Link className="button" to={`/cook/${recipe.id}/0`}>
            Start cooking
          </Link>
          <Link className="button button-quiet" to={`/recipe/${recipe.id}`}>
            Read the recipe
          </Link>
          {plan === null && (
            <button
              className="button button-quiet"
              type="button"
              disabled={add.busy}
              onClick={() => void add.run(() => planRecipe(shop, recipe.id, onShopChange))}
            >
              Add to this week
            </button>
          )}
        </div>
        {add.error !== null && (
          <p className="notice notice-error" role="alert">
            {add.error}
          </p>
        )}
      </div>
    </section>
  )
}

function RecipeRow({ recipe, logs, celebrate }: { recipe: Recipe; logs: readonly CookLog[]; celebrate: boolean }) {
  const state = recipeState(recipe, logs)
  return (
    <li>
      <Link className={`row row-${state}`} to={`/recipe/${recipe.id}`}>
        <Plate state={state} goodCooks={goodCooks(recipe, logs)} size={44} celebrate={celebrate} />
        <span>
          <span className="row-title">{recipe.title}</span>
          <span className="row-note">{rowNote(recipe, logs)}</span>
        </span>
      </Link>
    </li>
  )
}

/** What a recipe needs next, in a few words: the skills it waits on, or how far it is from mastery. */
function rowNote(recipe: Recipe, logs: readonly CookLog[]): string {
  const state = recipeState(recipe, logs)
  if (state === 'locked') return `Needs ${skillList(missingTechniques(recipe, logs))}`
  if (state === 'mastered') return 'Mastered'
  if (state === 'cooked') {
    const good = goodCooks(recipe, logs)
    if (good === 0) {
      return recipe.teaches.length > 0
        ? `Rough so far. A Decent cook teaches ${skillList(recipe.teaches)}`
        : 'Rough so far. Cook it again at Decent or better'
    }
    if (good < MASTERED_COOKS) return `${good} of ${MASTERED_COOKS} good cooks`
    return `${good} good cooks. A “Nailed it” masters it`
  }
  return recipe.teaches.length > 0 ? `Teaches ${skillList(recipe.teaches)}` : 'In reach. Cook it any time.'
}
