import { ChefEditor } from '../components/ChefEditor'
import { createChef, type Chef } from '../lib/chefs'

export function NameChefScreen({ onCreated }: { onCreated: (chef: Chef) => void }) {
  return (
    <main className="page auth">
      <h1 className="title">Create your chef</h1>
      <p className="lede">
        Everyone starts at the sink. Every cook earns XP, and XP moves your chef up the kitchen, from dishwasher to
        executive chef.
      </p>
      <ChefEditor
        initial={{ name: '', skin: 1, hair: 1 }}
        rank={0}
        submitLabel="Create chef"
        onSubmit={async (chef) => onCreated(await createChef(chef))}
      />
    </main>
  )
}
