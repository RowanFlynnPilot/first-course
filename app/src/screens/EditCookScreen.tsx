// Change or delete one cook. Progress is derived from the log, so the screen
// says what a change would take away before it is saved.

import { startTransition, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { RatingPicker } from '../components/RatingPicker'
import { useWrite } from '../components/useWrite'
import { recipeById } from '../curriculum/recipes'
import { deleteCookLog, updateCookLog } from '../lib/cookLogs'
import { listOf, localDateString, skillList } from '../lib/format'
import { progressLost, type CookLog, type Rating } from '../lib/progress'

function findCook(logs: readonly CookLog[], id: string | undefined): CookLog {
  const log = logs.find((candidate) => candidate.id === id)
  if (log === undefined) throw new Error('That cook is not in your log.')
  return log
}

function lostSentence(before: readonly CookLog[], after: readonly CookLog[]): string | null {
  const lost = progressLost(before, after)
  const parts = [
    ...(lost.skills.length > 0 ? [`unlearn ${skillList(lost.skills)}`] : []),
    ...(lost.locked.length > 0 ? [`lock ${listOf(lost.locked.map((recipe) => recipe.title))} again`] : []),
    ...(lost.unmastered.length > 0 ? [`undo mastering ${listOf(lost.unmastered.map((recipe) => recipe.title))}`] : []),
  ]
  return parts.length === 0 ? null : `This would ${listOf(parts)}.`
}

export function EditCookScreen({
  logs,
  onUpdated,
  onDeleted,
}: {
  logs: readonly CookLog[]
  onUpdated: (log: CookLog) => void
  onDeleted: (id: string) => void
}) {
  const { id } = useParams()
  const log = findCook(logs, id)
  const recipe = recipeById(log.recipeId)
  const navigate = useNavigate()
  const [rating, setRating] = useState<Rating>(log.rating)
  const [notes, setNotes] = useState(log.notes)
  const [cookedOn, setCookedOn] = useState(log.cookedOn)
  // A cook cannot be dated in the future. Read the clock once, not on every render.
  const [today] = useState(() => localDateString(new Date()))
  const save = useWrite()
  const remove = useWrite()

  const edited = logs.map((candidate) => (candidate.id === log.id ? { ...candidate, rating, cookedOn, notes } : candidate))
  const saveWarning = lostSentence(logs, edited)
  const deleteWarning = lostSentence(
    logs,
    logs.filter((candidate) => candidate.id !== log.id),
  )

  function submit(event: FormEvent) {
    event.preventDefault()
    void save.run(async () => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(cookedOn)) throw new Error('Choose the date you cooked it.')
      onUpdated(await updateCookLog(log.id, { cookedOn, rating, notes: notes.trim() }))
      navigate(`/recipe/${recipe.id}`, { replace: true })
    })
  }

  function confirmDelete() {
    const question = deleteWarning === null ? 'Delete this cook?' : `Delete this cook? ${deleteWarning}`
    if (!window.confirm(question)) return
    void remove.run(async () => {
      await deleteCookLog(log.id)
      // React Router navigates in a transition. Removing the cook in the same
      // transition makes both land in one render, so this screen is never
      // drawn for a cook that is gone.
      startTransition(() => {
        navigate(`/recipe/${recipe.id}`, { replace: true })
        onDeleted(log.id)
      })
    })
  }

  return (
    <main className="page">
      <nav className="back">
        <Link to={`/recipe/${recipe.id}`}>{recipe.title}</Link>
      </nav>
      <h1 className="title">Change this cook</h1>
      <form className="form" onSubmit={submit}>
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
        <RatingPicker value={rating} onChange={setRating} />
        <label className="field">
          Notes for next time
          <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        {saveWarning !== null && <p className="notice">{saveWarning}</p>}
        {save.error !== null && (
          <p className="notice notice-error" role="alert">
            {save.error}
          </p>
        )}
        <button className="button" type="submit" disabled={save.busy || remove.busy}>
          Save changes
        </button>
      </form>

      <section className="section">
        <h2 className="section-title">Delete it</h2>
        <p className="section-note">
          For a cook logged by mistake. {deleteWarning ?? 'Nothing you have learned depends on it.'}
        </p>
        {remove.error !== null && (
          <p className="notice notice-error" role="alert">
            {remove.error}
          </p>
        )}
        <button className="button button-quiet" type="button" disabled={save.busy || remove.busy} onClick={confirmDelete}>
          Delete this cook
        </button>
      </section>
    </main>
  )
}
