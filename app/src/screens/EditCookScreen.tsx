// Change or delete one cook. Progress is derived from the log, so the screen
// says what a change would take away before it is saved.

import { startTransition, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { RatingPicker } from '../components/RatingPicker'
import { usePageTitle } from '../components/usePageTitle'
import { useWrite } from '../components/useWrite'
import { ErrorNotice, Saving } from '../components/WriteStatus'
import { recipeById } from '../curriculum/recipes'
import type { Recipe } from '../curriculum/types'
import { deleteCookLog, NOTES_MAX, updateCookLog } from '../lib/cookLogs'
import { checkCookedOn, EARLIEST_COOK, skillList } from '../lib/format'
import { progressLost, type CookLog, type Rating } from '../lib/progress'
import { useToday } from '../components/useNow'
import { useKitchen } from '../kitchen'
import { MenuLink } from '../components/MenuLink'

/**
 * Recipes named in a sentence. Never joined with "and": a title can hold one
 * ("Sheet-pan sausage and vegetables"), and two dishes would read as three.
 */
function recipesNamed(recipes: readonly Recipe[]): string {
  const [only] = recipes
  if (recipes.length === 1 && only !== undefined) return only.title
  return `${recipes.length} recipes (${recipes.map((recipe) => recipe.title).join('; ')})`
}

/** What a change or a delete would take away, a sentence for each kind. */
function lostSentence(before: readonly CookLog[], after: readonly CookLog[], plan: readonly string[]): string | null {
  const lost = progressLost(before, after)
  const parts = [
    ...(lost.skills.length > 0 ? [`unlearn ${skillList(lost.skills)}`] : []),
    ...(lost.locked.length > 0 ? [`lock ${recipesNamed(lost.locked)} again`] : []),
    ...(lost.unmastered.length > 0 ? [`undo mastering ${recipesNamed(lost.unmastered)}`] : []),
  ]
  const [first, ...rest] = parts
  if (first === undefined) return null
  const planned = lost.locked.filter((recipe) => plan.includes(recipe.id))
  const [onlyPlanned] = planned
  const onPlan =
    onlyPlanned === undefined
      ? []
      : [planned.length === 1 ? `${onlyPlanned.title} is on this week’s plan.` : `${planned.length} of them are on this week’s plan.`]
  return [`This would ${first}.`, ...rest.map((part) => `It would also ${part}.`), ...onPlan].join(' ')
}

type EditProps = {
  logs: readonly CookLog[]
  /** This week's plan, to say when a recipe that would lock again is on it. */
  plan: readonly string[]
  onUpdated: (log: CookLog) => void
  onDeleted: (id: string) => void
}

export function EditCookScreen() {
  const { logs, shop, onLogUpdated, onLogDeleted } = useKitchen()
  const { id } = useParams()
  const log = logs.find((candidate) => candidate.id === id)
  // Deleted on another device, and gone from the log when the app caught up.
  if (log === undefined) return <CookGone />
  return <EditCook log={log} logs={logs} plan={shop.plan} onUpdated={onLogUpdated} onDeleted={onLogDeleted} />
}

function CookGone() {
  usePageTitle('Not in your log')
  return (
    <main className="page">
      <MenuLink />
      <h1 className="title">That cook is not in your log</h1>
      <p className="notice notice-info">It may have been deleted on another device. Nothing else changed.</p>
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
  // A cook cannot be dated in the future: today where the cook is, kept current.
  const today = useToday()
  const save = useWrite()
  const remove = useWrite()
  // A date the form will not take is said beside the field, which it is tied to.
  const [dateError, setDateError] = useState<string | null>(null)

  // What a save or a delete would take away. Notes change nothing, so typing them recomputes nothing.
  const saveWarning = useMemo(
    () =>
      lostSentence(
        logs,
        logs.map((candidate) => (candidate.id === log.id ? { ...candidate, rating, cookedOn } : candidate)),
        plan,
      ),
    [logs, log.id, rating, cookedOn, plan],
  )
  const deleteWarning = useMemo(
    () =>
      lostSentence(
        logs,
        logs.filter((candidate) => candidate.id !== log.id),
        plan,
      ),
    [logs, log.id, plan],
  )

  function submit(event: FormEvent) {
    event.preventDefault()
    if (remove.busy) return
    // Only a date the cook changed is checked: one logged on a device a day
    // ahead (another time zone, a clock set wrong) still saves its notes.
    try {
      if (cookedOn !== log.cookedOn) checkCookedOn(cookedOn, today)
      setDateError(null)
    } catch (cause) {
      setDateError((cause as Error).message)
      document.querySelector<HTMLInputElement>('input[type="date"]')?.focus()
      return
    }
    void save.run(async () => {
      onUpdated(await updateCookLog(log.id, { cookedOn, rating, notes: notes.trim() }))
      navigate(`/recipe/${recipe.id}`, { replace: true })
    })
  }

  function confirmDelete() {
    if (save.busy || remove.busy) return
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
            min={EARLIEST_COOK}
            max={log.cookedOn > today ? log.cookedOn : today}
            value={cookedOn}
            aria-invalid={dateError !== null}
            aria-describedby={dateError === null ? undefined : 'date-error'}
            onChange={(event) => setCookedOn(event.target.value)}
          />
        </label>
        <ErrorNotice error={dateError} id="date-error" />
        {saveWarning !== null && (
          <p className="notice notice-info" id="save-warning">
            {saveWarning}
          </p>
        )}
        <ErrorNotice error={save.error} />
        <div className="actions">
          <button
            className="button"
            type="submit"
            aria-disabled={save.busy || remove.busy}
            aria-describedby={saveWarning === null ? undefined : 'save-warning'}
          >
            Save changes
          </button>
          <Saving busy={save.busy} />
        </div>
      </form>

      <section className="section">
        <h2 className="section-title">Delete it</h2>
        <p className="section-note" id="delete-warning">
          For a cook logged by mistake. {deleteWarning ?? 'Nothing you have learned depends on it.'}
        </p>
        <ErrorNotice error={remove.error} />
        <div className="actions">
          <button
            className="button button-quiet"
            type="button"
            aria-disabled={save.busy || remove.busy}
            aria-describedby="delete-warning"
            onClick={confirmDelete}
          >
            Delete this cook
          </button>
          <Saving busy={remove.busy} text="Deleting…" />
        </div>
      </section>
    </main>
  )
}
