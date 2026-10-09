import { Link, useNavigate } from 'react-router'
import { ChefEditor } from '../components/ChefEditor'
import { usePageTitle } from '../components/usePageTitle'
import { updateChef } from '../lib/chefs'
import { unlockedExtras } from '../lib/extras'
import { levelForXp, rankIndexForLevel, totalXp } from '../lib/leveling'
import { useKitchen } from '../kitchen'

export function EditChefScreen() {
  const { userId, chef, logs, onChefSaved } = useKitchen()
  const navigate = useNavigate()
  usePageTitle('Change your chef')
  return (
    <main className="page">
      <nav className="back">
        <Link to="/chef">{chef.name}</Link>
      </nav>
      <h1 className="title">Change your chef</h1>
      <ChefEditor
        initial={chef}
        rank={rankIndexForLevel(levelForXp(totalXp(logs)))}
        unlocked={new Set(unlockedExtras(logs))}
        submitLabel="Save chef"
        onSubmit={async (next) => {
          onChefSaved(await updateChef(userId, next))
          navigate('/chef', { replace: true })
        }}
      />
    </main>
  )
}
