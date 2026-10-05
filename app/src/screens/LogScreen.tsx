import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { RatingPicker } from '../components/RatingPicker'
import { usePageTitle } from '../components/usePageTitle'
import type { Chef } from '../lib/chefs'
import { insertCookLog } from '../lib/cookLogs'
import type { Prices } from '../lib/cost'
import { localDateString } from '../lib/format'
import { cookNotice, type CookNotice } from '../lib/notice'
import { cookable, type CookLog, type Rating } from '../lib/progress'
import { clearTimers } from '../lib/timers'

export function LogScreen({
  chef,
  logs,
  prices,
  onLogged,
}: {
  chef: Chef
  logs: readonly CookLog[]
  prices: Prices
  onLogged: (log: CookLog, earned: CookNotice) => void
}) {
  const { id } = useParams()
  if (id === undefined) throw new Error('Log route is missing its id')
  // Same gate as cook mode, checked before anything is written.
  const { recipe } = cookable(id, logs)
  const navigate = useNavigate()
  usePageTitle(`Log a cook: ${recipe.title}`)
  const [rating, setRating] = useState<Rating | null>(null)
  const [notes, setNotes] = useState('')
  // Today where the cook is, unless they are logging one from another day. Read the clock once.
  const [today] = useState(() => localDateString(new Date()))
  const [cookedOn, setCookedOn] = useState(today)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(event: FormEvent) {
    event.preventDefault()
    if (rating === null) return
    setBusy(true)
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(cookedOn)) throw new Error('Choose the date you cooked it.')
      const log = await insertCookLog({ recipeId: recipe.id, cookedOn, rating, notes: notes.trim() })
      // The cook is over: its timers are done.
      clearTimers(sessionStorage, recipe.id)
      onLogged(log, cookNotice(recipe, logs, log, chef.name, prices))
      // Replace, so Back from the menu cannot land on this form and log twice.
      navigate('/', { replace: true })
    } catch (cause) {
      setBusy(false)
      setError((cause as Error).message)
    }
  }

  return (
    <main className="page">
      <nav className="back">
        <Link to={`/recipe/${recipe.id}`}>{recipe.title}</Link>
      </nav>
      <h1 className="title">How did it go?</h1>
      <form className="form" onSubmit={save}>
        <RatingPicker value={rating} onChange={setRating} />
        <label className="field">
          Notes for next time
          <textarea
            rows={3}
            value={notes}
            placeholder="Pan was too hot. Use less lemon."
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <label className="field">
          Cooked on
          <input
            type="date"
            required
            max={today}
            value={cookedOn}
            onChange={(event) => setCookedOn(event.target.value)}
          />
        </label>
        {error !== null && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}
        <button className="button" type="submit" 
          disabled={busy || rating === null}
          aria-describedby={rating === null ? 'save-hint' : undefined}
        >
          Save this cook
        </button>
        {rating === null && (
          <p className="section-note" id="save-hint">
            Pick how it went first.
          </p>
        )}
      </form>
    </main>
  )
}
