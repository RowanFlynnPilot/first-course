// This week: the plan, the grocery list it makes, and checking it off in the
// store. The list is the checkout cost, in whole packages (locked decision 6).

import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { CheckRow } from '../components/CheckRow'
import { focusAfter, focusNext, useFocusTarget } from '../components/useFocusTarget'
import { usePageTitle } from '../components/usePageTitle'
import { useWrite } from '../components/useWrite'
import { EQUIPMENT } from '../curriculum/equipment'
import { INGREDIENTS, type IngredientId } from '../curriculum/ingredients'
import { recipeById } from '../curriculum/recipes'
import type { Recipe } from '../curriculum/types'
import { cookCostPerServingCents } from '../lib/cost'
import {
  formatAmount,
  formatCents,
  formatMinutes,
  inSentence,
  listOf,
  localDateString,
  packagesOf,
  parseCents,
  plural,
  skillList,
} from '../lib/format'
import { groceryList, groceryText, type GroceryLine } from '../lib/grocery'
import { missingKit } from '../lib/kit'
import { missingTechniques, readyToPlan, recipeState, type CookLog } from '../lib/progress'
import {
  doneShopping,
  planRecipe,
  resetPrice,
  setChecked,
  setInPantry,
  setPrice,
  shopForAgain,
  takeOffPlan,
  toShopFor,
  type Shop,
  type ShopChange,
} from '../lib/shop'

export function ShopScreen({ shop, logs, onShopChange }: { shop: Shop; logs: readonly CookLog[]; onShopChange: ShopChange }) {
  usePageTitle('This week')
  // Where the cook is standing, read once: a recipe cooked in the last week is offered last.
  const [today] = useState(() => localDateString(new Date()))
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
  // Ticks still saving. Done shopping waits for them, so a staple ticked a
  // moment ago still reaches the pantry.
  const [saving, setSaving] = useState(0)
  async function track(write: () => Promise<void>) {
    setSaving((count) => count + 1)
    try {
      await write()
    } finally {
      setSaving((count) => count - 1)
    }
  }

  const finishedRef = useFocusTarget<HTMLParagraphElement>('shop-done')
  // Where focus goes when a line leaves the list ("Have it"): the next line, or the one before, so the cook keeps their place.
  const order = list.sections.flatMap((section) => section.lines.map((line) => line.ingredientId))
  function neighborOf(id: IngredientId): string {
    const at = order.indexOf(id)
    const near = order[at + 1] ?? order[at - 1]
    return near === undefined ? 'grocery-title' : `check:${near}`
  }
  const groceryTitle = useFocusTarget<HTMLHeadingElement>('grocery-title')
  const planTitle = useFocusTarget<HTMLHeadingElement>('plan-title')

  async function finishShopping() {
    // A tick still saving would be left out of the pantry; a second tap while the first is out does nothing.
    if (saving > 0 || finish.busy) return
    const left = listOf(notInCart.map((line) => inSentence(INGREDIENTS[line.ingredientId].name)))
    if (toBuy > 0 && !window.confirm(`Not checked off: ${left}. They come off the list. Finish shopping anyway?`)) {
      return
    }
    await finish.run(() =>
      focusAfter('shop-done', async () => {
        const staples = await doneShopping(shop, onShopChange)
        setFinished(
          staples.length === 0
            ? 'Done shopping. The list is cleared.'
            : `Done shopping. ${listOf(staples.map((id) => INGREDIENTS[id].name))} went into your pantry.`,
        )
      }),
    )
  }

  // In the store, the list comes first; at home, the plan.
  const shopping = toShop.length > 0
  const ready = readyToPlan(logs, shop.plan, today).slice(0, SUGGESTIONS)

  const listSection = (
    <section className="section">
      <h2 className="section-title" ref={groceryTitle} tabIndex={-1}>
        Grocery list
      </h2>
      <p className="section-note">
        {inCart.length} of {plural(list.lines.length, 'thing', 'things')} in the cart.
      </p>
      {toBuy > 0 && <ShareButton text={groceryText(toShop, list, shop.checks)} />}
      {list.sections.map((section) => (
        <div className="aisle" key={section.id}>
          <h3 className="aisle-title">{section.name}</h3>
          <ul className="checks checks-cart">
            {section.lines.map((line) => (
              <GroceryRow
                key={line.ingredientId}
                line={line}
                shop={shop}
                track={track}
                onShopChange={onShopChange}
                neighbor={neighborOf(line.ingredientId)}
              />
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
      {toBuy === 0 && (
        <p className="notice">
          Everything is in the cart. Tap “Done shopping” to put the staples in your pantry and mark the plan bought.
        </p>
      )}
      {finish.error !== null && (
        <p className="notice notice-error" role="alert">
          {finish.error}
        </p>
      )}
      <div className="actions">
        <button
          className="button"
          type="button"
          aria-disabled={finish.busy || saving > 0}
          onClick={() => void finishShopping()}
        >
          Done shopping
        </button>
      </div>
      <p className="section-note">
        Clears the list and puts the staples you checked off into your pantry. The plan stays until you cook.
      </p>
      {list.inPantry.length > 0 && (
        <>
          <p className="section-note">
            Left off because your <Link to="/pantry">pantry</Link> has them. Out of one? Put it on the list.
          </p>
          <ul className="rows">
            {list.inPantry.map((line) => (
              <InPantryRow key={line.ingredientId} id={line.ingredientId} qty={line.qty} onShopChange={onShopChange} />
            ))}
          </ul>
        </>
      )}
      <p className="section-note">
        What you pay at the register, in whole packages. Tap a price to correct it. A first shop costs far more than
        the per-serving prices on each recipe: the oil, spices and sauces you buy now last for many cooks.
      </p>
    </section>
  )

  const planSection = (
    <section className="section">
      <h2 className="section-title" ref={planTitle} tabIndex={-1}>
        The plan
      </h2>
      {planned.length === 0 ? (
        <p className="section-note">Nothing planned yet. Add what you will cook this week, then shop for it.</p>
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
      {!shopping && planned.length > 0 && (
        <p className="section-note">Everything on the plan is bought. Add a recipe and its groceries go on a new list.</p>
      )}
      {needKit.length > 0 && (
        <p className="notice">
          To cook these you also need: {listOf(needKit.map((id) => inSentence(EQUIPMENT[id].name)))}.{' '}
          <Link to="/kit">Your kit</Link>
        </p>
      )}
    </section>
  )

  return (
    <main className="page">
      <nav className="back">
        <Link to="/">Menu</Link>
      </nav>
      <h1 className="title">This week</h1>
      {finished !== null && (
        <p className="notice" role="status" ref={finishedRef} tabIndex={-1}>
          {finished} <Link to="/">Go to the menu to cook</Link>
        </p>
      )}
      {shopping ? listSection : planSection}
      {shopping && planSection}
      {ready.length > 0 && (
        <section className="section">
          <h2 className="section-title">Ready to cook</h2>
          <p className="section-note">Recipes you can cook now, in the order the menu suggests them.</p>
          <ul className="rows">
            {ready.map((recipe) => (
              <ReadyRow key={recipe.id} recipe={recipe} shop={shop} onShopChange={onShopChange} />
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

/** How many unplanned recipes This week offers to add. */
const SUGGESTIONS = 4

/** A recipe that could go on the plan, with what it takes, and one tap to add it. */
function ReadyRow({ recipe, shop, onShopChange }: { recipe: Recipe; shop: Shop; onShopChange: ShopChange }) {
  const { busy, error, run } = useWrite()
  return (
    <li>
      <div className="plan-row">
        <span>
          <Link className="row-title" to={`/recipe/${recipe.id}`}>
            {recipe.title}
          </Link>
          <span className="row-note">
            {formatMinutes(recipe.content.totalMinutes)}, {formatCents(cookCostPerServingCents(recipe.content, shop.prices))} a
            serving
          </span>
        </span>
        <button
          className="link-button"
          type="button"
          aria-disabled={busy}
          aria-label={`Add ${recipe.title} to this week`}
          onClick={() => void run(() => focusAfter(`plan-row:${recipe.id}`, () => planRecipe(shop, recipe.id, onShopChange)))}
        >
          Add
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
      <button className="button button-quiet" type="button" aria-disabled={busy} onClick={share}>
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
  const title = useFocusTarget<HTMLAnchorElement>(`plan-row:${recipe.id}`)
  const shopped = shop.shopped.has(recipe.id)
  // Deleting a cook can take away a skill this recipe needs.
  const locked = recipeState(recipe, logs) === 'locked'
  return (
    <li>
      <div className="plan-row">
        <span>
          <Link className="row-title" to={`/recipe/${recipe.id}`} ref={title}>
            {recipe.title}
          </Link>
          {locked && <span className="row-note">Locked again: needs {skillList(missingTechniques(recipe, logs))}</span>}
          {shopped && <span className="row-note">Groceries bought</span>}
        </span>
        <button
          className="link-button"
          type="button"
          aria-disabled={busy}
          aria-label={`Take off: ${recipe.title}`}
          onClick={() => void run(() => focusAfter('plan-title', () => takeOffPlan(recipe.id, onShopChange)))}
        >
          Take off
        </button>
      </div>
      {shopped && (
        <button
          className="link-button"
          type="button"
          aria-disabled={busy}
          onClick={() =>
            void run(() => focusAfter(`plan-row:${recipe.id}`, () => shopForAgain(shop, recipe.id, onShopChange)))
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

/** A staple left off the list because the pantry has it, with how much this list uses, and a way to say it ran out. */
function InPantryRow({ id, qty, onShopChange }: { id: IngredientId; qty: number; onShopChange: ShopChange }) {
  const { busy, error, run } = useWrite()
  const { name, unit } = INGREDIENTS[id]
  return (
    <li>
      <div className="plan-row">
        <span>
          <span className="row-title">{name}</span>
          <span className="row-note">This list uses {formatAmount(qty, unit)}</span>
        </span>
        <button
          className="link-button"
          type="button"
          aria-disabled={busy}
          aria-label={`Put it on the list: ${inSentence(name)}`}
          onClick={() => void run(() => focusAfter(`check:${id}`, () => setInPantry(id, false, onShopChange)))}
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

function GroceryRow({
  line,
  shop,
  track,
  onShopChange,
  neighbor,
}: {
  line: GroceryLine
  shop: Shop
  /** Counts the write while it runs, so Done shopping can wait for it. */
  track: (write: () => Promise<void>) => Promise<void>
  onShopChange: ShopChange
  /** The focus target for when this line leaves the list. */
  neighbor: string
}) {
  const have = useWrite()
  const [editing, setEditing] = useState(false)
  const priceButton = useFocusTarget<HTMLButtonElement>(`price:${line.ingredientId}`)
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
        onClose={() => {
          // Back to the price that was tapped, not the top of the list.
          focusNext(`price:${line.ingredientId}`)
          setEditing(false)
        }}
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
      onChange={(next) => track(() => setChecked(line.ingredientId, next, onShopChange))}
      focusTarget={`check:${line.ingredientId}`}
      aside={
        <span className="line-actions">
          <button
            className="price-button"
            type="button"
            ref={priceButton}
            aria-label={`${formatCents(line.totalCents)}${corrected ? ' your price' : ''}: correct the price of ${inSentence(ingredient.name)}`}
            onClick={() => setEditing(true)}
          >
            {formatCents(line.totalCents)}
            {corrected && <span className="row-note">your price</span>}
          </button>
          {ingredient.staple && (
            // A staple the cook already has goes into the pantry, and off this list and the next.
            <button
              className="link-button"
              type="button"
              aria-disabled={have.busy}
              aria-label={`Have it: ${inSentence(ingredient.name)}`}
              onClick={() =>
                void have.run(() => focusAfter(neighbor, () => setInPantry(line.ingredientId, true, onShopChange)))
              }
            >
              Have it
            </button>
          )}
        </span>
      }
      error={have.error}
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
      await setPrice(id, parseCents(value), onShopChange)
      onClose()
    })
  }

  return (
    <li className="check">
      <form className="price-form" onSubmit={save}>
        <label className="field">
          {ingredient.name}
          <span className="row-note">What you paid for {ingredient.package.label}</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            // The price was just tapped to correct it: the cursor goes straight to it.
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
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
                await resetPrice(id, onShopChange)
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
