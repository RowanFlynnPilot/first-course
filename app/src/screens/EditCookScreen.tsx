// Change or delete one cook. Progress is derived from the log, so the screen
// says what a change would take away before it is saved.

import { startTransition, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { RatingPicker } from '../components/RatingPicker'
import { usePageTitle } from '../components/usePageTitle'
import { useWrite } from '../components/useWrite'
import { recipeById } from '../curriculum/recipes'
import { deleteCookLog, NOTES_MAX, updateCookLog } from '../lib/cookLogs'
import { checkCookedOn, listOf, localDateString, skillList } from '../lib/format'
import { progressLost, type CookLog, type Rating } from '../lib/progress'


function lostSentence(before: readonly CookLog[], after: readonly CookLog[], plan: readonly string[]): string | null {
  const lost = progressLost(before, after)
  const parts = [
    ...(lost.skills.length > 0 ? [`unlearn ${skillList(lost.skills)}`] : []),
    ...(lost.locked.length > 0 ? [`lock ${listOf(lost.locked.map((recipe) => recipe.title))} again`] : []),
    ...(lost.unmastered.length > 0 ? [`undo mastering ${listOf(lost.unmastered.map((recipe) => recipe.title))}`] : []),
  ]
  if (parts.length === 0) return null
  const planned = lost.locked.filter((recipe) => plan.includes(recipe.id)).map((recipe) => recipe.title)
  const onPlan = planned.length === 0 ? '' : ` ${listOf(planned)} ${planned.length === 1 ? 'is' : 'are'} on this week’s plan.`
  return `This would ${listOf(parts)}.${onPlan}`
}

type EditProps = {
  logs: readonly CookLog[]
  /** This week's plan, to say when a recipe that would lock again is on it. */
  plan: readonly string[]
  onUpdated: (log: CookLog) => void
  onDeleted: (id: string) => void
}

export function EditCookScreen(props: EditProps) {
  const { id } = useParams()
  const log = props.logs.find((candidate) => candidate.id === id)
  // Deleted on another device, and gone from the log when the app caught up.
  if (log === undefined) return <CookGone />
  return <EditCook log={log} {...props} />
}

function CookGone() {
  usePageTitle('Not in your log')
  return (
    <main className="page">
      <nav className="back">
        <Link to="/">Menu</Link>
      </nav>
      <h1 className="title">That cook is not in your log</h1>
      <p className="notice">It may have been deleted on another device. Nothing else changed.</p>
    </main>
  )
}

function EditCook({ log, logs, plan, onUpdated, onDeleted }: EditProps & { log: CookLog }) {
  const recipe = recipeById(log.recipeId)
  const navigate = useNavigate()
  usePageTitle(`Change this cook: ${recipe.title}`)
  const [rating, setRating] = useState<Rating>(log.rating)
  const [notes, setNotes] = useState(log.notes)
  const [cookedOn, setCookedOn] = useState(log.cookedOn)
  // A cook cannot be dated in the future. Read the clock once, not on every render.
  const [today] = useState(() => localDateString(new Date()))
  const save = useWrite()
  const remove = useWrite()

  const edited = logs.map((candidate) => (candidate.id === log.id ? { ...candidate, rating, cookedOn, notes } : candidate))
  const saveWarning = lostSentence(logs, edited, plan)
  const deleteWarning = lostSentence(
    logs,
    logs.filter((candidate) => candidate.id !== log.id),
    plan,
  )

  function submit(event: FormEvent) {
    event.preventDefault()
    void save.run(async () => {
      // Only a date the cook changed is checked: one logged on a device a day
      // ahead (another time zone, a clock set wrong) still saves its notes.
      if (cookedOn !== log.cookedOn) checkCookedOn(cookedOn, today)
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
        <RatingPicker value={rating} onChange={setRating} describedBy={saveWarning === null ? undefined : 'save-warning'} />
        <label className="field">
          Notes for next time
          <textarea maxLength={NOTES_MAX} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <label className="field">
          Cooked on
          <input
            type="date"
            required
            max={log.cookedOn > today ? log.cookedOn : today}
            value={cookedOn}
            onChange={(event) => setCookedOn(event.target.value)}
          />
        </label>
        {saveWarning !== null && (
          <p className="notice" id="save-warning">
            {saveWarning}
          </p>
        )}
        {save.error !== null && (
          <p className="notice notice-error" role="alert">
            {save.error}
          </p>
        )}
        <button
          className="button"
          type="submit"
          disabled={save.busy || remove.busy}
          aria-describedby={saveWarning === null ? undefined : 'save-warning'}
        >
          Save changes
        </button>
      </form>

      <section className="section">
        <h2 className="section-title">Delete it</h2>
        <p className="section-note" id="delete-warning">
          For a cook logged by mistake. {deleteWarning ?? 'Nothing you have learned depends on it.'}
        </p>
        {remove.error !== null && (
          <p className="notice notice-error" role="alert">
            {remove.error}
          </p>
        )}
        <button
          className="button button-quiet"
          type="button"
          disabled={save.busy || remove.busy}
          aria-describedby="delete-warning"
          onClick={confirmDelete}
        >
          Delete this cook
        </button>
      </section>
    </main>
  )
}
