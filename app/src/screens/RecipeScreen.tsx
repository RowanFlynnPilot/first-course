import { Link, useParams } from 'react-router'
import { EquipmentList } from '../components/EquipmentList'
import { IngredientList } from '../components/IngredientList'
import { Plate } from '../components/Plate'
import { usePageTitle } from '../components/usePageTitle'
import { useWrite } from '../components/useWrite'
import { recipeById } from '../curriculum/recipes'
import { TECHNIQUES, type TechniqueId } from '../curriculum/techniques'
import type { Recipe, RecipeContent } from '../curriculum/types'
import {
  cookCostPerServingCents,
  COUNTED_SERVINGS,
  DELIVERY_FEE_CENTS,
  keptPerCookCents,
  orderCostPerServingCents,
  SERVICE_FEE_RATE,
  TIP_RATE,
} from '../lib/cost'
import { COURSE_NAMES, formatCents, formatCookedOn, formatDuration, formatMinutes, plural, skillList } from '../lib/format'
import {
  goodCooks,
  lastNote,
  MASTERED_COOKS,
  missingTechniques,
  RATINGS,
  recipeState,
  teacherOf,
  type CookLog,
} from '../lib/progress'
import { planRecipe, removeFromPlan, withoutPlanned, type Shop, type ShopChange } from '../lib/shop'

export function RecipeScreen({
  logs,
  shop,
  onShopChange,
}: {
  logs: readonly CookLog[]
  shop: Shop
  onShopChange: ShopChange
}) {
  const { id } = useParams()
  if (id === undefined) throw new Error('Recipe route is missing its id')
  const recipe = recipeById(id)
  usePageTitle(recipe.title)
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

      {state === 'locked' && <LockedNotice missing={missing} />}

      <Written
        recipe={recipe}
        content={recipe.content}
        locked={state === 'locked'}
        note={lastNote(recipe.id, logs)}
        shop={shop}
        onShopChange={onShopChange}
      />

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
              <li key={log.id}>
                <Link className="history" to={`/cook-log/${log.id}`}>
                  <span>
                    <span className="row-title">
                      {RATINGS.find((rating) => rating.value === log.rating)?.label}, {formatCookedOn(log.cookedOn)}
                    </span>
                    {log.notes !== '' && <span className="row-note">{log.notes}</span>}
                  </span>
                  <span className="history-change">Change</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

function Written({
  recipe,
  content,
  locked,
  note,
  shop,
  onShopChange,
}: {
  recipe: Recipe
  content: RecipeContent
  locked: boolean
  /** The last note left on this recipe's cooks. */
  note: string | null
  shop: Shop
  onShopChange: ShopChange
}) {
  const feesPercent = Math.round((SERVICE_FEE_RATE + TIP_RATE) * 100)
  return (
    <>
      <p className="facts">
        Serves {content.servings}. {formatMinutes(content.activeMinutes)} of work, {formatMinutes(content.totalMinutes)}{' '}
        start to finish.
      </p>

      {!locked && (
        <div className="actions">
          <Link className="button" to={`/cook/${recipe.id}/0`}>
            Start cooking
          </Link>
          <PlanButton recipe={recipe} shop={shop} onShopChange={onShopChange} />
          <Link className="button button-quiet" to={`/cook/${recipe.id}/log`}>
            Log a cook
          </Link>
        </div>
      )}
      {!locked && note !== null && <p className="notice">Last time you wrote: “{note}”</p>}

      <section className="section">
        <h2 className="section-title">Cook it or order it</h2>
        <dl className="tab">
          <div>
            <dt>Cooking it</dt>
            <dd>{formatCents(cookCostPerServingCents(content, shop.prices))} a serving</dd>
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
              <mark>{formatCents(keptPerCookCents(content, shop.prices))}</mark> each time
            </dd>
          </div>
        </dl>
        <p className="section-note">
          Cooking counts only the part of each package you use. Ordering is the menu price plus {feesPercent}% in
          fees and tip, and one {formatCents(DELIVERY_FEE_CENTS)} delivery fee.
          {content.servings > COUNTED_SERVINGS &&
            ` It makes ${content.servings} servings, but “you keep” counts ${COUNTED_SERVINGS}: dinner, not the leftovers.`}{' '}
          Grocery prices are estimates until you correct them on the grocery list.
        </p>
      </section>

      <section className="section">
        <h2 className="section-title">Ingredients</h2>
        <IngredientList ingredients={content.ingredients} />
      </section>

      <section className="section">
        <h2 className="section-title">Equipment</h2>
        <EquipmentList items={content.equipment} kit={shop.kit} />
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
            <li key={step.text}>
              {step.text}
              {step.timer !== null && <span className="row-note">Timer: {formatDuration(step.timer.seconds)}</span>}
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}

/** "Locked. Learn heat control from Soft scrambled eggs on toast.", one sentence per recipe that teaches what is missing. */
function LockedNotice({ missing }: { missing: readonly TechniqueId[] }) {
  const teachers = new Map<Recipe, TechniqueId[]>()
  for (const technique of missing) {
    const teacher = teacherOf(technique)
    teachers.set(teacher, [...(teachers.get(teacher) ?? []), technique])
  }
  return (
    <p className="notice">
      Locked.
      {[...teachers].map(([teacher, skills]) => (
        <span key={teacher.id}>
          {' '}
          Learn {skillList(skills)} from <Link to={`/recipe/${teacher.id}`}>{teacher.title}</Link>.
        </span>
      ))}
    </p>
  )
}

/** "Add to this week": one batch per recipe on the plan, no servings scaling. */
function PlanButton({ recipe, shop, onShopChange }: { recipe: Recipe; shop: Shop; onShopChange: ShopChange }) {
  const { busy, error, run } = useWrite()
  const planned = shop.plan.includes(recipe.id)

  function toggle() {
    void run(async () => {
      if (planned) {
        await removeFromPlan(recipe.id)
        onShopChange((previous) => withoutPlanned(previous, recipe.id))
      } else {
        await planRecipe(shop, recipe.id, onShopChange)
      }
    })
  }

  return (
    <>
      <button className="button button-quiet" type="button" disabled={busy} onClick={toggle}>
        {planned ? 'Take off this week' : 'Add to this week'}
      </button>
      {planned && (
        <p className="plan-note">
          {shop.shopped.has(recipe.id) ? (
            <>
              On <Link to="/shop">this week’s plan</Link>, groceries bought.
            </>
          ) : (
            <>
              On <Link to="/shop">this week’s plan</Link>.
            </>
          )}
        </p>
      )}
      {error !== null && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
    </>
  )
}
