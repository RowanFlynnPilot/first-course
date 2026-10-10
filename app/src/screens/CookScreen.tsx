// Cook mode: one step per screen, sized to be read from across the counter.
// The step lives in the URL, so the back button and a reload both behave.

import { useEffect, useMemo, useState, type MouseEvent } from 'react'
import { Link, useParams } from 'react-router'
import { EquipmentList } from '../components/EquipmentList'
import { IngredientList } from '../components/IngredientList'
import { LockedPage } from '../components/LockedNotice'
import { timerDone, useCookTimers, type TimerPlan } from '../components/useCookTimers'
import { focusNext, useFocusTarget } from '../components/useFocusTarget'
import { useNow } from '../components/useNow'
import { usePageTitle } from '../components/usePageTitle'
import type { EquipmentId } from '../curriculum/equipment'
import { INGREDIENTS } from '../curriculum/ingredients'
import type { Recipe, RecipeContent } from '../curriculum/types'
import { clearCooking, loadCooking, saveCooking } from '../lib/cooking'
import { clearTimers } from '../lib/timers'
import { formatClock, readyAt } from '../lib/format'
import { cookable, lastNote, type CookLog } from '../lib/progress'
import { useKitchen } from '../kitchen'

/** A timer this long or longer gets a word about leaving the page. */
const LONG_TIMER_SECONDS = 10 * 60

export function CookScreen() {
  const { userId, logs, shop } = useKitchen()
  const { kit } = shop
  const params = useParams()
  if (params.id === undefined || params.step === undefined) throw new Error('Cook route is missing its id or step')
  // The one gate for cooking and logging (locked decision 13).
  const gate = cookable(params.id, logs)
  if (gate.content === null) return <LockedPage recipe={gate.recipe} logs={logs} />
  return (
    <CookMode
      key={gate.recipe.id}
      userId={userId}
      recipe={gate.recipe}
      content={gate.content}
      stepParam={params.step}
      logs={logs}
      kit={kit}
    />
  )
}

function CookMode({
  userId,
  recipe,
  content,
  stepParam,
  logs,
  kit,
}: {
  userId: string
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
  const plan = useMemo<TimerPlan>(
    () => Object.fromEntries(content.steps.flatMap(({ timer }) => (timer === null ? [] : [[timer.label, timer]]))),
    [content],
  )
  // Where this cook began, and how many cooks of the recipe the log held then: kept through a reload.
  // With none of this recipe in progress it is a new cook, and timers stored from one left long ago
  // must not count as started in it (read before the timers load below).
  const [{ from, cooksBefore }] = useState(() => {
    const before = loadCooking(localStorage, userId, Date.now())
    if (before !== null && before.recipeId === recipe.id && before.step !== 'log') {
      return { from: Math.min(before.from, step), cooksBefore: before.cooksBefore }
    }
    clearTimers(localStorage, userId, recipe.id)
    return { from: step, cooksBefore: logs.filter((cook) => cook.recipeId === recipe.id).length }
  })
  const timers = useCookTimers(userId, recipe.id, plan)
  usePageTitle(`${step === 0 ? 'Before you start' : `Step ${step} of ${last}`}: ${recipe.title}`)
  const screenStaysOn = useWakeLock()
  const now = useNow()
  const startButton = useFocusTarget<HTMLButtonElement>('timer-start')
  const stopButton = useFocusTarget<HTMLButtonElement>('timer-stop')
  const onward = useFocusTarget<HTMLAnchorElement>('cook-onward')

  // The cook in progress, so the menu can bring the cook back to this step if the phone closes the app.
  useEffect(() => {
    saveCooking(localStorage, userId, { recipeId: recipe.id, step, from, cooksBefore, at: Date.now() })
  }, [userId, recipe.id, step, from, cooksBefore])

  // Leaving cook mode, or logging the cook, stops every timer for this recipe. Ask first if one is running.
  // Says whether the cook went on (the tap was not cancelled).
  function stopsTimers(event: MouseEvent, question: string): boolean {
    if (timers.running && !window.confirm(question)) {
      event.preventDefault()
      return false
    }
    timers.end()
    return true
  }

  // A tap that swaps the timer's button for another hands focus to the new one.
  function startTimer(label: string, seconds: number, focus: string) {
    focusNext(focus)
    timers.start(label, seconds)
  }

  const current = step === 0 ? null : content.steps[step - 1]
  if (current === undefined) throw new Error(`${recipe.title} has no step ${step}`)
  const timer = current === null ? null : current.timer
  const note = lastNote(recipe.id, logs)
  const elsewhere = timers.labels.filter((label) => label !== timer?.label)
  // The step just passed had a timer that was never started: the cook tapped
  // on without it, and the recipe gives no other "when". Offered on this step
  // only, so a cook who judged by eye is not asked again on every step, and
  // only when this cook was on that step: one that began partway never saw it.
  const previous = step >= 2 && from <= step - 1 ? content.steps[step - 2] : undefined
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
    focusNext('timer-start')
    timers.stop(label)
  }

  // What comes after this step, so the cook can look ahead without tapping away.
  const following = content.steps[step]
  const nextLine = following === undefined ? 'Log how it went.' : firstSentence(following.text)

  return (
    <main className="page cook">
      <header className="cook-head">
        <Link
          to={`/recipe/${recipe.id}`}
          onClick={(event) => {
            if (stopsTimers(event, 'A timer is still running. Leave cook mode and stop it?')) clearCooking(localStorage, userId)
          }}
        >
          Leave cook mode
        </Link>
        {/* The live region for a new step: on every step, so it is already there when a step's words arrive
            (one that arrives with its words is often not read), while focus stays on Next step. */}
        <p className="cook-count" aria-live="polite" aria-atomic="true">
          {step === 0 ? 'Before you start' : `Step ${step} of ${last}`}
          {current !== null && <span className="visually-hidden">. {current.text}</span>}
        </p>
        <progress className="cook-progress" value={step} max={last} aria-label="Progress through the recipe" />
      </header>
      {/* The beeps carry no words: which timer ran out, or which simmer wants stirring. */}
      <p className="visually-hidden" role="status">
        {timers.announcement}
      </p>

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

      {elsewhere.length + skipped.length + timers.stirring.length > 0 && (
        <ul className="timer-strip">
          {timers.stirring.map((label) => (
            <li key={`stir:${label}`} className="timer-line">
              <span className="timer-chip timer-chip-stir">{label}: stir it now</span>
              <button
                className="link-button"
                type="button"
                aria-label={`Stirred: ${label}`}
                onClick={() => {
                  // The reminder goes with its button: focus moves on to the way forward.
                  focusNext('cook-onward')
                  timers.stirred(label)
                }}
              >
                Stirred
              </button>
            </li>
          ))}
          {skipped.map((earlier) => (
            <li key={earlier.label}>
              <button
                className="timer-chip timer-chip-idle"
                type="button"
                onClick={() => startTimer(earlier.label, earlier.seconds, `timer-chip:${earlier.label}`)}
              >
                {earlier.label}: start {formatClock(earlier.seconds)}
              </button>
            </li>
          ))}
          {elsewhere.map((label) => (
            <TimerChip
              key={label}
              label={label}
              remaining={timers.secondsLeft(label) ?? 0}
              to={`/cook/${recipe.id}/${stepOfTimer(label)}`}
              done={timerDone(label, plan)}
            />
          ))}
        </ul>
      )}
      {current === null ? (
        <section className="cook-body">
          <h1 className="cook-text">Get everything out before you turn anything on.</h1>
          {content.ingredients.some(({ ingredientId }) => INGREDIENTS[ingredientId].section === 'meat') && (
            <p className="cook-meat">Leave the meat in the fridge until the step that uses it.</p>
          )}
          <p className="cook-meat">Start now and you eat around {readyAt(now, content.totalMinutes)}.</p>
          <details className="amounts">
            <summary>Read every step once first</summary>
            <ol className="method">
              {content.steps.map((each) => (
                <li key={each.text}>{each.text}</li>
              ))}
            </ol>
          </details>
          {note !== null && <p className="notice notice-info">Last time you wrote: “{note}”</p>}
          <h2 className="section-title">Ingredients</h2>
          <IngredientList ingredients={content.ingredients} />
          <h2 className="section-title">Equipment</h2>
          <EquipmentList items={content.equipment} kit={kit} />
        </section>
      ) : (
        <section className="cook-body">
          <h1 className="cook-text">{current.text}</h1>
          {timer !== null && (
            <div className="timer" role="timer" aria-live="off">
              {left === null ? (
                <button
                  className="button timer-start"
                  type="button"
                  ref={startButton}
                  onClick={() => startTimer(timer.label, timer.seconds, 'timer-stop')}
                >
                  Start {formatClock(timer.seconds)} timer
                </button>
              ) : (
                <>
                  <p className={left === 0 ? 'timer-clock timer-clock-done' : 'timer-clock'}>
                    {left === 0 ? 'Time is up' : formatClock(left)}
                  </p>
                  {left === 0 && <p className="timer-done">{timer.done}</p>}
                  <button className="link-button" type="button" ref={stopButton} onClick={() => stopTimer(timer.label, left)}>
                    {left === 0 ? 'Clear timer' : 'Stop timer'}
                  </button>
                </>
              )}
            </div>
          )}
          {timer !== null && left !== null && left > 0 && timer.seconds >= LONG_TIMER_SECONDS && (
            <p className="row-note timer-away">
              This page can ring only while it is on screen. Putting the phone down or switching apps? Set your phone’s own
              timer to match.
            </p>
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

      {/* On step 0, with no Back, "Everything is out" takes the whole row. */}
      <nav className="cook-nav">
        {step > 0 && (
          <Link className="button button-quiet" to={`/cook/${recipe.id}/${step - 1}`}>
            Back
          </Link>
        )}
        {step < last ? (
          <Link className="button" to={`/cook/${recipe.id}/${step + 1}`} ref={onward}>
            {step === 0 ? 'Everything is out' : 'Next step'}
          </Link>
        ) : (
          <Link
            className="button"
            to={`/cook/${recipe.id}/log`}
            ref={onward}
            onClick={(event) => {
              // Cooked, not yet logged: the menu asks how it went until the cook is saved.
              if (stopsTimers(event, 'A timer is still running. Stop it and log the cook?')) {
                saveCooking(localStorage, userId, { recipeId: recipe.id, step: 'log', from, cooksBefore, at: Date.now() })
              }
            }}
          >
            Finish and log it
          </Link>
        )}
      </nav>
    </main>
  )
}

/**
 * A timer running on another step, linking to it. Once it is up, it says what
 * to do, here, on whatever step the cook is on. Takes focus when its dashed
 * "start" chip started it.
 */
function TimerChip({ label, remaining, to, done }: { label: string; remaining: number; to: string; done: string }) {
  const chip = useFocusTarget<HTMLAnchorElement>(`timer-chip:${label}`)
  return (
    <li className={remaining === 0 ? 'timer-line' : undefined}>
      <Link className={remaining === 0 ? 'timer-chip timer-chip-done' : 'timer-chip'} to={to} ref={chip}>
        {label}: {remaining === 0 ? 'time is up' : formatClock(remaining)}
      </Link>
      {remaining === 0 && <span className="timer-done">{done}</span>}
    </li>
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
