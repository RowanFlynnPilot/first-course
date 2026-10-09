// What a locked recipe is waiting for: the recipes that teach the skills it
// is missing, and, when those are locked too, the whole way there.

import { Fragment } from 'react'
import { Link } from 'react-router'
import type { TechniqueId } from '../curriculum/techniques'
import type { Recipe } from '../curriculum/types'
import { listPieces, skillList } from '../lib/format'
import { missingTechniques, pathTo, teacherOf, type CookLog } from '../lib/progress'
import { usePageTitle } from './usePageTitle'

/** Recipe titles joined like any list, each a link to its page. */
export function RecipeLinks({ recipes }: { recipes: readonly Recipe[] }) {
  return listPieces(recipes.length).map((piece, index) => {
    if ('text' in piece) return <Fragment key={index}>{piece.text}</Fragment>
    const recipe = recipes[piece.index]
    if (recipe === undefined) throw new Error(`No recipe at ${piece.index} in the list`)
    return (
      <Link key={recipe.id} to={`/recipe/${recipe.id}`}>
        {recipe.title}
      </Link>
    )
  })
}

/**
 * "Locked. Learn heat control from Soft scrambled eggs on toast." One
 * sentence per recipe that teaches what is missing, then, when one of those
 * is locked too, "The way there:" every recipe to cook first, in order.
 */
export function LockedNotice({ recipe, logs }: { recipe: Recipe; logs: readonly CookLog[] }) {
  const teachers = new Map<Recipe, TechniqueId[]>()
  for (const technique of missingTechniques(recipe, logs)) {
    const teacher = teacherOf(technique)
    teachers.set(teacher, [...(teachers.get(teacher) ?? []), technique])
  }
  const path = pathTo(recipe, logs)
  return (
    <p className="notice notice-info">
      Locked.
      {[...teachers].map(([teacher, skills]) => (
        <span key={teacher.id}>
          {' '}
          Learn {skillList(skills)} from <Link to={`/recipe/${teacher.id}`}>{teacher.title}</Link>.
        </span>
      ))}
      {path.length > teachers.size && (
        <>
          {' '}
          The way there, each cooked at Decent or better: <RecipeLinks recipes={path} />, then this.
        </>
      )}
    </p>
  )
}

/**
 * Cook mode or the log form for a recipe that is locked: reached from an old
 * link, or locked again by a catch-up that brought in a cook deleted on
 * another device. Says why, and how back, instead of failing the whole app.
 */
export function LockedPage({ recipe, logs }: { recipe: Recipe; logs: readonly CookLog[] }) {
  usePageTitle(recipe.title)
  return (
    <main className="page">
      <nav className="back">
        <Link to={`/recipe/${recipe.id}`}>{recipe.title}</Link>
      </nav>
      <h1 className="title">{recipe.title} is locked</h1>
      <LockedNotice recipe={recipe} logs={logs} />
    </main>
  )
}
