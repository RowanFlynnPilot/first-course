// The kit: equipment the cook owns, filed under the first course that needs it.

import { Link } from 'react-router'
import { CheckRow } from '../components/CheckRow'
import { focusAfter, useFocusTarget } from '../components/useFocusTarget'
import { useWrite } from '../components/useWrite'
import { ErrorNotice, Saving } from '../components/WriteStatus'
import { usePageTitle } from '../components/usePageTitle'
import { EQUIPMENT, type EquipmentId } from '../curriculum/equipment'
import type { Tier } from '../curriculum/types'
import { hasKit, kitByCourse } from '../lib/kit'
import { addAllToKit, setInKit, type Shop, type ShopChange } from '../lib/shop'
import { useKitchen } from '../kitchen'
import { courseHeading } from '../lib/courses'
import { MenuLink } from '../components/MenuLink'

export function KitScreen() {
  const { shop, onShopChange } = useKitchen()
  // Worked out here, not when the file loads: a throw then would blank the page before the error screen is up.
  const courses = kitByCourse()
  usePageTitle('Your kit')
  return (
    <main className="page">
      <MenuLink />
      <h1 className="title">Your kit</h1>
      <p className="lede">
        Check off what you already own. Each course lists what it adds, so you can buy it before you need it, not halfway
        through a recipe.
      </p>
      {courses.map(({ tier, items }) => {
        const missing = items.filter((id) => !hasKit(id, shop.kit))
        return (
          <section className="section" key={tier}>
            <h2 className="section-title">
              {courseHeading(tier)}
            </h2>
            <HaveCount tier={tier} have={items.length - missing.length} of={items.length} />
            {missing.length > 0 && <HaveAll tier={tier} items={items} shop={shop} onShopChange={onShopChange} />}
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
                    onChange={(own) => setInKit(id, own, onShopChange)}
                    focusTarget={`kit-item:${id}`}
                  />
                )
              })}
            </ul>
          </section>
        )
      })}
      <p className="next-step">
        <Link to="/pantry">Next: your pantry</Link>
      </p>
    </main>
  )
}

/** "You have 3 of 9." It takes focus when "I have all of these" goes, so a keyboard user keeps their place. */
function HaveCount({ tier, have, of }: { tier: Tier; have: number; of: number }) {
  const ref = useFocusTarget<HTMLParagraphElement>(`kit-course:${tier}`)
  return (
    <p className="section-note" ref={ref} tabIndex={-1}>
      {have === of ? 'You have all of it.' : `You have ${have} of ${of}.`}
    </p>
  )
}

/** One tap for a cook who already owns everything a course adds, instead of one per item. */
function HaveAll({
  tier,
  items,
  shop,
  onShopChange,
}: {
  tier: Tier
  items: readonly EquipmentId[]
  shop: Shop
  onShopChange: ShopChange
}) {
  const { busy, error, run } = useWrite()
  const unchecked = items.filter((id) => !shop.kit.has(id))
  return (
    <div className="actions">
      <button
        className="button button-quiet"
        type="button"
        aria-disabled={busy}
        onClick={() => void run(() => focusAfter(`kit-course:${tier}`, () => addAllToKit(unchecked, onShopChange)))}
      >
        I have all of these
      </button>
      <Saving busy={busy} />
      <ErrorNotice error={error} />
    </div>
  )
}
