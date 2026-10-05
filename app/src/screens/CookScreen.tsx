// Cook mode: one step per screen, sized to be read from across the counter.
// The step lives in the URL, so the back button and a reload both behave.

import { useEffect, useState, type MouseEvent } from 'react'
import { Link, useParams } from 'react-router'
import { EquipmentList } from '../components/EquipmentList'
import { IngredientList } from '../components/IngredientList'
import { useCookTimers } from '../components/useCookTimers'
import type { EquipmentId } from '../curriculum/equipment'
import { INGREDIENTS } from '../curriculum/ingredients'
import { formatClock } from '../lib/format'
import { cookable, lastNote, type CookLog } from '../lib/progress'
import { clearTimers } from '../lib/timers'

export function CookScreen({ logs, kit }: { logs: readonly CookLog[]; kit: ReadonlySet<EquipmentId> }) {
  const params = useParams()
  if (params.id === undefined || params.step === undefined) throw new Error('Cook route is missing its id or step')
  const { recipe, content } = cookable(params.id, logs)

  // Step 0 is "get everything out"; steps 1..n are the method.
  const step = Number(params.step)
  const last = content.steps.length
  if (!Number.isInteger(step) || step < 0 || step > last) throw new Error(`${recipe.title} has no step ${params.step}`)

  // Timers belong to the whole cook, not to one step, so a timer started on
  // step 3 keeps running while you read step 4, and through a reload.
  const timers = useCookTimers(recipe.id)
  const screenStaysOn = useWakeLock()
  const elsewhere = timers.steps.filter((other) => other !== step)

  // Leaving cook mode stops every timer for this recipe.
  function confirmLeave(event: MouseEvent) {
    if (timers.running && !window.confirm('A timer is still running. Leaving cook mode stops it.')) {
      event.preventDefault()
      return
    }
    clearTimers(sessionStorage, recipe.id)
  }

  const current = step === 0 ? null : content.steps[step - 1]
  if (current === undefined) throw new Error(`${recipe.title} has no step ${step}`)
  const timer = current === null ? null : current.timer
  const note = lastNote(recipe.id, logs)

  // A running timer always belongs to a step that has one.
  function timerLabel(other: number): string {
    const label = content.steps[other - 1]?.timer?.label
    if (label === undefined) throw new Error(`${recipe.title} has no timer on step ${other}`)
    return label
  }
  const left = timers.secondsLeft(step)

  return (
    <main className="page cook">
      <header className="cook-head">
        <Link to={`/recipe/${recipe.id}`} onClick={confirmLeave}>
          Leave cook mode
        </Link>
        <p className="cook-count">
          {step === 0 ? 'Before you start' : `Step ${step} of ${last}`}
        </p>
        <progress className="cook-progress" value={step} max={last} aria-label="Progress through the recipe" />
      </header>

      {timers.needsTap && (
        <p className="notice timer-sound" role="status">
          The page reloaded. Tap anywhere so your timers can chime.
        </p>
      )}

      {elsewhere.length > 0 && (
        <ul className="timer-strip">
          {elsewhere.map((other) => {
            const remaining = timers.secondsLeft(other)
            return (
              <li key={other}>
                <Link className={remaining === 0 ? 'timer-chip timer-chip-done' : 'timer-chip'} to={`/cook/${recipe.id}/${other}`}>
                  {timerLabel(other)}: {remaining === 0 ? 'time is up' : formatClock(remaining ?? 0)}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {current === null ? (
        <section className="cook-body">
          <h1 className="cook-text">Get everything out before you turn anything on.</h1>
          {note !== null && <p className="notice">Last time you wrote: “{note}”</p>}
          {content.ingredients.some(({ ingredientId }) => INGREDIENTS[ingredientId].section === 'meat') && (
            <p className="section-note">Leave the meat in the fridge until the step that uses it.</p>
          )}
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
                <button className="button button-quiet" type="button" onClick={() => timers.start(step, timer.seconds)}>
                  Start {formatClock(timer.seconds)} timer
                </button>
              ) : (
                <>
                  <p className={left === 0 ? 'timer-clock timer-clock-done' : 'timer-clock'}>
                    {left === 0 ? 'Time is up' : formatClock(left)}
                  </p>
                  <button className="link-button" type="button" onClick={() => timers.reset(step)}>
                    Reset timer
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
        </section>
      )}

      {screenStaysOn === false && <p className="row-note">This browser will not keep the screen awake here.</p>}

      <nav className="cook-nav">
        {step > 0 ? (
          <Link className="button button-quiet" to={`/cook/${recipe.id}/${step - 1}`}>
            Back
          </Link>
        ) : (
          <span />
        )}
        {step < last ? (
          <Link className="button" to={`/cook/${recipe.id}/${step + 1}`}>
            {step === 0 ? 'Everything is out' : 'Next step'}
          </Link>
        ) : (
          <Link className="button" to={`/cook/${recipe.id}/log`}>
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
