import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { EquipmentList } from '../components/EquipmentList'
import { IngredientList } from '../components/IngredientList'
import { LockedNotice } from '../components/LockedNotice'
import { Plate } from '../components/Plate'
import { usePageTitle } from '../components/usePageTitle'
import { useWrite } from '../components/useWrite'
import { ErrorNotice, Saving } from '../components/WriteStatus'
import { TECHNIQUES } from '../curriculum/techniques'
import type { Recipe, RecipeContent } from '../curriculum/types'
import {
  cookCostPerServingCents,
  COUNTED_SERVINGS,
  countedServings,
  DELIVERY_FEE_CENTS,
  keptPerCookCents,
  orderCostPerServingCents,
  SERVICE_FEE_RATE,
  TIP_RATE,
} from '../lib/cost'
import { TRACK_NAMES } from '../lib/extras'
import { FRIED_RICE, LEFTOVER_DAYS, makesRice } from '../lib/leftovers'
import { COURSE_NAMES, formatCents, formatCookedOn, formatDuration, formatMinutes, plural } from '../lib/format'
import { goodCooks, lastNote, MASTERED_COOKS, masteryLeft, plannable, ratingLabel, recipeFromRoute, recipeState } from '../lib/progress'
import { containsLine } from '../lib/allergens'
import { boughtNote } from '../lib/freshness'
import { planRecipe, takeOffPlan, type Shop, type ShopChange } from '../lib/shop'
import { useToday } from '../components/useNow'
import { useKitchen } from '../kitchen'
import { MenuLink } from '../components/MenuLink'

export function RecipeScreen() {
  const { logs, shop, onShopChange } = useKitchen()
  const { id } = useParams()
  if (id === undefined) throw new Error('Recipe route is missing its id')
  const recipe = recipeFromRoute(id)
  usePageTitle(recipe.title)
  const state = recipeState(recipe, logs)
  const good = goodCooks(recipe, logs)
  // Newest cook first, by the day it was cooked (a cook logged later for an earlier day sits by its day).
  const history = logs
    .filter((log) => log.recipeId === recipe.id)
    .toReversed()
    .toSorted((a, b) => b.cookedOn.localeCompare(a.cookedOn))

  return (
    <main className="page">
      <MenuLink />

      <header className="recipe-head">
        <Plate state={state} goodCooks={good} size={64} />
        <div>
          {/* The track is what the extras count: "Cook the basics 5 times." */}
          <p className="row-note">
            {COURSE_NAMES[recipe.tier]}. Good cooks count toward the extras for {TRACK_NAMES[recipe.track]}.
          </p>
          <h1 className="title">{recipe.title}</h1>
        </div>
      </header>
      <p className="lede">{recipe.blurb}</p>
      {history[0] !== undefined && (
        // "Your cooks" sits under the whole method; this is the way there without scrolling past it.
        <p className="history-jump">
          <button
            className="link-button"
            type="button"
            onClick={() => {
              const heading = document.getElementById('your-cooks')
              if (heading === null) throw new Error('The recipe page has no Your cooks section')
              heading.scrollIntoView()
              heading.focus({ preventScroll: true })
            }}
          >
            {plural(history.length, 'cook', 'cooks')}, last {formatCookedOn(history[0].cookedOn)}
          </button>
        </p>
      )}

      <p className="facts">
        Serves {recipe.content.servings}. {formatMinutes(recipe.content.activeMinutes)} of work,{' '}
        {formatMinutes(recipe.content.totalMinutes)} start to finish.
      </p>
      {state === 'locked' ? (
        <>
          <LockedNotice recipe={recipe} logs={logs} />
          {/* Planned ahead: the week's cooks open it before its night comes. */}
          {(shop.plan.includes(recipe.id) || plannable(recipe, logs, shop.plan)) && (
            <div className="recipe-actions">
              <PlanButton recipe={recipe} shop={shop} onShopChange={onShopChange} ahead />
            </div>
          )}
        </>
      ) : (
        <RecipeActions recipe={recipe} note={lastNote(recipe.id, logs)} shop={shop} onShopChange={onShopChange} />
      )}

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

      <Written content={recipe.content} riceLeft={makesRice(recipe)} shop={shop} />

      {history.length > 0 && (
        <section className="section">
          <h2 className="section-title" id="your-cooks" tabIndex={-1}>
            Your cooks
          </h2>
          <p className="section-note">
            {state === 'mastered'
              ? 'Mastered.'
              : `${good < MASTERED_COOKS ? `${good} of ${MASTERED_COOKS}` : good} good cooks toward mastery. ${masteryLeft(recipe, logs)}`}
          </p>
          <ul className="rows">
            {history.map((log) => (
              <li key={log.id}>
                <Link className="history" to={`/cook-log/${log.id}`}>
                  <span>
                    <span className="row-title">
                      {ratingLabel(log.rating)}, {formatCookedOn(log.cookedOn)}
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

/**
 * Cooking it, planning it, and logging a cook made away from the app (the
 * rare path, so a link), with the last note left on its cooks.
 */
function RecipeActions({
  recipe,
  note,
  shop,
  onShopChange,
}: {
  recipe: Recipe
  note: string | null
  shop: Shop
  onShopChange: ShopChange
}) {
  return (
    <>
      <div className="recipe-actions">
        <Link className="button" to={`/cook/${recipe.id}/0`}>
          Start cooking
        </Link>
        <PlanButton recipe={recipe} shop={shop} onShopChange={onShopChange} />
        <Link className="link-button" to={`/cook/${recipe.id}/log`}>
          Log a cook
        </Link>
      </div>
      {note !== null && <p className="notice notice-info">Last time you wrote: “{note}”</p>}
    </>
  )
}

function Written({ content, riceLeft, shop }: { content: RecipeContent; riceLeft: boolean; shop: Shop }) {
  const feesPercent = Math.round((SERVICE_FEE_RATE + TIP_RATE) * 100)
  return (
    <>
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
            <dt>
              You keep
              {/* Two servings at most, so the sum checks out: what ordering costs them, less what cooking does. */}
              <span className="row-note">For {plural(countedServings(content), 'serving', 'servings')}</span>
            </dt>
            <dd>
              <mark>{formatCents(keptPerCookCents(content, shop.prices))}</mark> each time
            </dd>
          </div>
        </dl>
        <p className="section-note">
          Cooking counts only the part of each package you use. Ordering is the menu price plus {feesPercent}% in
          fees and tip,{' '}
          {content.delivery.side
            ? 'with no delivery fee: a side rides on an order you would place anyway.'
            : `and one ${formatCents(DELIVERY_FEE_CENTS)} delivery fee.`}
          {content.servings > COUNTED_SERVINGS &&
            ` It makes ${content.servings} servings, but “You keep” counts ${COUNTED_SERVINGS}: dinner, not the leftovers.`}{' '}
          Grocery prices are estimates until you correct them on the grocery list.
        </p>
      </section>

      <section className="section">
        <h2 className="section-title">Ingredients</h2>
        <IngredientList ingredients={content.ingredients} />
        {/* Worked out from the ingredients: read the labels too, since products vary. */}
        {containsLine(content) !== null && (
          <p className="section-note">{containsLine(content)} Products vary: check the labels.</p>
        )}
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

      {content.leftovers !== null && (
        <section className="section">
          <h2 className="section-title">Leftovers</h2>
          <p>
            It makes {content.servings} servings. What is left keeps {LEFTOVER_DAYS} days in a lidded container in the
            fridge. {content.leftovers.reheat}
          </p>
          {riceLeft && (
            <p className="section-note">
              Leftover rice: reheat it only once, until it is steaming hot, or make{' '}
              <Link to={`/recipe/${FRIED_RICE.id}`}>{FRIED_RICE.title.toLowerCase()}</Link> with it the next day.
            </p>
          )}
        </section>
      )}

      <section className="section">
        <h2 className="section-title">Method</h2>
        <p className="section-note">{plural(content.steps.length, 'step', 'steps')}. Cook mode shows one at a time.</p>
        <ol className="method">
          {content.steps.map((step) => (
            <li key={step.text}>
              {step.text}
              {step.timer !== null && <span className="row-note">Timer: {formatDuration(step.timer.seconds)}</span>}
              {/* The whys are where the teaching is: a cook reading ahead, or logging without cook mode, gets them too. */}
              {step.why !== null && (
                <p className="why">
                  <strong>Why.</strong> {step.why}
                </p>
              )}
            </li>
          ))}
        </ol>
      </section>
    </>
  )
}

/**
 * "Add to this week": one batch per recipe on the plan, no servings scaling.
 * `ahead` when the recipe is still locked and the plan's cooks open it.
 */
function PlanButton({
  recipe,
  shop,
  onShopChange,
  ahead = false,
}: {
  recipe: Recipe
  shop: Shop
  onShopChange: ShopChange
  ahead?: boolean
}) {
  const { busy, error, run } = useWrite()
  const planned = shop.plan.includes(recipe.id)
  const today = useToday()
  // The button only changes its name, so the status says the change landed.
  const [done, setDone] = useState('')

  function toggle() {
    void run(async () => {
      setDone('')
      if (planned) {
        await takeOffPlan(recipe.id, onShopChange)
        setDone('Taken off this week.')
      } else {
        await planRecipe(recipe.id, onShopChange)
        setDone('Added to this week.')
      }
    })
  }

  return (
    <>
      <button className="button button-quiet" type="button" aria-disabled={busy} onClick={toggle}>
        {planned ? 'Take off this week' : 'Add to this week'}
      </button>
      <Saving busy={busy} done={done} />
      {ahead && !planned && (
        <p className="plan-note">Everything that opens it is on this week’s plan, so it can go on the same shop.</p>
      )}
      {planned && (
        <p className="plan-note">
          On <Link to="/shop">this week’s plan</Link>.
          {shop.shopped.has(recipe.id) && ` ${sentence(boughtNote(recipe, shop.shoppedOn.get(recipe.id), today))}`}
        </p>
      )}
      <ErrorNotice error={error} />
    </>
  )
}

/** A plan note as a sentence: a full stop, unless it asks a question already ("Still have these?"). */
function sentence(note: string): string {
  return note.endsWith('?') ? note : `${note}.`
}
