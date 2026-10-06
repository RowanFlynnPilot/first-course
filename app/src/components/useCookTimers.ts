// The timers for one cook, by label. They are kept in sessionStorage
// (lib/timers.ts), so a reload or a discarded background tab does not lose
// them, and one check plays every ring: it runs on a quarter-second tick and
// again whenever the page comes back into view, so a timer that ran out while
// the phone was locked rings as soon as the cook looks again.
//
// A timer that runs out rings every RING_EVERY_MS, like a kitchen timer,
// until the cook taps the page or it has rung for RING_FOR_MS.
//
// A phone only plays sound after a tap on the page. Starting a timer is a
// tap. After a reload there has been no tap yet, so the screen asks for one,
// and a timer that runs out first rings once at that tap.

import { useEffect, useRef, useState } from 'react'
import { dueTimers, liveTimers, loadTimers, saveTimers, type Timers } from '../lib/timers'

const TICK_MS = 250
const RING_EVERY_MS = 5000
const RING_FOR_MS = 2 * 60 * 1000
/** The three beeps last about this long. */
const RING_MS = 1200

// One audio context for the page load, unlocked by the first tap that needs
// it. Kept outside the hook, so leaving cook mode for the log form and
// coming back does not lose the sound.
let sharedAudio: AudioContext | null = null

// Safari 16.4 and later: an audio session of type "playback" sounds with the
// ring switch off, as a kitchen timer app does, and pauses other audio. It is
// set for each ring and put back once the beeps end. Other browsers have no
// such switch to get past.
type AudioSessionType = 'auto' | 'playback'
const audioSession = (navigator as Navigator & { audioSession?: { type: AudioSessionType } }).audioSession

function ring(audio: AudioContext) {
  if (audioSession !== undefined) {
    audioSession.type = 'playback'
    window.setTimeout(() => {
      audioSession.type = 'auto'
    }, RING_MS)
  }
  for (const offset of [0, 0.4, 0.8]) {
    const oscillator = audio.createOscillator()
    const gain = audio.createGain()
    // A square wave carries over a range hood far better than a sine.
    oscillator.type = 'square'
    oscillator.frequency.value = 880
    gain.gain.value = 0.35
    oscillator.connect(gain).connect(audio.destination)
    oscillator.start(audio.currentTime + offset)
    oscillator.stop(audio.currentTime + offset + 0.25)
  }
}

/** The ring is over for these labels. */
function ended(timers: Timers, labels: readonly string[]): Timers {
  return Object.fromEntries(
    Object.entries(timers).map(([label, timer]) => [label, labels.includes(label) ? { ...timer, rang: true } : timer]),
  )
}

export function useCookTimers(recipeId: string) {
  const [timers, setTimers] = useState<Timers>(() => loadTimers(sessionStorage, recipeId, Date.now()))
  const [now, setNow] = useState(() => Date.now())
  const [soundOn, setSoundOn] = useState(sharedAudio !== null)
  const [soundError, setSoundError] = useState<string | null>(null)
  // The tick reads the latest timers without restarting itself on every change.
  const latest = useRef(timers)
  // When the last ring played, and when each timer's ringing began, on this page load.
  const lastRing = useRef(0)
  const ringingSince = useRef(new Map<string, number>())

  useEffect(() => {
    latest.current = timers
    saveTimers(sessionStorage, recipeId, timers)
  }, [recipeId, timers])

  useEffect(() => {
    // A phone suspends audio while the page is hidden; wake it, and ring only
    // if a timer still wants it by then: a tap may have stopped it meanwhile.
    function ringWhenAwake(audio: AudioContext) {
      audio
        .resume()
        .then(() => {
          const at = Date.now()
          if (dueTimers(liveTimers(latest.current, at), at).length > 0) ring(audio)
        })
        .catch((cause: Error) => setSoundError(cause.message))
    }
    function check() {
      const at = Date.now()
      setNow(at)
      const current = latest.current
      const live = liveTimers(current, at)
      const audio = sharedAudio
      // With no sound yet, a timer that ran out waits for the tap.
      const due = audio === null ? [] : dueTimers(live, at)
      for (const label of due) if (!ringingSince.current.has(label)) ringingSince.current.set(label, at)
      const over = due.filter((label) => at - (ringingSince.current.get(label) ?? at) >= RING_FOR_MS)
      if (audio !== null && due.length > over.length && at - lastRing.current >= RING_EVERY_MS) {
        lastRing.current = at
        ringWhenAwake(audio)
      }
      if (over.length === 0 && Object.keys(live).length === Object.keys(current).length) return
      const next = ended(live, over)
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
  const waiting = Object.values(timers).some((timer) => !timer.rang)
  useEffect(() => {
    if (!waiting) return
    function onTap() {
      const audio = (sharedAudio ??= new AudioContext())
      setSoundOn(true)
      const at = Date.now()
      const due = dueTimers(liveTimers(latest.current, at), at)
      // A timer that ran out before the sound was on has not been heard yet: once, now.
      const unheard = due.some((label) => !ringingSince.current.has(label))
      audio
        .resume()
        .then(() => {
          if (unheard) ring(audio)
        })
        .catch((cause: Error) => setSoundError(cause.message))
      if (due.length === 0) return
      lastRing.current = at
      const next = ended(latest.current, due)
      latest.current = next
      setTimers(next)
    }
    document.addEventListener('pointerdown', onTap)
    return () => document.removeEventListener('pointerdown', onTap)
  }, [waiting])

  function secondsLeft(label: string): number | null {
    const timer = timers[label]
    return timer === undefined ? null : Math.max(0, Math.ceil((timer.endsAt - now) / 1000))
  }

  return {
    /** Labels of the timers, finished or not. */
    labels: Object.keys(timers),
    secondsLeft,
    /** A timer is counting down. */
    running: Object.keys(timers).some((label) => (secondsLeft(label) ?? 0) > 0),
    /** A timer will need to ring, and no tap has turned the sound on since the page loaded. */
    needsTap: waiting && !soundOn,
    /** Why the phone would not play the ring, if it would not. */
    soundError,
    start(label: string, seconds: number) {
      // Created on this tap, which is what lets the phone play the ring later.
      sharedAudio ??= new AudioContext()
      setSoundOn(true)
      ringingSince.current.delete(label)
      setTimers((previous) => ({ ...previous, [label]: { endsAt: Date.now() + seconds * 1000, rang: false } }))
    },
    stop(label: string) {
      ringingSince.current.delete(label)
      setTimers((previous) => Object.fromEntries(Object.entries(previous).filter(([key]) => key !== label)))
    },
  }
}
