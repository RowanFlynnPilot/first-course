// The timers for one cook. They are kept in sessionStorage (lib/timers.ts),
// so a reload or a discarded background tab does not lose them, and one check
// plays every chime: it runs on a quarter-second tick and again whenever the
// page comes back into view, so a timer that ran out while the phone was
// locked chimes as soon as the cook looks again.
//
// A phone only plays sound after a tap on the page. Starting a timer is a
// tap. After a reload there has been no tap yet, so the screen asks for one,
// and a timer that runs out first waits for it before chiming.

import { useEffect, useRef, useState } from 'react'
import { dueTimers, liveTimers, loadTimers, saveTimers, type Timers } from '../lib/timers'

const TICK_MS = 250

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

export function useCookTimers(recipeId: string) {
  const [timers, setTimers] = useState<Timers>(() => loadTimers(sessionStorage, recipeId, Date.now()))
  const [now, setNow] = useState(() => Date.now())
  const [soundOn, setSoundOn] = useState(false)
  const audio = useRef<AudioContext | null>(null)
  // The tick reads the latest timers without restarting itself on every change.
  const latest = useRef(timers)

  useEffect(() => {
    latest.current = timers
    saveTimers(sessionStorage, recipeId, timers)
  }, [recipeId, timers])

  useEffect(() => {
    function check() {
      const at = Date.now()
      setNow(at)
      const current = latest.current
      const live = liveTimers(current, at)
      const context = audio.current
      const due = context === null ? [] : dueTimers(live, at)
      // A phone suspends audio while the page is hidden; wake it before the chime.
      if (context !== null && due.length > 0) void context.resume().then(() => ring(context))
      if (due.length === 0 && Object.keys(live).length === Object.keys(current).length) return
      const next: Timers = Object.fromEntries(
        Object.entries(live).map(([step, timer]) => [step, due.includes(Number(step)) ? { ...timer, rang: true } : timer]),
      )
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

  // Any tap turns the sound on: the first one after a reload, or Start timer.
  const waiting = Object.values(timers).some((timer) => !timer.rang)
  useEffect(() => {
    if (soundOn || !waiting) return
    function unlock() {
      audio.current ??= new AudioContext()
      void audio.current.resume()
      setSoundOn(true)
    }
    document.addEventListener('pointerdown', unlock)
    return () => document.removeEventListener('pointerdown', unlock)
  }, [soundOn, waiting])

  function secondsLeft(step: number): number | null {
    const timer = timers[step]
    return timer === undefined ? null : Math.max(0, Math.ceil((timer.endsAt - now) / 1000))
  }

  return {
    /** Steps with a timer, finished or not. */
    steps: Object.keys(timers).map(Number),
    secondsLeft,
    /** A timer is counting down. */
    running: Object.keys(timers).some((step) => (secondsLeft(Number(step)) ?? 0) > 0),
    /** A timer will need to chime, and no tap has turned the sound on since the page loaded. */
    needsTap: waiting && !soundOn,
    start(step: number, seconds: number) {
      // Created on this tap, which is what lets the phone play the chime later.
      audio.current ??= new AudioContext()
      setSoundOn(true)
      setTimers((previous) => ({ ...previous, [step]: { endsAt: Date.now() + seconds * 1000, rang: false } }))
    },
    reset(step: number) {
      setTimers((previous) => Object.fromEntries(Object.entries(previous).filter(([key]) => Number(key) !== step)))
    },
  }
}
