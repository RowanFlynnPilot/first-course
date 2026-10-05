// This week: the plan, the grocery list it makes, and checking it off in the
// store. The list is the checkout cost, in whole packages (locked decision 6).

import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { CheckRow } from '../components/CheckRow'
import { usePageTitle } from '../components/usePageTitle'
import { useWrite } from '../components/useWrite'
import { EQUIPMENT } from '../curriculum/equipment'
import { INGREDIENTS, type IngredientId } from '../curriculum/ingredients'
import { recipeById } from '../curriculum/recipes'
import type { Recipe } from '../curriculum/types'
import { formatAmount, formatCents, inSentence, listOf, packagesOf, plural, skillList } from '../lib/format'
import { groceryList, groceryText, type GroceryLine } from '../lib/grocery'
import { missingKit } from '../lib/kit'
import { missingTechniques, recipeState, type CookLog } from '../lib/progress'
import {
  checkOff,
  clearFromPantry,
  clearStaleChecks,
  finishShopping,
  removeFromPlan,
  resetPrice,
  setPrice,
  shopForAgain,
  toShopFor,
  uncheck,
  withoutPlanned,
  type Shop,
  type ShopChange,
} from '../lib/shop'

export function ShopScreen({ shop, logs, onShopChange }: { shop: Shop; logs: readonly CookLog[]; onShopChange: ShopChange }) {
  usePageTitle('This week')
  const planned = shop.plan.map(recipeById)
  // Only what is not yet bought goes on the list.
  const toShop = toShopFor(shop)
  const list = groceryList(toShop, shop.pantry, shop.prices)
  const needKit = missingKit(planned, shop.kit)
  const inCart = list.lines.filter((line) => shop.checks.has(line.ingredientId))
  const notInCart = list.lines.filter((line) => !shop.checks.has(line.ingredientId))
  const toBuy = notInCart.length
  const finish = useWrite()
  const [finished, setFinished] = useState<string | null>(null)

  async function doneShopping() {
    const left = listOf(notInCart.map((line) => inSentence(INGREDIENTS[line.ingredientId].name)))
    if (toBuy > 0 && !window.confirm(`Not checked off: ${left}. They come off the list. Finish shopping anyway?`)) {
      return
    }
    const staples = inCart.map((line) => line.ingredientId).filter((id) => INGREDIENTS[id].staple)
    await finish.run(async () => {
      await finishShopping(staples)
      onShopChange((previous) => ({
        ...previous,
        shopped: new Set(previous.plan),
        checks: new Set(),
        pantry: new Set([...previous.pantry, ...staples]),
      }))
      setFinished(
        staples.length === 0
          ? 'Done shopping. The list is cleared.'
          : `Done shopping. ${listOf(staples.map((id) => INGREDIENTS[id].name))} went into your pantry.`,
      )
    })
  }

  return (
    <main className="page">
      <nav className="back">
        <Link to="/">Menu</Link>
      </nav>
      <h1 className="title">This week</h1>
      {finished !== null && (
        <p className="notice" role="status">
          {finished}
        </p>
      )}

      <section className="section">
        <h2 className="section-title">The plan</h2>
        {planned.length === 0 ? (
          <p className="section-note">
            Nothing planned yet. Open a recipe you can cook and choose “Add to this week”.
          </p>
        ) : (
          <>
            <p className="section-note">Each recipe leaves the plan when you log a cook of it.</p>
            <ul className="rows">
              {planned.map((recipe) => (
                <PlanRow key={recipe.id} recipe={recipe} shop={shop} logs={logs} onShopChange={onShopChange} />
              ))}
            </ul>
          </>
        )}
        {needKit.length > 0 && (
          <p className="notice">
            To cook these you also need: {listOf(needKit.map((id) => inSentence(EQUIPMENT[id].name)))}.{' '}
            <Link to="/kit">Your kit</Link>
          </p>
        )}
      </section>

      {planned.length > 0 && toShop.length === 0 && (
        <section className="section">
          <h2 className="section-title">Grocery list</h2>
          <p className="section-note">
            Everything on the plan is bought. Add a recipe and its groceries go on a new list.
          </p>
        </section>
      )}

      {toShop.length > 0 && (
        <section className="section">
          <h2 className="section-title">Grocery list</h2>
          <p className="section-note">
            What you pay at the register, in whole packages. A first shop costs far more than the per-serving prices
            on each recipe: the oil, spices and sauces you buy now last for many cooks.
          </p>
          {list.inPantry.length > 0 && (
            <>
              <p className="section-note">
                Left off because your <Link to="/pantry">pantry</Link> has them. Out of one? Put it on the list.
              </p>
              <ul className="rows">
                {list.inPantry.map((id) => (
                  <InPantryRow key={id} id={id} onShopChange={onShopChange} />
                ))}
              </ul>
            </>
          )}
          {toBuy > 0 && <ShareButton text={groceryText(toShop, list, shop.checks)} />}
          {list.sections.map((section) => (
            <div className="aisle" key={section.id}>
              <h3 className="aisle-title">{section.name}</h3>
              <ul className="checks checks-cart">
                {section.lines.map((line) => (
                  <GroceryRow key={line.ingredientId} line={line} shop={shop} onShopChange={onShopChange} />
                ))}
              </ul>
            </div>
          ))}
          <dl className="tab">
            <div className="tab-kept">
              <dt>Checkout total</dt>
              <dd>{formatCents(list.totalCents)}</dd>
            </div>
          </dl>
          <p className="section-note">
            {inCart.length} of {plural(list.lines.length, 'thing', 'things')} in the cart. Tap a price to correct it.
          </p>
          {toBuy === 0 && (
            <p className="notice">
              Everything is in the cart. Tap “Done shopping” to put the staples in your pantry and mark the plan
              bought.
            </p>
          )}
          {finish.error !== null && (
            <p className="notice notice-error" role="alert">
              {finish.error}
            </p>
          )}
          <div className="actions">
            <button className="button" type="button" disabled={finish.busy} onClick={() => void doneShopping()}>
              Done shopping
            </button>
          </div>
          <p className="section-note">
            Clears the list and puts the staples you checked off into your pantry. The plan stays until you cook.
          </p>
        </section>
      )}
    </main>
  )
}

/** Sends what is left to buy through the phone's share sheet: to Notes, a message, or whoever is shopping. */
function ShareButton({ text }: { text: string }) {
  const { busy, error, run } = useWrite()
  // Like the wake lock, sharing needs HTTPS, so the plain-HTTP LAN URL says so.
  if (!('share' in navigator)) return <p className="section-note">This browser cannot share the list.</p>

  function share() {
    void run(async () => {
      try {
        await navigator.share({ title: 'Grocery list', text })
      } catch (cause) {
        // Closing the share sheet without sending is not a failure.
        if ((cause as Error).name === 'AbortError') return
        throw new Error(`Could not share the list: ${(cause as Error).message}`)
      }
    })
  }

  return (
    <div className="actions">
      <button className="button button-quiet" type="button" disabled={busy} onClick={share}>
        Share the list
      </button>
      {error !== null && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function PlanRow({
  recipe,
  shop,
  logs,
  onShopChange,
}: {
  recipe: Recipe
  shop: Shop
  logs: readonly CookLog[]
  onShopChange: ShopChange
}) {
  const { busy, error, run } = useWrite()
  const shopped = shop.shopped.has(recipe.id)
  // Deleting a cook can take away a skill this recipe needs.
  const locked = recipeState(recipe, logs) === 'locked'
  return (
    <li>
      <div className="plan-row">
        <span>
          <Link className="row-title" to={`/recipe/${recipe.id}`}>
            {recipe.title}
          </Link>
          {locked && <span className="row-note">Locked again: needs {skillList(missingTechniques(recipe, logs))}</span>}
          {shopped && <span className="row-note">Groceries bought</span>}
        </span>
        <button
          className="link-button"
          type="button"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await removeFromPlan(recipe.id)
              onShopChange((previous) => withoutPlanned(previous, recipe.id))
            })
          }
        >
          Take off
        </button>
      </div>
      {shopped && (
        <button
          className="link-button"
          type="button"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              // Old ticks go first, so the list this recipe goes back on does not open with them.
              const checks = await clearStaleChecks(shop)
              onShopChange((previous) => ({ ...previous, checks }))
              await shopForAgain(recipe.id)
              onShopChange((previous) => {
                const next = new Set(previous.shopped)
                next.delete(recipe.id)
                return { ...previous, shopped: next }
              })
            })
          }
        >
          Put it back on the list
        </button>
      )}
      {error !== null && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
    </li>
  )
}

/** A staple left off the list because the pantry has it, with a way to say it ran out. */
function InPantryRow({ id, onShopChange }: { id: IngredientId; onShopChange: ShopChange }) {
  const { busy, error, run } = useWrite()
  const { name } = INGREDIENTS[id]
  return (
    <li>
      <div className="plan-row">
        <span>{name}</span>
        <button
          className="link-button"
          type="button"
          disabled={busy}
          aria-label={`Put ${inSentence(name)} on the list`}
          onClick={() =>
            void run(async () => {
              await clearFromPantry(id)
              onShopChange((previous) => {
                const pantry = new Set(previous.pantry)
                pantry.delete(id)
                return { ...previous, pantry }
              })
            })
          }
        >
          Put it on the list
        </button>
      </div>
      {error !== null && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
    </li>
  )
}

function GroceryRow({ line, shop, onShopChange }: { line: GroceryLine; shop: Shop; onShopChange: ShopChange }) {
  const [editing, setEditing] = useState(false)
  const ingredient = INGREDIENTS[line.ingredientId]
  const checked = shop.checks.has(line.ingredientId)
  const corrected = shop.prices.has(line.ingredientId)

  if (editing) {
    return (
      <PriceForm
        id={line.ingredientId}
        current={line.packagePriceCents}
        corrected={corrected}
        onShopChange={onShopChange}
        onClose={() => setEditing(false)}
      />
    )
  }

  // "2 red onions. The plan uses 1¼." Say what the plan uses only when it is not whole packages.
  const uses =
    line.qty === line.packages * ingredient.package.units ? '' : `. The plan uses ${formatAmount(line.qty, ingredient.unit)}.`

  return (
    <CheckRow
      checked={checked}
      label={ingredient.name}
      note={`${packagesOf(line.packages, ingredient.package.label)}${uses}`}
      onChange={async (next) => {
        await (next ? checkOff(line.ingredientId) : uncheck(line.ingredientId))
        onShopChange((previous) => {
          const checks = new Set(previous.checks)
          if (next) checks.add(line.ingredientId)
          else checks.delete(line.ingredientId)
          return { ...previous, checks }
        })
      }}
      aside={
        <button
          className="price-button"
          type="button"
          aria-label={`Correct the price of ${ingredient.name}`}
          onClick={() => setEditing(true)}
        >
          {formatCents(line.totalCents)}
          {corrected && <span className="row-note">your price</span>}
        </button>
      }
    />
  )
}

function PriceForm({
  id,
  current,
  corrected,
  onShopChange,
  onClose,
}: {
  id: IngredientId
  current: number
  corrected: boolean
  onShopChange: ShopChange
  onClose: () => void
}) {
  const ingredient = INGREDIENTS[id]
  const [value, setValue] = useState((current / 100).toFixed(2))
  const { busy, error, run } = useWrite()

  function save(event: FormEvent) {
    event.preventDefault()
    void run(async () => {
      const match = /^\$?\s*(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim())
      const cents = match === null ? 0 : Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'))
      if (cents <= 0) throw new Error('Enter the price you paid, like 3.49.')
      await setPrice(id, cents)
      onShopChange((shop) => ({ ...shop, prices: new Map(shop.prices).set(id, cents) }))
      onClose()
    })
  }

  return (
    <li className="check">
      <form className="price-form" onSubmit={save}>
        <label className="field">
          {ingredient.name}
          <span className="row-note">What you paid for {ingredient.package.label}</span>
          <input type="text" inputMode="decimal" autoComplete="off" value={value} onChange={(event) => setValue(event.target.value)} />
        </label>
        {error !== null && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}
        <div className="actions">
          <button className="button" type="submit" disabled={busy}>
            Save price
          </button>
          <button className="button button-quiet" type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
        </div>
        {corrected && (
          <button
            className="link-button"
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await resetPrice(id)
                onShopChange((shop) => {
                  const prices = new Map(shop.prices)
                  prices.delete(id)
                  return { ...shop, prices }
                })
                onClose()
              })
            }
          >
            Go back to the estimate, {formatCents(ingredient.package.priceCents)}
          </button>
        )}
      </form>
    </li>
  )
}
