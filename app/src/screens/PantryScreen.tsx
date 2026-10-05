// The pantry: staples the cook already has, which stay off the grocery list.

import { Link } from 'react-router'
import { CheckRow } from '../components/CheckRow'
import { usePageTitle } from '../components/usePageTitle'
import { INGREDIENTS, type IngredientId } from '../curriculum/ingredients'
import { SECTIONS } from '../lib/grocery'
import { clearFromPantry, stockPantry, type Shop, type ShopChange } from '../lib/shop'

const STAPLES = (Object.keys(INGREDIENTS) as IngredientId[]).filter((id) => INGREDIENTS[id].staple)

export function PantryScreen({ shop, onShopChange }: { shop: Shop; onShopChange: ShopChange }) {
  usePageTitle('Your pantry')
  return (
    <main className="page">
      <nav className="back">
        <Link to="/">Menu</Link>
      </nav>
      <h1 className="title">Your pantry</h1>
      <p className="lede">
        Staples you have at home stay off the grocery list. “Done shopping” adds the ones you bought. When one runs
        out, untick it. New to spices? The <Link to="/spices">spice guide</Link> says what to buy and how to start
        using it.
      </p>
      {SECTIONS.map((section) => {
        const staples = STAPLES.filter((id) => INGREDIENTS[id].section === section.id).sort((a, b) =>
          INGREDIENTS[a].name.localeCompare(INGREDIENTS[b].name),
        )
        if (staples.length === 0) return null
        return (
          <section className="section" key={section.id}>
            <h2 className="section-title">{section.name}</h2>
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
                  onChange={async (have) => {
                    await (have ? stockPantry(id) : clearFromPantry(id))
                    onShopChange((previous) => {
                      const pantry = new Set(previous.pantry)
                      if (have) pantry.add(id)
                      else pantry.delete(id)
                      return { ...previous, pantry }
                    })
                  }}
                />
              ))}
            </ul>
          </section>
        )
      })}
    </main>
  )
}
