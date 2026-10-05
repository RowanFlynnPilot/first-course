// The kit: equipment the cook owns, filed under the first course that needs it.

import { Link } from 'react-router'
import { CheckRow } from '../components/CheckRow'
import { useWrite } from '../components/useWrite'
import { usePageTitle } from '../components/usePageTitle'
import { EQUIPMENT, type EquipmentId } from '../curriculum/equipment'
import { COURSE_NAMES } from '../lib/format'
import { hasKit, kitByCourse } from '../lib/kit'
import { addAllToKit, addToKit, removeFromKit, type Shop, type ShopChange } from '../lib/shop'

const COURSES = kitByCourse()

export function KitScreen({ shop, onShopChange }: { shop: Shop; onShopChange: ShopChange }) {
  usePageTitle('Your kit')
  return (
    <main className="page">
      <nav className="back">
        <Link to="/">Menu</Link>
      </nav>
      <h1 className="title">Your kit</h1>
      <p className="lede">
        Tick what you already own. Each course lists what it adds, so you can buy it before the shop, not halfway
        through a recipe.
      </p>
      {COURSES.map(({ tier, items }) => {
        const missing = items.filter((id) => !hasKit(id, shop.kit))
        return (
          <section className="section" key={tier}>
            <h2 className="section-title">
              {tier === 1 ? 'To start' : `New for the ${COURSE_NAMES[tier].toLowerCase()}`}
            </h2>
            <p className="section-note">
              {missing.length === 0 ? 'You have all of it.' : `You have ${items.length - missing.length} of ${items.length}.`}
            </p>
            {missing.length > 0 && <HaveAll items={items} shop={shop} onShopChange={onShopChange} />}
            <ul className="checks">
              {items.map((id) => {
                const item = EQUIPMENT[id]
                const covered = !shop.kit.has(id) && hasKit(id, shop.kit)
                return (
                  <CheckRow
                    key={id}
                    checked={shop.kit.has(id)}
                    label={item.name}
                    note={covered ? 'Something else in your kit does this job.' : (item.note ?? undefined)}
                    onChange={async (own) => {
                      await (own ? addToKit(id) : removeFromKit(id))
                      onShopChange((previous) => {
                        const kit = new Set(previous.kit)
                        if (own) kit.add(id)
                        else kit.delete(id)
                        return { ...previous, kit }
                      })
                    }}
                  />
                )
              })}
            </ul>
          </section>
        )
      })}
    </main>
  )
}

/** One tap for a cook who already owns everything a course adds, instead of one per item. */
function HaveAll({ items, shop, onShopChange }: { items: readonly EquipmentId[]; shop: Shop; onShopChange: ShopChange }) {
  const { busy, error, run } = useWrite()
  const unticked = items.filter((id) => !shop.kit.has(id))
  return (
    <div className="actions">
      <button
        className="button button-quiet"
        type="button"
        disabled={busy}
        onClick={() =>
          void run(async () => {
            await addAllToKit(unticked)
            onShopChange((previous) => ({ ...previous, kit: new Set([...previous.kit, ...unticked]) }))
          })
        }
      >
        I have all of these
      </button>
      {error !== null && (
        <p className="notice notice-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
