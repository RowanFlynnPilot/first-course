import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { LockedPage } from '../components/LockedNotice'
import { RatingPicker } from '../components/RatingPicker'
import { usePageTitle } from '../components/usePageTitle'
import type { Chef } from '../lib/chefs'
import { insertCookLog, newCookId } from '../lib/cookLogs'
import type { Prices } from '../lib/cost'
import { checkCookedOn, localDateString } from '../lib/format'
import { cookNotice, type CookNotice } from '../lib/notice'
import { cookable, whatTheRatingDecides, type CookLog, type Rating } from '../lib/progress'
import { clearTimers } from '../lib/timers'
import type { Recipe } from '../curriculum/types'

type LogProps = {
  chef: Chef
  logs: readonly CookLog[]
  prices: Prices
  onLogged: (log: CookLog, earned: CookNotice) => void
}

export function LogScreen(props: LogProps) {
  const { id } = useParams()
  if (id === undefined) throw new Error('Log route is missing its id')
  // Same gate as cook mode, checked before anything is written.
  const gate = cookable(id, props.logs)
  if (gate.content === null) return <LockedPage recipe={gate.recipe} logs={props.logs} />
  return <LogForm recipe={gate.recipe} {...props} />
}

function LogForm({ recipe, chef, logs, prices, onLogged }: LogProps & { recipe: Recipe }) {
  const navigate = useNavigate()
  usePageTitle(`Log a cook: ${recipe.title}`)
  const [rating, setRating] = useState<Rating | null>(null)
  const [notes, setNotes] = useState('')
  // Today where the cook is, unless they are logging one from another day. Read the clock once.
  const [today] = useState(() => localDateString(new Date()))
  const [cookedOn, setCookedOn] = useState(today)
  // One id for this cook, however many times Save is tapped.
  const [cookId] = useState(newCookId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(event: FormEvent) {
    event.preventDefault()
    if (rating === null) return
    setBusy(true)
    try {
      checkCookedOn(cookedOn, today)
      const log = await insertCookLog({ id: cookId, recipeId: recipe.id, cookedOn, rating, notes: notes.trim() })
      // The cook is over: its timers are done.
      clearTimers(sessionStorage, recipe.id)
      // A save retried after a lost answer can find this cook already in the log, brought in by a catch-up.
      const before = logs.filter((other) => other.id !== log.id)
      onLogged(log, cookNotice(recipe, before, log, chef.name, prices))
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
        <p className="section-note" id="rating-decides">
          {whatTheRatingDecides(recipe, logs)}
        </p>
        <RatingPicker value={rating} onChange={setRating} describedBy="rating-decides" />
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
        <button
          className="button"
          type="submit"
          disabled={busy || rating === null}
          aria-describedby={rating === null ? 'save-hint' : 'rating-decides'}
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
