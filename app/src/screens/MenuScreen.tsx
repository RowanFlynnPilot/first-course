import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { BadgeArt } from '../components/BadgeArt'
import { PromotionBeat, UsualBeat } from '../components/Beats'
import { RecipeLinks } from '../components/LockedNotice'
import { focusAfter, focusNext, useFocusTarget } from '../components/useFocusTarget'
import { useKeepMenuScroll } from '../components/menuScroll'
import { useNow } from '../components/useNow'
import { usePageTitle } from '../components/usePageTitle'
import { useWrite } from '../components/useWrite'
import { ErrorNotice, Saving } from '../components/WriteStatus'
import { ChefSprite } from '../components/ChefSprite'
import { Plate } from '../components/Plate'
import { XpBar } from '../components/XpBar'
import { EQUIPMENT } from '../curriculum/equipment'
import { RECIPES, recipeById } from '../curriculum/recipes'
import type { Recipe, Tier } from '../curriculum/types'
import { badgeById } from '../lib/badges'
import { updateChef, type Chef } from '../lib/chefs'
import { clearCooking, loadCooking } from '../lib/cooking'
import { cookCostPerServingCents, orderCostPerServingCents, totalKeptCents } from '../lib/cost'
import { extraById, wornExtras, type ExtraId } from '../lib/extras'
import { cookByDates, dayName } from '../lib/freshness'
import { FRIED_RICE, LEFTOVER_DAYS, leftoversOf, loadEaten, makesRice, markEaten } from '../lib/leftovers'
import {
  COURSE_NAMES,
  formatCents,
  formatCookedOn,
  formatMinutes,
  inSentence,
  listOf,
  localDateString,
  plural,
  readyAt,
} from '../lib/format'
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
import { addAllToKit, planRecipe, readyTonight, shopForAgain, type Shop, type ShopChange } from '../lib/shop'
import { currentStreak, type Streak } from '../lib/streak'
import { clearTimers } from '../lib/timers'

const COURSES: readonly Tier[] = [1, 2, 3, 4]


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
  // Each course counts only the kit it adds, as the kit screen files it, so the numbers agree.
  const newKit = kitByCourse()
  const usual = RECIPES.filter((recipe) => recipe.tier === 5)
  const learned = learnedTechniques(logs)
  const xp = totalXp(logs)
  const level = levelForXp(xp)
  const rank = rankIndexForLevel(level)
  // The time where the cook is standing, kept current: the streak counts weeks by the local date, and
  // the card says when dinner would be ready.
  const now = useNow()
  const today = localDateString(new Date(now))
  // Bought meat keeps only days: the one to cook soonest comes first.
  const cookBy = cookByDates(shop.shoppedOn)
  const next = nextRecipe(logs, shop.plan, shop.shopped, cookBy, today)
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
  useKeepMenuScroll()
  // The usual leads the menu once one of its dishes is in reach; until then the courses come first,
  // so a beginner meets what they can cook before seven locked plates (Rowan's call, October 9, 2026).
  const usualFirst = usual.some((recipe) => recipeState(recipe, logs) !== 'locked')
  const usualSection = (
          <section className="section">
            <h2 className="section-title">{COURSE_NAMES[5]}</h2>
            <p className="section-note">
              {usual.every((recipe) => recipeState(recipe, logs) === 'mastered')
                ? 'What you used to order. You have mastered every one of them.'
                : `What you order now. Everything ${usualFirst ? 'below' : 'above'} builds toward cooking these.`}
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
                          ? `${have} of ${plural(recipe.requires.length, 'skill', 'skills')} learned`
                          : rowNote(recipe, logs)}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
  )

  return (
    <>
      {/* Inert behind a full-screen moment: hidden from screen readers, and out of reach of Tab. */}
      <main className="page" inert={!settled}>
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
          <ChefSprite rank={rank} look={chef} extras={wornExtras(chef.extras, logs)} scale={3} idle decorative />
          <span>
            <span className="row-title">{chef.name}</span>
            <span className="row-note chef-level">
              Level {level} {RANKS[rank].name.toLowerCase()}
            </span>
            <XpBar key={settled ? 'settled' : 'waiting'} xp={xp} fromXp={notice === null ? null : notice.xpBefore} />
            <StreakLine streak={streak} />
          </span>
        </Link>

        {/* Not a live region: focus moves to it once the moments are over, which reads it, and a status read
            it again, whole, on every change inside it ("Wearing it."). */}
        {notice !== null && (
          <div className="notice" role="region" aria-label="This cook" ref={noticeRef} tabIndex={-1}>
            <div className="notice-cooked">
              <Plate
                state={recipeState(recipeById(notice.cookedId), logs)}
                goodCooks={goodCooks(recipeById(notice.cookedId), logs)}
                size={44}
                celebrate={settled}
              />
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
            </div>
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

        <Resume userId={userId} logs={logs} now={now} />

        {logs.length === 0 && <FirstSteps shop={shop} />}

        <UpNext
          recipe={next}
          plan={!shop.plan.includes(next.id) ? null : shop.shopped.has(next.id) ? 'bought' : 'planned'}
          logs={logs}
          shop={shop}
          now={now}
          cookBy={cookBy.get(next.id) ?? null}
          onShopChange={onShopChange}
        />
        <Tonight except={next} logs={logs} shop={shop} now={now} />
        <Leftovers userId={userId} logs={logs} today={today} />

        <nav className="quick-links" aria-label="Shopping, kit, and spices">
          <Link to="/shop">{shop.plan.length === 0 ? 'This week' : `This week (${shop.plan.length})`}</Link>
          <Link to="/pantry">Pantry</Link>
          <Link to="/kit">Kit</Link>
          <Link to="/spices">Spices</Link>
        </nav>

        {usualFirst && usualSection}

        {COURSES.map((tier) => {
          const recipes = RECIPES.filter((recipe) => recipe.tier === tier)
          const skills = recipes.flatMap((recipe) => recipe.teaches)
          const have = skills.filter((technique) => learned.has(technique)).length
          const toGet = (newKit.find((course) => course.tier === tier)?.items ?? []).filter((id) => !hasKit(id, shop.kit)).length
          // A course with every recipe mastered folds away, so what is still open is not 3,000 pixels down.
          const done = recipes.every((recipe) => recipeState(recipe, logs) === 'mastered')
          // Courses are gates: a course opens as the skills of the one before it are learned.
          const shut = recipes.every((recipe) => recipeState(recipe, logs) === 'locked')
          const rows = (
            <ul className="rows">
              {recipes.map((recipe) => (
                <RecipeRow key={recipe.id} recipe={recipe} logs={logs} />
              ))}
            </ul>
          )
          return (
            <section className="section" key={tier}>
              <h2 className="section-title">{COURSE_NAMES[tier]}</h2>
              <p className="section-note">
                {have} of {skills.length} skills learned
                {/* Until anything is checked off, a count would say a kitchen with pans needs 25 things. */}
                {shop.kit.size === 0
                  ? tier === 1 && (
                      <>
                        {'. '}
                        <Link to="/kit">Check your kit</Link>
                      </>
                    )
                  : toGet > 0 && (
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
                  Opens as you learn {COURSE_NAMES[(tier - 1) as Tier].toLowerCase()} skills. Each recipe below says
                  which it needs.
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

        {!usualFirst && usualSection}

        <footer className="footer">
          <button
            className="link-button"
            type="button"
            aria-disabled={signOut.busy}
            onClick={() => void signOut.run(onSignOut)}
          >
            Sign out
          </button>
          <ErrorNotice error={signOut.error} />
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
    { done: shop.kit.size > 0, to: '/kit', text: 'Check off the kit you already own' },
    { done: shop.pantry.size > 0, to: '/pantry', text: 'Check off the staples already in your pantry' },
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
      <Saving busy={busy} />
      <ErrorNotice error={error} />
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
        ? `You cooked with ${listOf(missing.map((id) => inSentence(EQUIPMENT[id].name)))}, not checked off in your kit.`
        : `You cooked with ${missing.length} things not checked off in your kit.`}{' '}
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
      <Saving busy={busy} />
      <ErrorNotice error={error} />
    </li>
  )
}

/**
 * The cook in progress on this phone, when the app closed in the middle of
 * it (lib/cooking.ts): the way back to the step, or, once the last step was
 * done, to logging it.
 */
function Resume({ userId, logs, now }: { userId: string; logs: readonly CookLog[]; now: number }) {
  const [forgotten, setForgotten] = useState(false)
  const cooking = forgotten ? null : loadCooking(localStorage, userId, now)
  if (cooking === null) return null
  const recipe = recipeById(cooking.recipeId)
  // A catch-up can lock it again (a cook deleted elsewhere): its screen would only say so.
  if (recipeState(recipe, logs) === 'locked') return null
  // A recipe revised mid-cook can have fewer steps now.
  const step = cooking.step === 'log' ? 'log' : Math.min(cooking.step, recipe.content.steps.length)
  return (
    <section className="notice notice-info resume" aria-label="The cook in progress">
      <p>
        {step === 'log'
          ? `You finished ${recipe.title}. How did it go?`
          : step === 0
            ? `You were getting ready to cook ${recipe.title}.`
            : `You were cooking ${recipe.title}: step ${step} of ${recipe.content.steps.length}.`}
      </p>
      <div className="actions">
        <Link className="button" to={step === 'log' ? `/cook/${recipe.id}/log` : `/cook/${recipe.id}/${step}`}>
          {step === 'log' ? 'Log it' : step === 0 ? 'Back to it' : `Back to step ${step}`}
        </Link>
        <button
          className="link-button"
          type="button"
          onClick={() => {
            clearCooking(localStorage, userId)
            clearTimers(localStorage, recipe.id)
            setForgotten(true)
          }}
        >
          {step === 'log' ? 'Not logging it' : 'Not cooking it now'}
        </button>
      </div>
    </section>
  )
}

/** How many other recipes the Tonight line offers. */
const TONIGHT = 3

/**
 * Other recipes that need no shop tonight: groceries bought, or everything
 * in the pantry. Quickest first, with when each would be ready.
 */
function Tonight({ except, logs, shop, now }: { except: Recipe; logs: readonly CookLog[]; shop: Shop; now: number }) {
  const ready = RECIPES.filter(
    (recipe) => recipe.id !== except.id && recipeState(recipe, logs) !== 'locked' && readyTonight(recipe, shop),
  )
    .toSorted((a, b) => a.content.totalMinutes - b.content.totalMinutes)
    .slice(0, TONIGHT)
  if (ready.length === 0) return null
  return (
    <section className="tonight" aria-labelledby="tonight-title">
      <h2 className="tonight-title" id="tonight-title">
        Also ready tonight, with what you have
      </h2>
      <ul className="rows">
        {ready.map((recipe) => (
          <li key={recipe.id}>
            <Link className="row" to={`/recipe/${recipe.id}`}>
              <span>
                <span className="row-title">{recipe.title}</span>
                <span className="row-note">
                  {formatMinutes(recipe.content.totalMinutes)}: eat around {readyAt(now, recipe.content.totalMinutes)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

/**
 * What is left from a recent cook (lib/leftovers.ts): from when, the last
 * day to eat it, how to reheat it, and what leftover rice can become.
 */
function Leftovers({ userId, logs, today }: { userId: string; logs: readonly CookLog[]; today: string }) {
  const [eaten, setEaten] = useState(() => loadEaten(localStorage, userId))
  const title = useFocusTarget<HTMLHeadingElement>('leftovers-title')
  const left = leftoversOf(logs, today, eaten)
  if (left.length === 0) return null
  const friedRiceOpen = recipeState(FRIED_RICE, logs) !== 'locked'
  return (
    <section className="tonight" aria-labelledby="leftovers-title">
      <h2 className="tonight-title" id="leftovers-title" ref={title} tabIndex={-1}>
        Leftovers
      </h2>
      <ul className="rows">
        {left.map(({ cook, recipe, eatBy }) => (
          <li key={cook.id} className="leftover">
            <div className="plan-row">
              <span>
                <Link className="row-title" to={`/recipe/${recipe.id}`}>
                  {recipe.title}
                </Link>
                <span className="row-note">
                  From {dayName(cook.cookedOn, today)}. {eatBy === today ? 'Eat it today.' : `Eat by ${dayName(eatBy, today)}.`}
                </span>
              </span>
              <button
                className="link-button"
                type="button"
                aria-label={`All eaten: ${recipe.title}`}
                onClick={() => {
                  focusNext('leftovers-title')
                  setEaten(
                    markEaten(
                      localStorage,
                      userId,
                      cook.id,
                      left.map((each) => each.cook.id),
                    ),
                  )
                }}
              >
                All eaten
              </button>
            </div>
            <p className="row-note">{recipe.content.leftovers?.reheat}</p>
            {makesRice(recipe) && (
              <p className="row-note">
                Leftover rice: reheat it only once, until it is steaming hot
                {friedRiceOpen ? (
                  <>
                    , or <Link to={`/cook/${FRIED_RICE.id}/3`}>make egg fried rice with it, from step 3</Link>.
                  </>
                ) : (
                  `, within the same ${LEFTOVER_DAYS} days.`
                )}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function UpNext({
  recipe,
  plan,
  logs,
  shop,
  now,
  cookBy,
  onShopChange,
}: {
  recipe: Recipe
  /** Whether the suggestion is on this week's plan, and its groceries bought. */
  plan: 'bought' | 'planned' | null
  logs: readonly CookLog[]
  shop: Shop
  now: number
  /** The day its bought meat should be cooked by, or null (lib/freshness.ts). */
  cookBy: string | null
  onShopChange: ShopChange
}) {
  const add = useWrite()
  const again = useWrite()
  const { content } = recipe
  const today = localDateString(new Date(now))
  // Past the day its meat keeps: the cook checks the package, and may need to shop again.
  const stale = cookBy !== null && cookBy < today
  const boughtOn = shop.shoppedOn.get(recipe.id)
  const state = recipeState(recipe, logs)
  const last = lastCooked(recipe, logs)
  // Bought, or all in the pantry: nothing to plan or buy, so cooking leads.
  const cookNow = readyTonight(recipe, shop) && !stale
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
    <Link className={cookNow ? 'button' : 'button button-quiet'} to={`/cook/${recipe.id}/0`}>
      Start cooking
    </Link>
  )
  return (
    <section className="tray">
      <div className="tray-head">
        <p className="tray-label" aria-hidden="true">
          {label}
        </p>
        {/* The heading's name carries the label, so a list of headings still says what this dish is for. */}
        <h2 className="tray-title" aria-label={`${label}: ${recipe.title}`}>
          {recipe.title}
        </h2>
      </div>
      <Plate state={state} goodCooks={goodCooks(recipe, logs)} size={64} />
      <div className="tray-rest">
        <p className="tray-body">
          {formatMinutes(content.totalMinutes)}: start now and eat around {readyAt(now, content.totalMinutes)}.{' '}
          {formatCents(cookCostPerServingCents(content, shop.prices))} a serving instead of{' '}
          {formatCents(orderCostPerServingCents(content))} delivered.
          {cookBy !== null &&
            !stale &&
            ` ${cookBy === today ? 'Cook it today' : `Cook it by ${dayName(cookBy, today)}`}, while the meat is fresh.`}
          {stale &&
            boughtOn !== undefined &&
            ` Bought ${formatCookedOn(boughtOn)}, so check the date on the meat: if it has passed, put it back on the list.`}
          {/* Once it is all mastered, the suggestion is whatever has waited longest. */}
          {state === 'mastered' && last !== null && ` Mastered, and not cooked since ${formatCookedOn(last)}.`}
        </p>
        <div className="actions">
          {cookNow && start}
          {plan === null && !cookNow && (
            <button
              className="button"
              type="button"
              aria-disabled={add.busy}
              onClick={() => void add.run(() => focusAfter('tray-shop', () => planRecipe(recipe.id, onShopChange)))}
            >
              Add to this week
            </button>
          )}
          <Saving busy={add.busy} />
          {stale && (
            <button
              className="button"
              type="button"
              aria-disabled={again.busy}
              onClick={() => void again.run(() => focusAfter('tray-shop', () => shopForAgain(recipe.id, onShopChange)))}
            >
              Put it back on the list
            </button>
          )}
          <Saving busy={again.busy} />
          {plan === 'planned' && !cookNow && <ShopForIt />}
          {!cookNow && start}
          <Link className="button button-quiet" to={`/recipe/${recipe.id}`}>
            Read the recipe
          </Link>
        </div>
        <ErrorNotice error={add.error} />
        <ErrorNotice error={again.error} />
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

function RecipeRow({ recipe, logs }: { recipe: Recipe; logs: readonly CookLog[] }) {
  const state = recipeState(recipe, logs)
  return (
    <li>
      <Link className={`row row-${state}`} to={`/recipe/${recipe.id}`}>
        <Plate state={state} goodCooks={goodCooks(recipe, logs)} size={44} />
        <span>
          <span className="row-title">{recipe.title}</span>
          <span className="row-note">{rowNote(recipe, logs)}</span>
        </span>
      </Link>
    </li>
  )
}

