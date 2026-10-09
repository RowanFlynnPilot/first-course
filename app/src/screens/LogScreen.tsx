import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { LockedPage } from '../components/LockedNotice'
import { RatingPicker } from '../components/RatingPicker'
import { usePageTitle } from '../components/usePageTitle'
import { useWrite } from '../components/useWrite'
import { ErrorNotice, Saving } from '../components/WriteStatus'
import type { Chef } from '../lib/chefs'
import { clearCooking, loadCooking } from '../lib/cooking'
import { insertCookLog, newCookId, NOTES_MAX } from '../lib/cookLogs'
import type { Prices } from '../lib/cost'
import { checkCookedOn, EARLIEST_COOK, localDateString } from '../lib/format'
import { cookNotice, type CookNotice } from '../lib/notice'
import { cookable, whatTheRatingDecides, type CookLog, type Rating } from '../lib/progress'
import { clearTimers } from '../lib/timers'
import type { Recipe } from '../curriculum/types'

type LogProps = {
  userId: string
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

function LogForm({ recipe, userId, chef, logs, prices, onLogged }: LogProps & { recipe: Recipe }) {
  const navigate = useNavigate()
  usePageTitle(`Log a cook: ${recipe.title}`)
  const [rating, setRating] = useState<Rating | null>(null)
  const [notes, setNotes] = useState('')
  // Today where the cook is, unless they are logging one from another day. Read the clock once.
  const [today] = useState(() => localDateString(new Date()))
  const [cookedOn, setCookedOn] = useState(today)
  // One id for this cook, however many times Save is tapped.
  const [cookId] = useState(newCookId)
  const { busy, error, run } = useWrite()
  // A date the form will not take is said beside the field, which it is tied to.
  const [dateError, setDateError] = useState<string | null>(null)

  function save(event: FormEvent) {
    event.preventDefault()
    // Save stays focusable before a rating is picked (a disabled button drops focus), so a tap moves to the choices.
    if (rating === null) {
      document.querySelector<HTMLInputElement>('input[name="rating"]')?.focus()
      return
    }
    try {
      checkCookedOn(cookedOn, today)
      setDateError(null)
    } catch (cause) {
      setDateError((cause as Error).message)
      document.querySelector<HTMLInputElement>('input[type="date"]')?.focus()
      return
    }
    void run(async () => {
      const log = await insertCookLog({ id: cookId, recipeId: recipe.id, cookedOn, rating, notes: notes.trim() })
      // The cook is over: its timers are done, and the menu stops asking how it went.
      clearTimers(localStorage, recipe.id)
      if (loadCooking(localStorage, userId, Date.now())?.recipeId === recipe.id) clearCooking(localStorage, userId)
      // A save retried after a lost answer can find this cook already in the log, brought in by a catch-up.
      const before = logs.filter((other) => other.id !== log.id)
      onLogged(log, cookNotice(recipe, before, log, chef.name, prices))
      // Replace, so Back from the menu cannot land on this form and log twice.
      navigate('/', { replace: true })
    })
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
            maxLength={NOTES_MAX}
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
            min={EARLIEST_COOK}
            max={today}
            value={cookedOn}
            aria-invalid={dateError !== null}
            aria-describedby={dateError === null ? undefined : 'date-error'}
            onChange={(event) => setCookedOn(event.target.value)}
          />
        </label>
        <ErrorNotice error={dateError} id="date-error" />
        <ErrorNotice error={error} />
        {rating === null && (
          <p className="section-note" id="save-hint">
            Pick how it went first.
          </p>
        )}
        <div className="actions">
          <button
            className="button"
            type="submit"
            aria-disabled={busy || rating === null}
            aria-describedby={rating === null ? 'save-hint' : 'rating-decides'}
          >
            Save this cook
          </button>
          <Saving busy={busy} />
        </div>
      </form>
    </main>
  )
}
