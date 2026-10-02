import { useEffect, useRef } from 'react'

/**
 * Call `fn` every `ms` while the page is in front, and once on coming back to it
 * if that much time has passed.
 *
 * Every picture, voice recording and document on a memorial is fetched with a
 * ticket that lasts five minutes. A memorial page is exactly the kind left open
 * — on a phone, beside a grave, while the family reads — and a ticket that ran
 * out turns the next image or the next press of play into an error. Re-reading
 * the memorial a little before they expire keeps the links alive.
 */
export function useEvery(fn: () => void, ms: number) {
  const latest = useRef(fn)
  useEffect(() => {
    latest.current = fn
  })

  useEffect(() => {
    let last = Date.now()
    const run = () => {
      last = Date.now()
      latest.current()
    }
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') run()
    }, ms)
    // Timers in a hidden tab are slowed or stopped, so catch up on return.
    const back = () => {
      if (document.visibilityState === 'visible' && Date.now() - last >= ms) run()
    }
    document.addEventListener('visibilitychange', back)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', back)
    }
  }, [ms])
}

/** Four minutes: inside the five a media ticket lives. */
export const TICKET_REFRESH_MS = 4 * 60 * 1000
