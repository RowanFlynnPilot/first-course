import { useState } from 'react'
import { Link } from 'react-router'
import { BadgeArt } from '../components/BadgeArt'
import { PromotionBeat, UsualBeat } from '../components/Beats'
import { ChefSprite } from '../components/ChefSprite'
import { Plate } from '../components/Plate'
import { XpBar } from '../components/XpBar'
import { RECIPES } from '../curriculum/recipes'
import type { Recipe, Tier } from '../curriculum/types'
import { badgeById } from '../lib/badges'
import type { Chef } from '../lib/chefs'
import { cookCostPerServingCents, orderCostPerServingCents, totalKeptCents, type Prices } from '../lib/cost'
import { COURSE_NAMES, formatCents, localDateString, plural, skillList } from '../lib/format'
import { missingKit } from '../lib/kit'
import { levelForXp, rankIndexForLevel, RANKS, totalXp, type RankIndex } from '../lib/leveling'
import type { CookNotice } from '../lib/notice'
import {
  goodCooks,
  learnedTechniques,
  missingTechniques,
  nextRecipe,
  recipeState,
  type CookLog,
} from '../lib/progress'
import type { Shop } from '../lib/shop'
import { currentStreak, type Streak } from '../lib/streak'
import { supabase } from '../supabase'

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
  chef,
  logs,
  shop,
  notice,
}: {
  chef: Chef
  logs: readonly CookLog[]
  shop: Shop
  notice: CookNotice | null
}) {
  const next = nextRecipe(logs)
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
          <ChefSprite rank={rank} skin={chef.skin} hair={chef.hair} scale={3} idle />
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

        <UpNext recipe={next} logs={logs} prices={shop.prices} />

        <nav className="quick-links" aria-label="Shopping and kit">
          <Link to="/shop">{shop.plan.length === 0 ? 'This week' : `This week (${shop.plan.length})`}</Link>
          <Link to="/pantry">Pantry</Link>
          <Link to="/kit">Kit</Link>
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
                      {state !== 'locked'
                        ? recipe.content === null
                          ? 'In reach. Not written yet.'
                          : rowNote(recipe, logs)
                        : `${have} of ${plural(recipe.requires.length, 'skill', 'skills')}`}
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
          const toGet = missingKit(recipes, shop.kit).length
          return (
            <section className="section" key={tier}>
              <h2 className="section-title">{COURSE_NAMES[tier]}</h2>
              <p className="section-note">
                {have} of {skills.length} skills learned
                {toGet > 0 && (
                  <>
                    {'. '}
                    <Link to="/kit">Kit: {plural(toGet, 'thing', 'things')} to get</Link>
                  </>
                )}
              </p>
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
        <PromotionBeat chef={chef} rank={moment.rank} onDone={() => setSeen(seen + 1)} />
      )}
      {moment?.kind === 'usual' && <UsualBeat recipe={moment.recipe} onDone={() => setSeen(seen + 1)} />}
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

function UpNext({ recipe, logs, prices }: { recipe: Recipe | null; logs: readonly CookLog[]; prices: Prices }) {
  if (recipe === null || recipe.content === null) {
    return (
      <section className="tray">
        <p className="tray-body">
          You have mastered every recipe written so far. The rest of the usual needs writing before you can cook it.
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
        <p className="tray-label">{state === 'ready' ? 'Cook this next' : 'Cook this again'}</p>
        <h2 className="tray-title">{recipe.title}</h2>
        <p className="tray-body">
          {content.totalMinutes} minutes. {formatCents(cookCostPerServingCents(content, prices))} a serving instead of{' '}
          {formatCents(orderCostPerServingCents(content))} delivered.
        </p>
        <div className="actions">
          <Link className="button" to={`/cook/${recipe.id}/0`}>
            Start cooking
          </Link>
          <Link className="button button-quiet" to={`/recipe/${recipe.id}`}>
            Read the recipe
          </Link>
        </div>
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

function rowNote(recipe: Recipe, logs: readonly CookLog[]): string {
  const state = recipeState(recipe, logs)
  if (state === 'locked') return `Needs ${skillList(missingTechniques(recipe, logs))}`
  if (state === 'mastered') return 'Mastered'
  if (state === 'cooked') {
    const times = logs.filter((log) => log.recipeId === recipe.id).length
    return `Cooked ${plural(times, 'time', 'times')}`
  }
  return `Teaches ${skillList(recipe.teaches)}`
}
