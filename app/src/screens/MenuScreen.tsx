import { Link } from 'react-router'
import { ChefSprite } from '../components/ChefSprite'
import { Plate } from '../components/Plate'
import { XpBar } from '../components/XpBar'
import { RECIPES } from '../curriculum/recipes'
import type { Recipe, Tier } from '../curriculum/types'
import type { Chef } from '../lib/chefs'
import { cookCostPerServingCents, orderCostPerServingCents, totalKeptCents } from '../lib/cost'
import { COURSE_NAMES, formatCents, plural, skillList } from '../lib/format'
import { levelForXp, rankIndexForLevel, RANKS, totalXp } from '../lib/leveling'
import type { CookNotice } from '../lib/notice'
import {
  goodCooks,
  learnedTechniques,
  missingTechniques,
  nextRecipe,
  recipeState,
  type CookLog,
} from '../lib/progress'
import { supabase } from '../supabase'

const COURSES: readonly Tier[] = [1, 2, 3, 4]

export function MenuScreen({
  chef,
  logs,
  notice,
}: {
  chef: Chef
  logs: readonly CookLog[]
  notice: CookNotice | null
}) {
  const next = nextRecipe(logs)
  const usual = RECIPES.filter((recipe) => recipe.tier === 5)
  const learned = learnedTechniques(logs)
  const xp = totalXp(logs)
  const level = levelForXp(xp)
  const rank = rankIndexForLevel(level)

  return (
    <main className="page">
      <header className="masthead">
        <h1 className="wordmark">First Course</h1>
        <p className="kept">
          <strong>{formatCents(totalKeptCents(logs))}</strong> kept by cooking
        </p>
      </header>

      <Link className="chef-card" to="/chef">
        <ChefSprite rank={rank} skin={chef.skin} hair={chef.hair} scale={3} />
        <span>
          <span className="row-title">{chef.name}</span>
          <span className="row-note">
            Level {level} {RANKS[rank].name.toLowerCase()}
          </span>
          <XpBar xp={xp} fromXp={notice === null ? null : notice.xpBefore} />
        </span>
      </Link>

      {notice !== null && (
        <ul className="notice notice-lines" role="status">
          {notice.lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      )}

      <UpNext recipe={next} logs={logs} />

      <section className="section">
        <h2 className="section-title">{COURSE_NAMES[5]}</h2>
        <p className="section-note">What you order now. Everything below builds toward cooking these.</p>
        <ul className="usual">
          {usual.map((recipe) => {
            const have = recipe.requires.length - missingTechniques(recipe, logs).length
            return (
              <li key={recipe.id}>
                <Link className="usual-item" to={`/recipe/${recipe.id}`}>
                  <Plate state={recipeState(recipe, logs)} goodCooks={goodCooks(recipe, logs)} size={56} />
                  <span className="usual-title">{recipe.title}</span>
                  <span className="row-note">
                    {have} of {plural(recipe.requires.length, 'skill', 'skills')}
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
        return (
          <section className="section" key={tier}>
            <h2 className="section-title">{COURSE_NAMES[tier]}</h2>
            <p className="section-note">
              {have} of {skills.length} skills learned
            </p>
            <ul className="rows">
              {recipes.map((recipe) => (
                <RecipeRow key={recipe.id} recipe={recipe} logs={logs} celebrate={notice?.cookedId === recipe.id} />
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
  )
}

function UpNext({ recipe, logs }: { recipe: Recipe | null; logs: readonly CookLog[] }) {
  if (recipe === null || recipe.content === null) {
    return (
      <section className="tray">
        <p className="tray-body">
          You have mastered every recipe written so far. The next course needs writing before you can cook it.
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
          {content.totalMinutes} minutes. {formatCents(cookCostPerServingCents(content))} a serving instead of{' '}
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
  if (recipe.content === null) return 'Unlocked. Not written yet.'
  return `Teaches ${skillList(recipe.teaches)}`
}
