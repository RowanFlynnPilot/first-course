import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import type { Chef } from '../lib/chefs'
import { insertCookLog } from '../lib/cookLogs'
import { cookNotice, type CookNotice } from '../lib/notice'
import { cookable, RATINGS, type CookLog, type Rating } from '../lib/progress'

export function LogScreen({
  chef,
  logs,
  onLogged,
}: {
  chef: Chef
  logs: readonly CookLog[]
  onLogged: (log: CookLog, earned: CookNotice) => void
}) {
  const { id } = useParams()
  if (id === undefined) throw new Error('Log route is missing its id')
  // Same gate as cook mode, checked before anything is written.
  const { recipe } = cookable(id, logs)
  const navigate = useNavigate()
  const [rating, setRating] = useState<Rating | null>(null)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(event: FormEvent) {
    event.preventDefault()
    if (rating === null) return
    setBusy(true)
    try {
      const log = await insertCookLog({ recipeId: recipe.id, rating, notes: notes.trim() })
      onLogged(log, cookNotice(recipe, logs, log, chef.name))
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
        <fieldset className="ratings">
          <legend className="visually-hidden">Rate this cook</legend>
          {RATINGS.map((option) => (
            <label key={option.value} className={rating === option.value ? 'rating rating-chosen' : 'rating'}>
              <input
                type="radio"
                name="rating"
                value={option.value}
                checked={rating === option.value}
                onChange={() => setRating(option.value)}
              />
              <span className="row-title">{option.label}</span>
              <span className="row-note">{option.hint}</span>
            </label>
          ))}
        </fieldset>
        <label className="field">
          Notes for next time
          <textarea
            rows={3}
            value={notes}
            placeholder="Pan was too hot. Use less lemon."
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        {error !== null && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}
        <button className="button" type="submit" disabled={busy || rating === null}>
          Save this cook
        </button>
      </form>
    </main>
  )
}
