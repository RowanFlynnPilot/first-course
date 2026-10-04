// Cook mode: one step per screen, sized to be read from across the counter.
// The step lives in the URL, so the back button and a reload both behave.

import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { Link, useParams } from 'react-router'
import { EquipmentList } from '../components/EquipmentList'
import { IngredientList } from '../components/IngredientList'
import type { EquipmentId } from '../curriculum/equipment'
import { formatClock } from '../lib/format'
import { cookable, type CookLog } from '../lib/progress'

function ring(audio: AudioContext) {
  for (const offset of [0, 0.4, 0.8]) {
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    oscillator.frequency.value = 880
    gain.gain.value = 0.25
    oscillator.connect(gain).connect(audio.destination)
    oscillator.start(audio.currentTime + offset)
    oscillator.stop(audio.currentTime + offset + 0.25)
  }
}

export function CookScreen({ logs, kit }: { logs: readonly CookLog[]; kit: ReadonlySet<EquipmentId> }) {
  const params = useParams()
  if (params.id === undefined || params.step === undefined) throw new Error('Cook route is missing its id or step')
  const { recipe, content } = cookable(params.id, logs)

  // Step 0 is "get everything out"; steps 1..n are the method.
  const step = Number(params.step)
  const last = content.steps.length
  if (!Number.isInteger(step) || step < 0 || step > last) throw new Error(`${recipe.title} has no step ${params.step}`)

  // Timers belong to the whole cook, not to one step, so a timer started on
  // step 3 keeps running while you read step 4. Keyed by step number.
  const [endsAt, setEndsAt] = useState<Readonly<Record<number, number>>>({})
  const [now, setNow] = useState(() => Date.now())
  const timeouts = useRef<Record<number, number>>({})
  const audio = useRef<AudioContext | null>(null)

  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 250)
    const pending = timeouts.current
    return () => {
      window.clearInterval(tick)
      for (const timeout of Object.values(pending)) window.clearTimeout(timeout)
    }
  }, [])

  const screenStaysOn = useWakeLock()

  function startTimer(forStep: number, seconds: number) {
    // Created on a tap, which is what lets a phone play the chime later.
    audio.current ??= new AudioContext()
    const context = audio.current
    // A phone suspends audio when the page loses focus; wake it before the chime.
    timeouts.current[forStep] = window.setTimeout(() => void context.resume().then(() => ring(context)), seconds * 1000)
    setEndsAt((previous) => ({ ...previous, [forStep]: Date.now() + seconds * 1000 }))
  }

  function clearTimer(forStep: number) {
    window.clearTimeout(timeouts.current[forStep])
    delete timeouts.current[forStep]
    setEndsAt((previous) => Object.fromEntries(Object.entries(previous).filter(([key]) => Number(key) !== forStep)))
  }

  const secondsLeft = (forStep: number): number | null => {
    const end = endsAt[forStep]
    return end === undefined ? null : Math.max(0, Math.ceil((end - now) / 1000))
  }

  const elsewhere = Object.keys(endsAt)
    .map(Number)
    .filter((other) => other !== step)

  // Leaving cook mode unmounts this screen and its timers with it.
  function confirmLeave(event: MouseEvent) {
    const running = Object.keys(endsAt).some((key) => (secondsLeft(Number(key)) ?? 0) > 0)
    if (running && !window.confirm('A timer is still running. Leaving cook mode stops it.')) event.preventDefault()
  }

  const current = step === 0 ? null : content.steps[step - 1]
  if (current === undefined) throw new Error(`${recipe.title} has no step ${step}`)
  const timerSeconds = current === null ? null : current.timerSeconds
  const left = secondsLeft(step)

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

      {elsewhere.length > 0 && (
        <ul className="timer-strip">
          {elsewhere.map((other) => {
            const remaining = secondsLeft(other)
            return (
              <li key={other}>
                <Link className={remaining === 0 ? 'timer-chip timer-chip-done' : 'timer-chip'} to={`/cook/${recipe.id}/${other}`}>
                  Step {other}: {remaining === 0 ? 'time is up' : formatClock(remaining ?? 0)}
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {current === null ? (
        <section className="cook-body">
          <h1 className="cook-text">Get everything out before you turn anything on.</h1>
          <h2 className="section-title">Ingredients</h2>
          <IngredientList ingredients={content.ingredients} />
          <h2 className="section-title">Equipment</h2>
          <EquipmentList items={content.equipment} kit={kit} />
        </section>
      ) : (
        <section className="cook-body" aria-live="polite">
          <h1 className="cook-text">{current.text}</h1>
          {current.why !== null && (
            <p className="why">
              <strong>Why.</strong> {current.why}
            </p>
          )}
          {timerSeconds !== null && (
            <div className="timer" role="timer" aria-live="off">
              {left === null ? (
                <button className="button button-quiet" type="button" onClick={() => startTimer(step, timerSeconds)}>
                  Start {formatClock(timerSeconds)} timer
                </button>
              ) : (
                <>
                  <p className={left === 0 ? 'timer-clock timer-clock-done' : 'timer-clock'}>
                    {left === 0 ? 'Time is up' : formatClock(left)}
                  </p>
                  <button className="link-button" type="button" onClick={() => clearTimer(step)}>
                    Reset timer
                  </button>
                </>
              )}
            </div>
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
