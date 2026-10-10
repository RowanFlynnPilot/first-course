// The timers for one cook, by label. They are kept in localStorage
// (lib/timers.ts), so a reload, a discarded background tab, or an installed
// app the phone closed does not lose them, and one check plays every ring:
// it runs on a quarter-second tick and again whenever the page comes back
// into view, so a timer that ran out while the phone was locked rings as soon
// as the cook looks again.
//
// A timer that runs out rings every RING_EVERY_MS, like a kitchen timer,
// until the cook taps the page or it has rung for RING_FOR_MS. A simmer whose
// step says to stir on a schedule (`stirEvery`) beeps once, softly, each
// time, and says "stir it now" until tapped or for STIR_SHOWN_MS.
//
// A phone only plays sound after a tap on the page. Starting a timer is a
// tap. After a reload there has been no tap yet, so the screen asks for one,
// and a timer that runs out first rings once at that tap.

import { useEffect, useRef, useState } from 'react'
import { clearTimers, dueTimers, loadTimers, saveTimers, shownTimers, stopped, type Timers } from '../lib/timers'

const TICK_MS = 250
const RING_EVERY_MS = 5000
const RING_FOR_MS = 2 * 60 * 1000
/** The three beeps last about this long. */
const RING_MS = 1200
/** A stir reminder stays on screen this long, unless tapped first. */
const STIR_SHOWN_MS = 60 * 1000

/** What a recipe's step says about each of its timers, by label: how long, how often to stir, what to do at the ring. */
export type TimerPlan = Readonly<Record<string, { readonly seconds: number; readonly stirEvery?: number; readonly done: string }>>

// One audio context for the page load, unlocked by the first tap that needs
// it. Kept outside the hook, so leaving cook mode for the log form and
// coming back does not lose the sound.
let sharedAudio: AudioContext | null = null

// Safari 16.4 and later: an audio session of type "playback" sounds with the
// ring switch off, as a kitchen timer app does, and pauses other audio. It is
// set for each ring of a timer that ran out and put back once the beeps end.
// A stir's soft beep leaves it alone: pausing the cook's podcast every five
// minutes of a simmer is too much for a reminder the screen also shows.
// Other browsers have no such switch to get past.
type AudioSessionType = 'auto' | 'playback'
const audioSession = (navigator as Navigator & { audioSession?: { type: AudioSessionType } }).audioSession

function beep(audio: AudioContext, offsets: readonly number[], wave: OscillatorType, frequency: number, volume: number) {
  for (const offset of offsets) {
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    oscillator.type = wave
    oscillator.frequency.value = frequency
    gain.gain.value = volume
    oscillator.connect(gain).connect(audio.destination)
    oscillator.start(audio.currentTime + offset)
    oscillator.stop(audio.currentTime + offset + 0.25)
  }
}

/** Three loud beeps: a timer ran out. A square wave carries over a range hood far better than a sine. */
function ring(audio: AudioContext) {
  if (audioSession !== undefined) {
    audioSession.type = 'playback'
    window.setTimeout(() => {
      audioSession.type = 'auto'
    }, RING_MS)
  }
  beep(audio, [0, 0.4, 0.8], 'square', 880, 0.35)
}

/** One soft beep: time to stir. Not to be mistaken for a timer running out. */
function chirp(audio: AudioContext) {
  beep(audio, [0], 'sine', 660, 0.25)
}

/** What to do when a timer rings: "Turn off its burner and leave the lid on." */
export function timerDone(label: string, plan: TimerPlan): string {
  const timer = plan[label]
  if (timer === undefined) throw new Error(`No timer called ${label} in this recipe`)
  return timer.done
}

/** "Rice: time is up. Turn off its burner and leave the lid on." What a finished timer says aloud. */
function timeIsUp(label: string, plan: TimerPlan): string {
  return `${label}: time is up. ${timerDone(label, plan)}`
}

/** The ring is over for these labels. */
function ended(timers: Timers, labels: readonly string[]): Timers {
  return Object.fromEntries(
    Object.entries(timers).map(([label, timer]) => [label, labels.includes(label) ? { ...timer, rang: true } : timer]),
  )
}

export function useCookTimers(owner: string, recipeId: string, plan: TimerPlan) {
  // A timer the recipe no longer has (a revision renamed it mid-cook) is left out: no step can show it.
  const [timers, setTimers] = useState<Timers>(() =>
    Object.fromEntries(Object.entries(loadTimers(localStorage, owner, recipeId)).filter(([label]) => label in plan)),
  )
  const [now, setNow] = useState(() => Date.now())
  const [soundOn, setSoundOn] = useState(sharedAudio !== null)
  const [soundError, setSoundError] = useState<string | null>(null)
  // When each label last asked for a stir, while it is on screen.
  const [stirAt, setStirAt] = useState<Readonly<Record<string, number>>>({})
  // What a screen reader is told when a timer runs out or asks for a stir: the beeps carry no words.
  const [announcement, setAnnouncement] = useState('')
  // The tick reads the latest timers and plan without restarting itself on every change.
  const latest = useRef(timers)
  const latestPlan = useRef(plan)
  // When the last ring played, and when each timer's ringing began, on this page load.
  const lastRing = useRef(0)
  const ringingSince = useRef(new Map<string, number>())
  // Timers whose running out was announced, and the stir each simmer was last at, on this page load.
  const announced = useRef(new Set<string>())
  const stirSeen = useRef(new Map<string, number>())

  // Once the cook is over (left, or logged), nothing is saved again: a ring's
  // tap can still land after the timers were cleared, and must not bring them back.
  const over = useRef(false)

  useEffect(() => {
    latest.current = timers
    if (!over.current) saveTimers(localStorage, owner, recipeId, timers)
  }, [owner, recipeId, timers])
  useEffect(() => {
    latestPlan.current = plan
  }, [plan])

  useEffect(() => {
    // A phone suspends audio while the page is hidden; wake it, and ring only
    // if a timer still wants it by then: a tap may have stopped it meanwhile.
    function ringWhenAwake(audio: AudioContext) {
      audio
        .resume()
        .then(() => {
          const at = Date.now()
          if (dueTimers(shownTimers(latest.current, at), at).length > 0) ring(audio)
        })
        .catch((cause: Error) => setSoundError(cause.message))
    }
    /**
     * Simmers that reached their next stir since the last check. One started
     * on this page load counts from its start; the first look at one from
     * before a reload only notes where it is, so a reload does not beep for
     * stirs already past.
     */
    function stirsDue(at: number): string[] {
      const due: string[] = []
      for (const [label, timer] of Object.entries(shownTimers(latest.current, at))) {
        const step = latestPlan.current[label]
        if (step?.stirEvery === undefined || timer.endsAt <= at) continue
        const stir = Math.floor((at - (timer.endsAt - step.seconds * 1000)) / (step.stirEvery * 1000))
        const seen = stirSeen.current.get(label)
        stirSeen.current.set(label, stir)
        if (seen !== undefined && stir > seen) due.push(label)
      }
      return due
    }
    function check() {
      const at = Date.now()
      const shown = shownTimers(latest.current, at)
      // Only a clock on screen needs the time: with no timer shown, cook mode is not drawn again four times a second.
      if (Object.keys(shown).length > 0) setNow(at)
      const fresh = dueTimers(shown, at).filter((label) => !announced.current.has(label))
      for (const label of fresh) announced.current.add(label)
      // What to do comes with the words, since the beeps carry none ("Rice: time is up. Turn off its burner…").
      if (fresh.length > 0) setAnnouncement(fresh.map((label) => timeIsUp(label, latestPlan.current)).join(' '))
      const stirs = stirsDue(at)
      if (stirs.length > 0) {
        setStirAt((previous) => ({ ...previous, ...Object.fromEntries(stirs.map((label) => [label, at])) }))
        setAnnouncement(`${stirs.join(' and ')}: stir it now.`)
        if (sharedAudio !== null) {
          const audio = sharedAudio
          audio
            .resume()
            .then(() => chirp(audio))
            .catch((cause: Error) => setSoundError(cause.message))
        }
      }
      const audio = sharedAudio
      // With no sound yet, a timer that ran out waits for the tap.
      const due = audio === null ? [] : dueTimers(shown, at)
      for (const label of due) if (!ringingSince.current.has(label)) ringingSince.current.set(label, at)
      const rungOut = due.filter((label) => at - (ringingSince.current.get(label) ?? at) >= RING_FOR_MS)
      if (audio !== null && due.length > rungOut.length && at - lastRing.current >= RING_EVERY_MS) {
        lastRing.current = at
        ringWhenAwake(audio)
      }
      if (rungOut.length === 0) return
      const next = ended(latest.current, rungOut)
      latest.current = next
      setTimers(next)
    }
    function onVisible() {
      if (document.visibilityState === 'visible') check()
    }
    const tick = window.setInterval(check, TICK_MS)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(tick)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  // While a timer is counting or ringing, any tap turns the sound on (the first
  // one after a reload, or Start timer) and stops a ring: the cook is looking.
  const shown = shownTimers(timers, now)
  const waiting = Object.values(shown).some((timer) => !timer.rang)
  useEffect(() => {
    if (!waiting) return
    // A phone counts the end of a tap (pointerup, touchend), not its start, as
    // the tap that may play sound, so the sound turns on only once it can.
    // One tap fires several of these; the first that wakes the sound does the
    // work and the rest find nothing left to do.
    function onTap() {
      const audio = (sharedAudio ??= new AudioContext())
      audio
        .resume()
        .then(() => {
          if (audio.state !== 'running') return
          setSoundOn(true)
          const at = Date.now()
          const due = dueTimers(shownTimers(latest.current, at), at)
          // A timer that ran out before the sound was on has not been heard yet: once, now.
          if (due.some((label) => !ringingSince.current.has(label))) ring(audio)
          if (due.length === 0) return
          lastRing.current = at
          const next = ended(latest.current, due)
          latest.current = next
          setTimers(next)
        })
        .catch((cause: Error) => setSoundError(cause.message))
    }
    const events = ['pointerup', 'touchend', 'keydown'] as const
    for (const event of events) document.addEventListener(event, onTap)
    return () => {
      for (const event of events) document.removeEventListener(event, onTap)
    }
  }, [waiting])

  function secondsLeft(label: string): number | null {
    const timer = shown[label]
    return timer === undefined ? null : Math.max(0, Math.ceil((timer.endsAt - now) / 1000))
  }

  return {
    /** Labels of the timers on screen, finished or not. */
    labels: Object.keys(shown),
    /** Whether a timer was started in this cook, even if it was stopped or finished long ago. */
    started: (label: string) => label in timers,
    secondsLeft,
    /** A timer is counting down. */
    running: Object.keys(shown).some((label) => (secondsLeft(label) ?? 0) > 0),
    /** Simmers asking to be stirred right now. */
    stirring: Object.entries(stirAt)
      .filter(([label, at]) => now - at < STIR_SHOWN_MS && (secondsLeft(label) ?? 0) > 0)
      .map(([label]) => label),
    /** The latest thing a timer had to say, for a screen reader. */
    announcement,
    /** A timer will need to ring, and no tap has turned the sound on since the page loaded. */
    needsTap: waiting && !soundOn,
    /** Why the phone would not play the ring, if it would not. */
    soundError,
    start(label: string, seconds: number) {
      // Created on this tap, which is what lets the phone play the ring later.
      sharedAudio ??= new AudioContext()
      setSoundOn(true)
      // The clock may have been resting with no timer on screen: start it from now.
      setNow(Date.now())
      ringingSince.current.delete(label)
      announced.current.delete(label)
      // Counted from the start, whenever the next check runs: a phone locked right after Start still stirs on time.
      stirSeen.current.set(label, 0)
      setTimers((previous) => ({ ...previous, [label]: { endsAt: Date.now() + seconds * 1000, rang: false, stopped: false } }))
    },
    /** The cook stirred: the reminder goes until the next one. */
    stirred(label: string) {
      setStirAt((previous) => Object.fromEntries(Object.entries(previous).filter(([other]) => other !== label)))
    },
    /** The cook is over: every timer for the recipe goes, for good. */
    end() {
      over.current = true
      clearTimers(localStorage, owner, recipeId)
    },
    stop(label: string) {
      ringingSince.current.delete(label)
      setTimers((previous) => {
        const timer = previous[label]
        if (timer === undefined) throw new Error(`No timer called ${label} to stop`)
        return { ...previous, [label]: stopped(timer, Date.now()) }
      })
    },
  }
}
