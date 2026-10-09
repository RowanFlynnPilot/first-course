// The spice guide: what to buy, when the menu first needs it, and how to start
// using it on everyday food.

import { Link } from 'react-router'
import { usePageTitle } from '../components/usePageTitle'
import { INGREDIENTS } from '../curriculum/ingredients'
import { SPICE_HABITS, SPICES, SPICES_LATER } from '../curriculum/spices'
import { COURSE_NAMES } from '../lib/format'
import { spiceShelf } from '../lib/spices'
import { useKitchen } from '../kitchen'
import { MenuLink } from '../components/MenuLink'

export function SpicesScreen() {
  const { shop } = useKitchen()
  // Worked out here, not when the file loads: a throw then would blank the page before the error screen is up.
  const shelf = spiceShelf()
  const count = shelf.reduce((sum, course) => sum + course.spices.length, 0)
  usePageTitle('Spices')
  return (
    <main className="page">
      <MenuLink />
      <h1 className="title">Spices</h1>
      <p className="lede">
        These {count} spices and seasonings cover every recipe on the menu. Buy each one when the menu first needs it,
        and use it on everyday food too, so the jar runs out while it still smells of something.
      </p>

      <section className="section">
        <h2 className="section-title">How spices work</h2>
        <dl className="skills">
          {SPICE_HABITS.map(({ habit, why }) => (
            <div key={habit}>
              <dt>{habit}</dt>
              <dd>{why}</dd>
            </div>
          ))}
        </dl>
      </section>

      {shelf.map(({ tier, spices }) => {
        const have = spices.filter(({ id }) => shop.pantry.has(id)).length
        return (
          <section className="section" key={tier}>
            <h2 className="section-title">
              {tier === 1 ? 'To start' : `New for the ${COURSE_NAMES[tier].toLowerCase()}`}
            </h2>
            <p className="section-note">
              {have === spices.length ? 'All of them are in your pantry.' : `${have} of ${spices.length} in your pantry.`}
            </p>
            <ul className="spices">
              {spices.map(({ id, firstIn }) => {
                const guide = SPICES[id]
                return (
                  <li className="spice" key={id}>
                    <h3 className="spice-name">{INGREDIENTS[id].name}</h3>
                    <p className="row-note">
                      {shop.pantry.has(id) && 'In your pantry. '}
                      First used in <Link to={`/recipe/${firstIn.id}`}>{firstIn.title}</Link>.
                    </p>
                    <dl className="spice-facts">
                      <div>
                        <dt>Tastes</dt>
                        <dd>{guide.tastes}</dd>
                      </div>
                      <div>
                        <dt>Buy</dt>
                        <dd>{guide.buy}</dd>
                      </div>
                      <div>
                        <dt>Use it</dt>
                        <dd>{guide.use}</dd>
                      </div>
                      <div>
                        <dt>Try it on</dt>
                        <dd>
                          <ul className="spice-try">
                            {guide.tryOn.map((idea) => (
                              <li key={idea}>{idea}</li>
                            ))}
                          </ul>
                        </dd>
                      </div>
                    </dl>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}

      <section className="section">
        <h2 className="section-title">Worth adding later</h2>
        <p className="section-note">Not on the menu, but the next jars most cooks reach for.</p>
        <dl className="skills">
          {SPICES_LATER.map(({ name, why }) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{why}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  )
}
