// A recipe's equipment, with what the cook does not own yet marked.

import { Link } from 'react-router'
import { EQUIPMENT, type EquipmentId } from '../curriculum/equipment'
import { hasKit } from '../lib/kit'

export function EquipmentList({ items, kit }: { items: readonly EquipmentId[]; kit: ReadonlySet<EquipmentId> }) {
  const missing = items.filter((id) => !hasKit(id, kit))
  return (
    <>
      <ul className="plain-list">
        {items.map((id) => (
          <li key={id}>
            {EQUIPMENT[id].name}
            {!hasKit(id, kit) && <span className="row-note">Not in your kit yet</span>}
          </li>
        ))}
      </ul>
      {missing.length > 0 && (
        <p className="section-note">
          <Link to="/kit">Your kit</Link>: mark what you own, and see what to look for in the rest.
        </p>
      )}
    </>
  )
}
