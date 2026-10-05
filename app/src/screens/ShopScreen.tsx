// This week: the plan, the grocery list it makes, and checking it off in the
// store. The list is the checkout cost, in whole packages (locked decision 6).

import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { CheckRow } from '../components/CheckRow'
import { useWrite } from '../components/useWrite'
import { EQUIPMENT } from '../curriculum/equipment'
import { INGREDIENTS, type IngredientId } from '../curriculum/ingredients'
import { recipeById } from '../curriculum/recipes'
import type { Recipe } from '../curriculum/types'
import { formatAmount, formatCents, inSentence, listOf, packagesOf, plural } from '../lib/format'
import { groceryList, type GroceryLine } from '../lib/grocery'
import { missingKit } from '../lib/kit'
import {
  checkOff,
  finishShopping,
  removeFromPlan,
  resetPrice,
  setPrice,
  uncheck,
  type Shop,
  type ShopChange,
} from '../lib/shop'

export function ShopScreen({ shop, onShopChange }: { shop: Shop; onShopChange: ShopChange }) {
  const planned = shop.plan.map(recipeById)
  const list = groceryList(shop.plan, shop.pantry, shop.prices)
  const needKit = missingKit(planned, shop.kit)
  const inCart = list.lines.filter((line) => shop.checks.has(line.ingredientId))
  const finish = useWrite()
  const [finished, setFinished] = useState<string | null>(null)

  async function doneShopping() {
    const left = list.lines.length - inCart.length
    if (left > 0 && !window.confirm(`${plural(left, 'thing is', 'things are')} not checked off. Finish shopping anyway?`)) {
      return
    }
    const staples = inCart.map((line) => line.ingredientId).filter((id) => INGREDIENTS[id].staple)
    await finish.run(async () => {
      await finishShopping(staples)
      onShopChange((previous) => ({
        ...previous,
        plan: [],
        checks: new Set(),
        pantry: new Set([...previous.pantry, ...staples]),
      }))
      setFinished(
        staples.length === 0
          ? 'Done shopping. The plan and the list are cleared.'
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
          <ul className="rows">
            {planned.map((recipe) => (
              <PlanRow key={recipe.id} recipe={recipe} onShopChange={onShopChange} />
            ))}
          </ul>
        )}
        {needKit.length > 0 && (
          <p className="notice">
            To cook these you also need: {listOf(needKit.map((id) => inSentence(EQUIPMENT[id].name)))}.{' '}
            <Link to="/kit">Your kit</Link>
          </p>
        )}
      </section>

      {planned.length > 0 && (
        <section className="section">
          <h2 className="section-title">Grocery list</h2>
          <p className="section-note">
            What you pay at the register, in whole packages. A first shop costs far more than the per-serving prices
            on each recipe: the oil, spices and sauces you buy now last for many cooks.
          </p>
          {list.inPantry.length > 0 && (
            <p className="section-note">
              Left off because your <Link to="/pantry">pantry</Link> has them:{' '}
              {listOf(list.inPantry.map((id) => inSentence(INGREDIENTS[id].name)))}.
            </p>
          )}
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
            Clears the plan and the list, and puts the staples you checked off into your pantry.
          </p>
        </section>
      )}
    </main>
  )
}

function PlanRow({ recipe, onShopChange }: { recipe: Recipe; onShopChange: ShopChange }) {
  const { busy, error, run } = useWrite()
  return (
    <li>
      <div className="plan-row">
        <Link className="row-title" to={`/recipe/${recipe.id}`}>
          {recipe.title}
        </Link>
        <button
          className="link-button"
          type="button"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await removeFromPlan(recipe.id)
              onShopChange((shop) => ({ ...shop, plan: shop.plan.filter((id) => id !== recipe.id) }))
            })
          }
        >
          Take off
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
