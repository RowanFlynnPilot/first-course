// The way back to the menu at the top of a screen. The installed app has no
// Back button, so every screen keeps this one, a full-size tap target, and
// the menu opens where it was scrolled (menuScroll.ts).

import { Link } from 'react-router'
import { BACK_TO_MENU } from './menuScroll'

export function MenuLink() {
  return (
    <nav className="back">
      <Link to="/" state={BACK_TO_MENU}>
        Menu
      </Link>
    </nav>
  )
}
