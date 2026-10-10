// A recipe's equipment, with what the cook does not own yet marked.

import { Link } from 'react-router'
import { EQUIPMENT, type EquipmentId } from '../curriculum/equipment'
import { hasKit } from '../lib/kit'

export function EquipmentList({ items, kit }: { items: readonly EquipmentId[]; kit: ReadonlySet<EquipmentId> }) {
  const missing = items.filter((id) => !hasKit(id, kit))
  // Until the cook checks off any kit at all, a marker on every tool says nothing they do not know.
  const started = kit.size > 0
  return (
    <>
      <ul className="plain-list">
        {items.map((id) => (
          <li key={id}>
            {EQUIPMENT[id].name}
            {started && !hasKit(id, kit) && <span className="row-note">Not in your kit yet</span>}
          </li>
        ))}
      </ul>
      {!started ? (
        <p className="section-note">
          Check off what you own in <Link to="/kit">your kit</Link>, and lists like this one will mark what you still need.
        </p>
      ) : (
        missing.length > 0 && (
          <p className="section-note">
            <Link to="/kit">Your kit</Link>: mark what you own, and see what to look for in the rest.
          </p>
        )
      )}
    </>
  )
}
