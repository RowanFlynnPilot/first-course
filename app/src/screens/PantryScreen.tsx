// The pantry: staples the cook already has, which stay off the grocery list.
// Filed like the kit, under the first course that uses each one, so week one
// asks about salt and oil, not curry paste.

import { Link } from 'react-router'
import { CheckRow } from '../components/CheckRow'
import { usePageTitle } from '../components/usePageTitle'
import { INGREDIENTS } from '../curriculum/ingredients'
import { staplesByCourse } from '../lib/grocery'
import { setInPantry } from '../lib/shop'
import { useKitchen } from '../kitchen'
import { courseHeading } from '../lib/courses'
import { MenuLink } from '../components/MenuLink'

export function PantryScreen() {
  const { shop, onShopChange } = useKitchen()
  // Worked out here, not when the file loads: a throw then would blank the page before the error screen is up.
  const courses = staplesByCourse()
  usePageTitle('Your pantry')
  return (
    <main className="page">
      <MenuLink />
      <h1 className="title">Your pantry</h1>
      <p className="lede">
        Staples you have at home stay off the grocery list. “Done shopping” adds the ones you bought. When one runs
        out, uncheck it. New to spices? The <Link to="/spices">spice guide</Link> says what to buy and how to start
        using it.
      </p>
      {courses.map(({ tier, items: staples }) => (
        <section className="section" key={tier}>
          <h2 className="section-title">
            {courseHeading(tier)}
          </h2>
          <p className="section-note">
            {staples.filter((id) => shop.pantry.has(id)).length} of {staples.length} at home
          </p>
          <ul className="checks">
            {staples.map((id) => (
              <CheckRow
                key={id}
                checked={shop.pantry.has(id)}
                label={INGREDIENTS[id].name}
                note={INGREDIENTS[id].package.label}
                onChange={(have) => setInPantry(id, have, onShopChange)}
              />
            ))}
          </ul>
        </section>
      ))}
      <p className="next-step">
        <Link to="/shop">Next: plan this week</Link>
      </p>
    </main>
  )
}
