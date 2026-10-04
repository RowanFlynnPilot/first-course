import { Link, useParams } from 'react-router'
import { IngredientList } from '../components/IngredientList'
import { Plate } from '../components/Plate'
import { recipeById } from '../curriculum/recipes'
import { TECHNIQUES } from '../curriculum/techniques'
import type { RecipeContent } from '../curriculum/types'
import {
  cookCostPerServingCents,
  DELIVERY_FEE_CENTS,
  keptPerCookCents,
  orderCostPerServingCents,
  SERVICE_FEE_RATE,
  TIP_RATE,
} from '../lib/cost'
import { COURSE_NAMES, formatCents, formatCookedOn, plural, skillList } from '../lib/format'
import {
  goodCooks,
  MASTERED_COOKS,
  missingTechniques,
  RATINGS,
  recipeState,
  type CookLog,
} from '../lib/progress'

export function RecipeScreen({ logs }: { logs: readonly CookLog[] }) {
  const { id } = useParams()
  if (id === undefined) throw new Error('Recipe route is missing its id')
  const recipe = recipeById(id)
  const state = recipeState(recipe, logs)
  const missing = missingTechniques(recipe, logs)
  const good = goodCooks(recipe, logs)
  const history = logs.filter((log) => log.recipeId === recipe.id).toReversed()

  return (
    <main className="page">
      <nav className="back">
        <Link to="/">Menu</Link>
      </nav>

      <header className="recipe-head">
        <Plate state={state} goodCooks={good} size={64} />
        <div>
          <p className="row-note">{COURSE_NAMES[recipe.tier]}</p>
          <h1 className="title">{recipe.title}</h1>
        </div>
      </header>
      <p className="lede">{recipe.blurb}</p>

      {recipe.teaches.length > 0 && (
        <section className="section">
          <h2 className="section-title">What it teaches</h2>
          <dl className="skills">
            {recipe.teaches.map((technique) => (
              <div key={technique}>
                <dt>{TECHNIQUES[technique].name}</dt>
                <dd>{TECHNIQUES[technique].summary}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {state === 'locked' && (
        <p className="notice">Locked. You still need {skillList(missing)}.</p>
      )}

      {recipe.content === null ? (
        <p className="notice">
          This recipe is on the menu but not written yet. Recipes get written one course ahead of where you are
          cooking.
        </p>
      ) : (
        <Written
          recipeId={recipe.id}
          content={recipe.content}
          locked={state === 'locked'}
        />
      )}

      {history.length > 0 && (
        <section className="section">
          <h2 className="section-title">Your cooks</h2>
          <p className="section-note">
            {state === 'mastered'
              ? 'Mastered.'
              : good >= MASTERED_COOKS
                ? `${good} good cooks. One “Nailed it” masters this.`
                : `${good} of ${MASTERED_COOKS} good cooks toward mastery. One has to be “Nailed it”.`}
          </p>
          <ul className="rows">
            {history.map((log) => (
              <li className="history" key={log.id}>
                <span className="row-title">
                  {RATINGS.find((rating) => rating.value === log.rating)?.label}, {formatCookedOn(log.cookedOn)}
                </span>
                {log.notes !== '' && <span className="row-note">{log.notes}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

function Written({ recipeId, content, locked }: { recipeId: string; content: RecipeContent; locked: boolean }) {
  const feesPercent = Math.round((SERVICE_FEE_RATE + TIP_RATE) * 100)
  return (
    <>
      <p className="facts">
        Serves {content.servings}. {content.activeMinutes} minutes of work, {content.totalMinutes} minutes start to
        finish.
      </p>

      {!locked && (
        <div className="actions">
          <Link className="button" to={`/cook/${recipeId}/0`}>
            Start cooking
          </Link>
        </div>
      )}

      <section className="section">
        <h2 className="section-title">Cook it or order it</h2>
        <dl className="tab">
          <div>
            <dt>Cooking it</dt>
            <dd>{formatCents(cookCostPerServingCents(content))} a serving</dd>
          </div>
          <div className="tab-order">
            <dt>
              Ordering it
              <span className="row-note">{content.delivery.label}</span>
            </dt>
            <dd>{formatCents(orderCostPerServingCents(content))} a serving</dd>
          </div>
          <div className="tab-kept">
            <dt>You keep</dt>
            <dd>
              <mark>{formatCents(keptPerCookCents(content))}</mark> each time
            </dd>
          </div>
        </dl>
        <p className="section-note">
          Cooking counts only the part of each package you use. Ordering is the menu price plus {feesPercent}% in
          fees and tip, and one {formatCents(DELIVERY_FEE_CENTS)} delivery fee. Grocery prices are estimates.
        </p>
      </section>

      <section className="section">
        <h2 className="section-title">Ingredients</h2>
        <IngredientList ingredients={content.ingredients} />
      </section>

      <section className="section">
        <h2 className="section-title">Equipment</h2>
        <ul className="plain-list">
          {content.equipment.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h2 className="section-title">What to pour</h2>
        <p className="pour">{content.pairing.wine}</p>
        <p>
          <strong>{content.pairing.principle}.</strong> {content.pairing.why}
        </p>
      </section>

      <section className="section">
        <h2 className="section-title">Method</h2>
        <p className="section-note">{plural(content.steps.length, 'step', 'steps')}. Cook mode shows one at a time.</p>
        <ol className="method">
          {content.steps.map((step) => (
            <li key={step.text}>{step.text}</li>
          ))}
        </ol>
      </section>
    </>
  )
}
