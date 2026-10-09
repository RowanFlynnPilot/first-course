// Cook mode: one step per screen, sized to be read from across the counter.
// The step lives in the URL, so the back button and a reload both behave.

import { useEffect, useState, type MouseEvent } from 'react'
import { Link, useParams } from 'react-router'
import { EquipmentList } from '../components/EquipmentList'
import { IngredientList } from '../components/IngredientList'
import { LockedPage } from '../components/LockedNotice'
import { useCookTimers } from '../components/useCookTimers'
import { usePageTitle } from '../components/usePageTitle'
import type { EquipmentId } from '../curriculum/equipment'
import { INGREDIENTS } from '../curriculum/ingredients'
import type { Recipe, RecipeContent } from '../curriculum/types'
import { formatClock } from '../lib/format'
import { cookable, lastNote, type CookLog } from '../lib/progress'

export function CookScreen({ logs, kit }: { logs: readonly CookLog[]; kit: ReadonlySet<EquipmentId> }) {
  const params = useParams()
  if (params.id === undefined || params.step === undefined) throw new Error('Cook route is missing its id or step')
  // The one gate for cooking and logging (locked decision 13).
  const gate = cookable(params.id, logs)
  if (gate.content === null) return <LockedPage recipe={gate.recipe} logs={logs} />
  return <CookMode recipe={gate.recipe} content={gate.content} stepParam={params.step} logs={logs} kit={kit} />
}

function CookMode({
  recipe,
  content,
  stepParam,
  logs,
  kit,
}: {
  recipe: Recipe
  content: RecipeContent
  stepParam: string
  logs: readonly CookLog[]
  kit: ReadonlySet<EquipmentId>
}) {
  // Step 0 is "get everything out"; steps 1..n are the method.
  const step = Number(stepParam)
  const last = content.steps.length
  // The step comes from the address bar, so the message does not repeat it.
  if (!Number.isInteger(step) || step < 0 || step > last) throw new Error(`That step is not in ${recipe.title}.`)

  // Timers belong to the whole cook, not to one step, so a timer started on
  // step 3 keeps running while you read step 4, and through a reload.
  const timers = useCookTimers(recipe.id)
  usePageTitle(`${step === 0 ? 'Before you start' : `Step ${step} of ${last}`}: ${recipe.title}`)
  const screenStaysOn = useWakeLock()

  // Leaving cook mode, or logging the cook, stops every timer for this recipe. Ask first if one is running.
  function confirmStop(question: string) {
    return (event: MouseEvent) => {
      if (timers.running && !window.confirm(question)) {
        event.preventDefault()
        return
      }
      timers.end()
    }
  }

  const current = step === 0 ? null : content.steps[step - 1]
  if (current === undefined) throw new Error(`${recipe.title} has no step ${step}`)
  const timer = current === null ? null : current.timer
  const note = lastNote(recipe.id, logs)
  const elsewhere = timers.labels.filter((label) => label !== timer?.label)
  // The step just passed had a timer that was never started: the cook tapped
  // on without it, and the recipe gives no other "when". Offered on this step
  // only, so a cook who judged by eye is not asked again on every step.
  const previous = step >= 2 ? content.steps[step - 2] : undefined
  const skipped =
    previous === undefined || previous.timer === null || timers.started(previous.timer.label) ? [] : [previous.timer]

  // A running timer belongs to the step whose timer has its label.
  function stepOfTimer(label: string): number {
    const index = content.steps.findIndex((candidate) => candidate.timer?.label === label)
    if (index === -1) throw new Error(`${recipe.title} has no timer called ${label}`)
    return index + 1
  }
  const left = timer === null ? null : timers.secondsLeft(timer.label)

  // One mis-tap with wet fingers should not lose a long timer.
  function stopTimer(label: string, remaining: number) {
    if (remaining > 60 && !window.confirm(`Stop the timer? It still has ${formatClock(remaining)} to go.`)) return
    timers.stop(label)
  }

  // What comes after this step, so the cook can look ahead without tapping away.
  const following = content.steps[step]
  const nextLine = following === undefined ? 'Log how it went.' : firstSentence(following.text)

  return (
    <main className="page cook">
      <header className="cook-head">
        <Link to={`/recipe/${recipe.id}`} onClick={confirmStop('A timer is still running. Leave cook mode and stop it?')}>
          Leave cook mode
        </Link>
        <p className="cook-count">
          {step === 0 ? 'Before you start' : `Step ${step} of ${last}`}
        </p>
        <progress className="cook-progress" value={step} max={last} aria-label="Progress through the recipe" />
      </header>

      {timers.soundError !== null && (
        <p className="notice notice-error" role="alert">
          This phone would not play the timer’s ring. Turn the volume up and tap the page; until then, watch the clock.
        </p>
      )}
      {timers.needsTap && (
        <p className="notice notice-info timer-sound" role="status">
          The page reloaded. Tap anywhere so your timers can ring.
        </p>
      )}

      {elsewhere.length + skipped.length > 0 && (
        <ul className="timer-strip">
          {skipped.map((earlier) => (
            <li key={earlier.label}>
              <button
                className="timer-chip timer-chip-idle"
                type="button"
                onClick={() => timers.start(earlier.label, earlier.seconds)}
              >
                {earlier.label}: start {formatClock(earlier.seconds)}
              </button>
            </li>
          ))}
          {elsewhere.map((label) => {
            const remaining = timers.secondsLeft(label)
            return (
              <li key={label}>
                <Link
                  className={remaining === 0 ? 'timer-chip timer-chip-done' : 'timer-chip'}
                  to={`/cook/${recipe.id}/${stepOfTimer(label)}`}
                >
                  {label}: {remaining === 0 ? 'time is up' : formatClock(remaining ?? 0)}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {current === null ? (
        <section className="cook-body">
          <h1 className="cook-text">Get everything out before you turn anything on.</h1>
          <p className="cook-meat">Read every step through once first.</p>
          {content.ingredients.some(({ ingredientId }) => INGREDIENTS[ingredientId].section === 'meat') && (
            <p className="cook-meat">Leave the meat in the fridge until the step that uses it.</p>
          )}
          {note !== null && <p className="notice notice-info">Last time you wrote: “{note}”</p>}
          <h2 className="section-title">Ingredients</h2>
          <IngredientList ingredients={content.ingredients} />
          <h2 className="section-title">Equipment</h2>
          <EquipmentList items={content.equipment} kit={kit} />
        </section>
      ) : (
        <section className="cook-body" aria-live="polite">
          <h1 className="cook-text">{current.text}</h1>
          {timer !== null && (
            <div className="timer" role="timer" aria-live="off">
              {left === null ? (
                <button className="button timer-start" type="button" onClick={() => timers.start(timer.label, timer.seconds)}>
                  Start {formatClock(timer.seconds)} timer
                </button>
              ) : (
                <>
                  <p className={left === 0 ? 'timer-clock timer-clock-done' : 'timer-clock'}>
                    {left === 0 ? 'Time is up' : formatClock(left)}
                  </p>
                  <button className="link-button" type="button" onClick={() => stopTimer(timer.label, left)}>
                    {left === 0 ? 'Clear timer' : 'Stop timer'}
                  </button>
                </>
              )}
            </div>
          )}
          {current.why !== null && (
            <p className="why">
              <strong>Why.</strong> {current.why}
            </p>
          )}
          <details className="amounts">
            <summary>Ingredients and amounts</summary>
            <IngredientList ingredients={content.ingredients} />
          </details>
          <p className="row-note cook-next">Next: {nextLine}</p>
        </section>
      )}

      {screenStaysOn === false && <p className="row-note">This browser will not keep the screen awake here.</p>}

      <nav className={step === 0 ? 'cook-nav cook-nav-first' : 'cook-nav'}>
        {step > 0 && (
          <Link className="button button-quiet" to={`/cook/${recipe.id}/${step - 1}`}>
            Back
          </Link>
        )}
        {step < last ? (
          <Link className="button" to={`/cook/${recipe.id}/${step + 1}`}>
            {step === 0 ? 'Everything is out' : 'Next step'}
          </Link>
        ) : (
          <Link
            className="button"
            to={`/cook/${recipe.id}/log`}
            onClick={confirmStop('A timer is still running. Stop it and log the cook?')}
          >
            Finish and log it
          </Link>
        )}
      </nav>
    </main>
  )
}

/**
 * Keeps the screen awake while cook mode is open. Returns false where the
 * browser will not allow it: the Wake Lock API only exists on HTTPS (and
 * localhost), so the plain-HTTP LAN URL used for phone testing reports false
 * and cook mode says so on screen.
 */
function useWakeLock(): boolean | null {
  // null = still asking.
  const [held, setHeld] = useState<boolean | null>(() => ('wakeLock' in navigator ? null : false))

  useEffect(() => {
    if (!('wakeLock' in navigator)) return
    let sentinel: WakeLockSentinel | null = null
    let left = false

    async function acquire() {
      if (document.visibilityState !== 'visible') return
      try {
        const next = await navigator.wakeLock.request('screen')
        if (left) {
          void next.release()
          return
        }
        sentinel = next
        setHeld(true)
      } catch {
        // The device refused (low battery, power saver). Say so on screen.
        setHeld(false)
      }
    }

    // The browser drops the lock whenever the tab is hidden; take it back on return.
    document.addEventListener('visibilitychange', acquire)
    void acquire()
    return () => {
      left = true
      document.removeEventListener('visibilitychange', acquire)
      void sentinel?.release()
    }
  }, [])

  return held
}

/** "Roast the potatoes on their own." from a step's text: the first sentence. */
function firstSentence(text: string): string {
  const end = text.search(/[.!?](\s|$)/)
  return end === -1 ? text : text.slice(0, end + 1)
}
