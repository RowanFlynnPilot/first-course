import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { BadgeArt } from '../components/BadgeArt'
import { PromotionBeat, UsualBeat } from '../components/Beats'
import { RecipeLinks } from '../components/LockedNotice'
import { focusAfter, useFocusTarget } from '../components/useFocusTarget'
import { usePageTitle } from '../components/usePageTitle'
import { useWrite } from '../components/useWrite'
import { ChefSprite } from '../components/ChefSprite'
import { Plate } from '../components/Plate'
import { XpBar } from '../components/XpBar'
import { EQUIPMENT } from '../curriculum/equipment'
import { RECIPES, recipeById } from '../curriculum/recipes'
import type { Recipe, Tier } from '../curriculum/types'
import { badgeById } from '../lib/badges'
import { updateChef, type Chef } from '../lib/chefs'
import { cookCostPerServingCents, orderCostPerServingCents, totalKeptCents } from '../lib/cost'
import { extraById, wornExtras, type ExtraId } from '../lib/extras'
import { COURSE_NAMES, formatCents, formatCookedOn, formatMinutes, inSentence, listOf, localDateString, plural } from '../lib/format'
import { hasKit, kitByCourse, missingKit } from '../lib/kit'
import { levelForXp, rankIndexForLevel, RANKS, totalXp, type RankIndex } from '../lib/leveling'
import type { CookNotice } from '../lib/notice'
import {
  goodCooks,
  lastCooked,
  learnedTechniques,
  missingTechniques,
  nextRecipe,
  recipeState,
  rowNote,
  type CookLog,
} from '../lib/progress'
import { addAllToKit, planRecipe, type Shop, type ShopChange } from '../lib/shop'
import { currentStreak, type Streak } from '../lib/streak'

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
  onSignOut,
}: {
  userId: string
  chef: Chef
  logs: readonly CookLog[]
  shop: Shop
  notice: CookNotice | null
  onChefSaved: (chef: Chef) => void
  onShopChange: ShopChange
  onSignOut: () => Promise<void>
}) {
  usePageTitle(null)
  const usual = RECIPES.filter((recipe) => recipe.tier === 5)
  const learned = learnedTechniques(logs)
  const xp = totalXp(logs)
  const level = levelForXp(xp)
  const rank = rankIndexForLevel(level)
  // The cook's local date, read once: the streak counts weeks where the cook is standing.
  const [today] = useState(() => localDateString(new Date()))
  const next = nextRecipe(logs, shop.plan, shop.shopped, today)
  const streak = currentStreak(logs, today)

  // Each moment holds the screen until the cook moves on. The menu's own
  // celebration (the level hop, the XP bar, the yolk) plays after the last one.
  const moments = momentsOf(notice)
  const [seen, setSeen] = useState(0)
  const moment = moments[seen]
  const settled = moment === undefined
  // Once the moments are over, focus goes to what the cook earned, so a
  // screen reader reads it rather than the wordmark.
  const noticeRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (settled && notice !== null) noticeRef.current?.focus()
  }, [settled, notice])
  const signOut = useWrite()

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
          <div className="notice" role="status" ref={noticeRef} tabIndex={-1}>
            <ul className="notice-lines">
              {notice.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
              {notice.readyNow.length > 0 && (
                <li>
                  Now ready to cook: <RecipeLinks recipes={notice.readyNow} />.
                </li>
              )}
              {notice.newExtras.map((id) => (
                <NewExtra key={id} id={id} userId={userId} chef={chef} onChefSaved={onChefSaved} />
              ))}
              <CookedWithKit recipe={recipeById(notice.cookedId)} shop={shop} onShopChange={onShopChange} />
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
          plan={!shop.plan.includes(next.id) ? null : shop.shopped.has(next.id) ? 'bought' : 'planned'}
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
          <p className="section-note">
            {usual.every((recipe) => recipeState(recipe, logs) === 'mastered')
              ? 'What you used to order. You have mastered every one of them.'
              : 'What you order now. Everything below builds toward cooking these.'}
          </p>
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
          // Courses are gates: a course opens as the skills of the one before it are learned.
          const shut = recipes.every((recipe) => recipeState(recipe, logs) === 'locked')
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
              {shut && tier > 1 && (
                <p className="section-note">
                  Opens as you learn {COURSE_NAMES[(tier - 1) as Tier].toLowerCase()} skills. Each dish below says which
                  it needs.
                </p>
              )}
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
          <button
            className="link-button"
            type="button"
            aria-disabled={signOut.busy}
            onClick={() => void signOut.run(onSignOut)}
          >
            Sign out
          </button>
          {signOut.error !== null && (
            <p className="notice notice-error" role="alert">
              {signOut.error}
            </p>
          )}
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
  const wearingRef = useFocusTarget<HTMLSpanElement>(`extra:${id}`)
  const extra = extraById(id)
  const wearing = chef.extras.includes(id)
  const slotTaken = chef.extras.some((other) => other !== id && extraById(other).slot === extra.slot)
  return (
    <li>
      New extra for {chef.name}: {extra.name}.{' '}
      {wearing ? (
        <span ref={wearingRef} tabIndex={-1}>
          Wearing it.
        </span>
      ) : slotTaken ? (
        <Link to="/chef/edit">Swap it in</Link>
      ) : (
        <button
          className="link-button"
          type="button"
          aria-disabled={busy}
          onClick={() =>
            void run(() =>
              focusAfter(`extra:${id}`, async () => onChefSaved(await updateChef(userId, { ...chef, extras: [...chef.extras, id] }))),
            )
          }
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

/**
 * After a cook, the tools it used that are not ticked in the kit, with one
 * tap to add them: the cook plainly owns them now, and the kit counts on the
 * menu should say so.
 */
function CookedWithKit({ recipe, shop, onShopChange }: { recipe: Recipe; shop: Shop; onShopChange: ShopChange }) {
  const { busy, error, run } = useWrite()
  const [added, setAdded] = useState<number | null>(null)
  const addedRef = useFocusTarget<HTMLSpanElement>('kit-added')
  const missing = missingKit([recipe], shop.kit)
  if (added !== null) {
    return (
      <li>
        <span ref={addedRef} tabIndex={-1}>
          Added {plural(added, 'thing', 'things')} to <Link to="/kit">your kit</Link>.
        </span>
      </li>
    )
  }
  if (missing.length === 0) return null
  return (
    <li>
      {missing.length <= 3
        ? `You cooked with ${listOf(missing.map((id) => inSentence(EQUIPMENT[id].name)))}, not ticked in your kit.`
        : `You cooked with ${missing.length} things not ticked in your kit.`}{' '}
      <button
        className="link-button"
        type="button"
        aria-disabled={busy}
        onClick={() =>
          void run(() =>
            focusAfter('kit-added', async () => {
              await addAllToKit(missing, onShopChange)
              setAdded(missing.length)
            }),
          )
        }
      >
        Add {missing.length === 1 ? 'it' : 'them'} to your kit
      </button>
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
  recipe: Recipe
  /** Whether the suggestion is on this week's plan, and its groceries bought. */
  plan: 'bought' | 'planned' | null
  logs: readonly CookLog[]
  shop: Shop
  onShopChange: ShopChange
}) {
  const add = useWrite()
  const { content } = recipe
  const state = recipeState(recipe, logs)
  const last = lastCooked(recipe, logs)
  const label =
    plan === 'bought'
      ? 'Groceries bought'
      : plan === 'planned'
        ? 'On this week’s plan'
        : state === 'ready'
          ? 'Cook this next'
          : 'Cook this again'
  // The first move is the one the week needs: plan it, then shop for it, then cook it.
  const start = (
    <Link className={plan === 'bought' ? 'button' : 'button button-quiet'} to={`/cook/${recipe.id}/0`}>
      Start cooking
    </Link>
  )
  return (
    <section className="tray">
      <Plate state={state} goodCooks={goodCooks(recipe, logs)} size={88} />
      <div>
        <p className="tray-label" aria-hidden="true">
          {label}
        </p>
        {/* The heading's name carries the label, so a list of headings still says what this dish is for. */}
        <h2 className="tray-title" aria-label={`${label}: ${recipe.title}`}>
          {recipe.title}
        </h2>
        <p className="tray-body">
          {formatMinutes(content.totalMinutes)}. {formatCents(cookCostPerServingCents(content, shop.prices))} a serving
          instead of {formatCents(orderCostPerServingCents(content))} delivered.
          {/* Once it is all mastered, the suggestion is whatever has waited longest. */}
          {state === 'mastered' && last !== null && ` Mastered, and not cooked since ${formatCookedOn(last)}.`}
        </p>
        <div className="actions">
          {plan === null && (
            <button
              className="button"
              type="button"
              aria-disabled={add.busy}
              onClick={() => void add.run(() => focusAfter('tray-shop', () => planRecipe(shop, recipe.id, onShopChange)))}
            >
              Add to this week
            </button>
          )}
          {plan === 'planned' && <ShopForIt />}
          {start}
          <Link className="button button-quiet" to={`/recipe/${recipe.id}`}>
            Read the recipe
          </Link>
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

/** The way from a planned suggestion to its groceries. Takes focus when "Add to this week" puts it there. */
function ShopForIt() {
  const ref = useFocusTarget<HTMLAnchorElement>('tray-shop')
  return (
    <Link className="button" to="/shop" ref={ref}>
      Shop for it
    </Link>
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

