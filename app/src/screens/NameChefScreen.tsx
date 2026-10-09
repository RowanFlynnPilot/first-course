import { ChefEditor } from '../components/ChefEditor'
import { usePageTitle } from '../components/usePageTitle'
import { createChef, DEFAULT_LOOK, type Chef } from '../lib/chefs'

export function NameChefScreen({ onCreated }: { onCreated: (chef: Chef) => void }) {
  usePageTitle('Create your chef')
  return (
    <main className="page auth">
      <h1 className="title">Create your chef</h1>
      <p className="lede">
        Everyone starts at the sink. Each time you cook, your chef earns XP and moves up the kitchen, from dishwasher to
        executive chef.
      </p>
      <ChefEditor
        initial={{ name: '', ...DEFAULT_LOOK, extras: [] }}
        rank={0}
        unlocked={null}
        submitLabel="Create chef"
        onSubmit={async (chef) => onCreated(await createChef(chef))}
      />
    </main>
  )
}
