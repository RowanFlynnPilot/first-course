// This week: the plan, the grocery list it makes, and checking it off in the
// store. The list is the checkout cost, in whole packages (locked decision 6).

import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { CheckRow } from '../components/CheckRow'
import { focusAfter, focusNext, useFocusTarget } from '../components/useFocusTarget'
import { usePageTitle } from '../components/usePageTitle'
import { useWrite } from '../components/useWrite'
import { ErrorNotice, Saving } from '../components/WriteStatus'
import { EQUIPMENT, type EquipmentId } from '../curriculum/equipment'
import { INGREDIENTS, type IngredientId } from '../curriculum/ingredients'
import { recipeById } from '../curriculum/recipes'
import type { Recipe } from '../curriculum/types'
import { cookCostPerServingCents } from '../lib/cost'
import { boughtNote, cookBy, dayName } from '../lib/freshness'
import { formatAmount, formatCents, formatMinutes, inSentence, listOf, packagesOf, parseCents, plural } from '../lib/format'
import { groceryList, groceryText, type GroceryLine } from '../lib/grocery'
import { missingKit } from '../lib/kit'
import { pathTo, readyToPlan, recipeState, type CookLog } from '../lib/progress'
import {
  coveredRecipes,
  doneShopping,
  groceryState,
  markFrozen,
  planRecipe,
  resetPrice,
  setChecked,
  setInPantry,
  setKitChecked,
  setPrice,
  shopForAgain,
  stillHave,
  takeOffPlan,
  toShopFor,
  type Shop,
  type ShopChange,
} from '../lib/shop'
import { useToday } from '../components/useNow'
import { useKitchen } from '../kitchen'
import { MenuLink } from '../components/MenuLink'

export function ShopScreen() {
  const { shop, logs, onShopChange } = useKitchen()
  usePageTitle('This week')
  // Where the cook is standing, kept current: a recipe cooked in the last week is offered last, and Done
  // shopping dates the groceries.
  const today = useToday()
  const planned = shop.plan.map(recipeById)
  // Only what is not yet bought goes on the list.
  const toShop = toShopFor(shop)
  const list = groceryList(toShop, shop.pantry, shop.prices)
  const needKit = missingKit(planned, shop.kit)
  // Until anything is checked off in the kit, it would list the chef's knife and every pan: one pointer instead.
  const kitKnown = shop.kit.size > 0
  const kitToGet = kitKnown ? needKit : []
  const kitNotInCart = kitToGet.filter((id) => !shop.kitChecks.has(id))
  const notInCart = list.lines.filter((line) => !shop.checks.has(line.ingredientId))
  // The kit aisle is part of the cart: checked off here, it goes into the kit at Done shopping.
  const things = list.lines.length + kitToGet.length
  const toBuy = notInCart.length + kitNotInCart.length
  const finish = useWrite()
  // What Done shopping did, and whether it bought anything to cook.
  const [finished, setFinished] = useState<{ text: string; bought: boolean } | null>(null)

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

  /** What was left unchecked, said before Done shopping goes ahead: groceries keep their recipes on the list, kit does not. */
  function leftUnchecked(): string | null {
    if (toBuy === 0) return null
    const covered = coveredRecipes(shop)
    const staying = toShop.filter((id) => !covered.includes(id))
    const groceries = notInCart.map((line) => inSentence(INGREDIENTS[line.ingredientId].name))
    const kit = listOf(kitNotInCart.map((id) => inSentence(EQUIPMENT[id].name)))
    const parts = [
      ...(groceries.length === 0
        ? []
        : [
            `Not checked off: ${listOf(groceries)}.`,
            ...(staying.length === 0 ? [] : [staysOnTheList(staying, toShop, groceries.length === 1 ? 'it' : 'them')]),
          ]),
      ...(kitNotInCart.length === 0
        ? []
        : [groceries.length === 0 ? `Kit not checked off: ${kit}. It stays on the list.` : `The kit not checked off stays on the list too: ${kit}.`]),
    ]
    return `${parts.join(' ')} Finish shopping?`
  }

  async function finishShopping() {
    if (finish.busy) return
    // A recipe with a line left unchecked stays on the list: the store was out, or it is still to buy.
    const question = shopping ? leftUnchecked() : null
    if (question !== null && !window.confirm(question)) return
    await finish.run(() =>
      focusAfter('shop-done', async () => {
        const { staples, kit, bought, stillToShop } = await doneShopping(shop, today, onShopChange)
        const pantry = staples.length === 0 ? '' : ` Into your pantry: ${listOf(staples.map((id) => inSentence(INGREDIENTS[id].name)))}.`
        const tools = kit.length === 0 ? '' : ` Into your kit: ${listOf(kit.map((id) => inSentence(EQUIPMENT[id].name)))}.`
        const still = stillToShop.length === 0 ? '' : ` ${staysOnTheList(stillToShop, toShop, 'what you did not check off')}`
        // Raw meat keeps a couple of days: when to cook each, or the way to buy time.
        const meat = bought.flatMap((id) => {
          const by = cookBy(recipeById(id), today)
          return by === null
            ? []
            : [` ${recipeById(id).title}: cook it by ${dayName(by, today)}, or freeze the meat tonight and thaw it in the fridge the night before you cook.`]
        })
        setFinished({
          text: `Done shopping.${pantry}${tools}${still}${meat.join('')}${pantry === '' && tools === '' && still === '' && meat.length === 0 ? ' The list is cleared.' : ''}`,
          bought: bought.length > 0,
        })
      }),
    )
  }

  // In the store, the list comes first; at home, the plan.
  const shopping = toShop.length > 0
  // Checked off in the store but never put away (Done shopping failed, or a recipe was cooked first):
  // with nothing left to buy, the plan offers Done shopping for them.
  const waiting = shopping ? [] : [...shop.checks, ...shop.kitChecks]
  const ready = readyToPlan(logs, shop.plan, today).slice(0, SUGGESTIONS)

  const listSection = (
    <section className="section">
      <h2 className="section-title" ref={groceryTitle} tabIndex={-1}>
        Grocery list
      </h2>
      <p className="section-note">
        {things - toBuy} of {plural(things, 'thing', 'things')} in the cart.
      </p>
      {toBuy > 0 && <ShareButton text={groceryText(toShop, list, shop.checks, kitNotInCart)} />}
      {list.sections.map((section) => (
        <div className="aisle" key={section.id}>
          <h3 className="aisle-title">{section.name}</h3>
          <ul className="checks checks-cart">
            {section.lines.map((line) => (
              <GroceryRow
                key={line.ingredientId}
                line={line}
                shop={shop}
                onShopChange={onShopChange}
                neighbor={neighborOf(line.ingredientId)}
              />
            ))}
          </ul>
        </div>
      ))}
      {needKit.length > 0 && (
        <div className="aisle">
          <h3 className="aisle-title">Kit</h3>
          {kitKnown ? (
            <>
              <p className="section-note">
                This week’s recipes use these, and <Link to="/kit">your kit</Link> does not have them yet. Check one off
                when it is in the cart, or if you already have it: Done shopping puts it in your kit.
              </p>
              <ul className="checks checks-cart">
                {kitToGet.map((id) => (
                  <KitRow key={id} id={id} checked={shop.kitChecks.has(id)} onShopChange={onShopChange} />
                ))}
              </ul>
            </>
          ) : (
            <p className="section-note">
              Check off <Link to="/kit">your kit</Link> first, and this list will say which tools you still need.
            </p>
          )}
        </div>
      )}
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
      <dl className="tab">
        <div className="tab-kept">
          <dt>
            Checkout total
            <span className="row-note">
              What the groceries cost at the register, in whole packages; the kit is not priced. Tap a price to
              correct it. A first shop costs far more than the per-serving prices: the oil, spices, and sauces you buy
              now last for many cooks.
            </span>
          </dt>
          <dd>{formatCents(list.totalCents)}</dd>
        </div>
      </dl>
      {toBuy === 0 && (
        <p className="notice notice-info">
          Everything is in the cart. Tap “Done shopping” to put the staples and kit away and mark the plan bought.
        </p>
      )}
      <ErrorNotice error={finish.error} />
      <div className="actions">
        <button className="button" type="button" aria-disabled={finish.busy} onClick={() => void finishShopping()}>
          Done shopping
        </button>
        <Saving busy={finish.busy} />
      </div>
      <p className="section-note">
        Marks the recipes you have everything for as bought, and puts the staples and kit you checked off into your
        pantry and kit. The plan stays until you cook. Your checks are kept on this phone, so checking off works with
        no signal while the app is open. If your phone closes the app, the list needs signal to come back: share it
        to Notes before a store with no signal.
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
              <PlanRow key={recipe.id} recipe={recipe} shop={shop} logs={logs} today={today} onShopChange={onShopChange} />
            ))}
          </ul>
        </>
      )}
      {!shopping && planned.length > 0 && (
        <p className="section-note">Everything on the plan is bought. Add a recipe and its groceries go on a new list.</p>
      )}
      {waiting.length > 0 && (
        <>
          <p className="notice notice-info">
            Checked off in the store, and not put away yet:{' '}
            {listOf(
              [...shop.checks]
                .map((id) => inSentence(INGREDIENTS[id].name))
                .concat([...shop.kitChecks].map((id) => inSentence(EQUIPMENT[id].name))),
            )}
            . Done shopping puts them in your{' '}
            {shop.checks.size === 0 ? 'kit' : shop.kitChecks.size === 0 ? 'pantry' : 'pantry and kit'}.
          </p>
          <ErrorNotice error={finish.error} />
          <div className="actions">
            <button className="button" type="button" aria-disabled={finish.busy} onClick={() => void finishShopping()}>
              Done shopping
            </button>
            <Saving busy={finish.busy} />
          </div>
        </>
      )}
      {/* With a grocery list on screen, the kit to get is on it; with everything bought, it is said here. */}
      {!shopping && needKit.length > 0 && (
        <p className="notice notice-info">
          To cook these you also need: {listOf(needKit.map((id) => inSentence(EQUIPMENT[id].name)))}.{' '}
          <Link to="/kit">Your kit</Link>
        </p>
      )}
    </section>
  )

  return (
    <main className="page">
      <MenuLink />
      <h1 className="title">This week</h1>
      {/* Not role=status: focus moves here, which reads it, and a status would read it twice. */}
      {finished !== null && (
        <p className="notice notice-info" ref={finishedRef} tabIndex={-1}>
          {finished.text}
          {finished.bought && (
            <>
              {' '}
              <Link to="/">Go to the menu to cook</Link>
            </>
          )}
        </p>
      )}
      {shopping ? listSection : planSection}
      {shopping && planSection}
      {ready.length > 0 && (
        <section className="section">
          <h2 className="section-title">More for this week</h2>
          <p className="section-note">
            Recipes open to you now, in the order the menu suggests them, then ones this week’s cooks will open.
          </p>
          <ul className="rows">
            {ready.map((recipe) => (
              <ReadyRow key={recipe.id} recipe={recipe} logs={logs} shop={shop} onShopChange={onShopChange} />
            ))}
          </ul>
        </section>
      )}
    </main>
  )
}

/** How many unplanned recipes This week offers to add. */
const SUGGESTIONS = 4

/**
 * Which recipes stay on the list, and for what. Titles are not joined with
 * "and": a title can hold one ("Sheet-pan sausage and vegetables"), and two
 * dishes would read as three.
 */
function staysOnTheList(staying: readonly string[], listed: readonly string[], forWhat: string): string {
  const [only] = staying
  if (staying.length === 1 && only !== undefined) return `${recipeById(only).title} stays on the list for ${forWhat}.`
  if (staying.length === listed.length) return `Every recipe stays on the list for ${forWhat}.`
  return `${staying.length} recipes stay on the list for ${forWhat}: ${staying.map((id) => recipeById(id).title).join('; ')}.`
}

/** A locked recipe on, or going on, the plan: the cooks that open it, in the order to cook them. */
function OpensAfter({ recipe, logs }: { recipe: Recipe; logs: readonly CookLog[] }) {
  return (
    <span className="row-note">
      Opens after you cook {pathTo(recipe, logs).map((step) => step.title).join(', then ')}
    </span>
  )
}

/** A recipe that could go on the plan, with what it takes, and one tap to add it. */
function ReadyRow({
  recipe,
  logs,
  shop,
  onShopChange,
}: {
  recipe: Recipe
  logs: readonly CookLog[]
  shop: Shop
  onShopChange: ShopChange
}) {
  const { busy, error, run } = useWrite()
  return (
    <li>
      <div className="plan-row">
        <span>
          <Link className="row-title" to={`/recipe/${recipe.id}`}>
            {recipe.title}
          </Link>
          {recipeState(recipe, logs) === 'locked' && <OpensAfter recipe={recipe} logs={logs} />}
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
          onClick={() => void run(() => focusAfter(`plan-row:${recipe.id}`, () => planRecipe(recipe.id, onShopChange)))}
        >
          Add
        </button>
        <Saving busy={busy} />
      </div>
      <ErrorNotice error={error} />
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
      <ErrorNotice error={error} />
    </div>
  )
}

function PlanRow({
  recipe,
  shop,
  logs,
  today,
  onShopChange,
}: {
  recipe: Recipe
  shop: Shop
  logs: readonly CookLog[]
  today: string
  onShopChange: ShopChange
}) {
  const { busy, error, run } = useWrite()
  const title = useFocusTarget<HTMLAnchorElement>(`plan-row:${recipe.id}`)
  const shopped = shop.shopped.has(recipe.id)
  // Meat past its day, or groceries old enough to ask about (lib/freshness.ts).
  const groceries = groceryState(recipe, shop, today)
  // Planned ahead of the cooks that open it, or locked again by a deleted cook.
  const locked = recipeState(recipe, logs) === 'locked'
  return (
    <li>
      <div className="plan-row">
        <span>
          <Link className="row-title" to={`/recipe/${recipe.id}`} ref={title}>
            {recipe.title}
          </Link>
          {locked && <OpensAfter recipe={recipe} logs={logs} />}
          {shopped && <span className="row-note">{boughtNote(recipe, shop.shoppedOn.get(recipe.id), today)}</span>}
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
        <Saving busy={busy} />
      </div>
      {shopped && (
        <div className="plan-actions">
          <button
            className="link-button"
            type="button"
            aria-disabled={busy}
            onClick={() => void run(() => focusAfter(`plan-row:${recipe.id}`, () => shopForAgain(recipe.id, onShopChange)))}
          >
            Put it back on the list
          </button>
          {groceries === 'past' && (
            <button
              className="link-button"
              type="button"
              aria-disabled={busy}
              aria-label={`I froze it: ${recipe.title}`}
              onClick={() => void run(() => focusAfter(`plan-row:${recipe.id}`, () => markFrozen(recipe.id, onShopChange)))}
            >
              I froze it
            </button>
          )}
          {groceries === 'old' && (
            <button
              className="link-button"
              type="button"
              aria-disabled={busy}
              aria-label={`Still have them: ${recipe.title}`}
              onClick={() => void run(() => focusAfter(`plan-row:${recipe.id}`, () => stillHave(recipe.id, today, onShopChange)))}
            >
              Still have them
            </button>
          )}
        </div>
      )}
      <ErrorNotice error={error} />
    </li>
  )
}

/**
 * A tool the plan needs and the kit does not have. Checked off, it is in the
 * cart, kept on this phone like the groceries; Done shopping puts it in the kit.
 */
function KitRow({ id, checked, onShopChange }: { id: EquipmentId; checked: boolean; onShopChange: ShopChange }) {
  const { name, note } = EQUIPMENT[id]
  return (
    <CheckRow
      checked={checked}
      label={name}
      note={note ?? undefined}
      // On the phone (lib/cart.ts): it never waits on signal.
      onPhone
      onChange={async (next) => setKitChecked(id, next, onShopChange)}
      focusTarget={`kit:${id}`}
    />
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
        <Saving busy={busy} />
      </div>
      <ErrorNotice error={error} />
    </li>
  )
}

function GroceryRow({
  line,
  shop,
  onShopChange,
  neighbor,
}: {
  line: GroceryLine
  shop: Shop
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
      // A check is kept on the phone (lib/cart.ts): it never waits on signal.
      onPhone
      onChange={async (next) => setChecked(line.ingredientId, next, onShopChange)}
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

/** "1 red onion" as it is, and "one 4 oz tub" for a package that does not start with its count. */
function paidFor(label: string): string {
  return label.startsWith('1 ') ? label : `one ${label}`
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
          <span className="row-note">What you paid for {paidFor(ingredient.package.label)}</span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            // The price was just tapped to correct it: the cursor goes straight to it.
            autoFocus
            value={value}
            aria-invalid={error !== null}
            aria-describedby={error === null ? undefined : `price-error-${id}`}
            onChange={(event) => setValue(event.target.value)}
          />
        </label>
        <ErrorNotice error={error} id={`price-error-${id}`} />
        <div className="actions">
          <button className="button" type="submit" aria-disabled={busy}>
            Save price
          </button>
          <button className="button button-quiet" type="button" aria-disabled={busy} onClick={() => busy || onClose()}>
            Cancel
          </button>
          <Saving busy={busy} />
        </div>
        {corrected && (
          <button
            className="link-button"
            type="button"
            aria-disabled={busy}
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
