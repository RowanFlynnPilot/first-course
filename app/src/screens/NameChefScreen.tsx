import { useEffect, useRef } from 'react'
import { ChefEditor } from '../components/ChefEditor'
import { focusNext } from '../components/useFocusTarget'
import { usePageTitle } from '../components/usePageTitle'
import { createChef, DEFAULT_LOOK, type Chef } from '../lib/chefs'

export function NameChefScreen({ onCreated }: { onCreated: (chef: Chef) => void }) {
  usePageTitle('Create your chef')
  // Drawn before the router, so nothing else opens it at the top with focus on its heading: a new
  // account lands here straight from the sign-up form or an email link.
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    window.scrollTo(0, 0)
    heading.current?.focus({ preventScroll: true })
  }, [])
  return (
    <main className="page auth">
      <h1 className="title" ref={heading} tabIndex={-1}>
        Create your chef
      </h1>
      <p className="lede">
        Everyone starts at the sink. Each time you cook, your chef earns XP and moves up the kitchen, from dishwasher to
        executive chef.
      </p>
      <ChefEditor
        initial={{ name: '', ...DEFAULT_LOOK, extras: [] }}
        rank={0}
        unlocked={null}
        submitLabel="Create chef"
        onSubmit={async (chef) => {
          const created = await createChef(chef)
          // The menu opens in place of this form: at its top, with focus on its name, not where Create chef was.
          window.scrollTo(0, 0)
          focusNext('menu-title')
          onCreated(created)
        }}
      />
    </main>
  )
}
