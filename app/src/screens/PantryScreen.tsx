// The pantry: staples the cook already has, which stay off the grocery list.
// Filed like the kit, under the first course that uses each one, so week one
// asks about salt and oil, not curry paste.

import { Link } from 'react-router'
import { BACK_TO_MENU } from '../components/menuScroll'
import { CheckRow } from '../components/CheckRow'
import { usePageTitle } from '../components/usePageTitle'
import { INGREDIENTS } from '../curriculum/ingredients'
import { COURSE_NAMES } from '../lib/format'
import { staplesByCourse } from '../lib/grocery'
import { setInPantry, type Shop, type ShopChange } from '../lib/shop'

const COURSES = staplesByCourse()

export function PantryScreen({ shop, onShopChange }: { shop: Shop; onShopChange: ShopChange }) {
  usePageTitle('Your pantry')
  return (
    <main className="page">
      <nav className="back">
        <Link to="/" state={BACK_TO_MENU}>
          Menu
        </Link>
      </nav>
      <h1 className="title">Your pantry</h1>
      <p className="lede">
        Staples you have at home stay off the grocery list. “Done shopping” adds the ones you bought. When one runs
        out, uncheck it. New to spices? The <Link to="/spices">spice guide</Link> says what to buy and how to start
        using it.
      </p>
      {COURSES.map(({ tier, staples }) => (
        <section className="section" key={tier}>
          <h2 className="section-title">
            {tier === 1 ? 'To start' : tier === 5 ? 'For the usual' : `New for the ${COURSE_NAMES[tier].toLowerCase()}`}
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
