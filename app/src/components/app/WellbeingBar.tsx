import { useEffect, useRef, useState } from 'react'
import { Timer, X } from 'lucide-react'
import { Link } from 'react-router'
import { kaluta, type WellbeingStatus } from '@/lib/api'

/** How often the tab reports in. Matches the server's cap for a first beat. */
const BEAT_MS = 60_000

/**
 * Daily time limit (blueprint §Wellbeing).
 *
 * Two decisions worth stating:
 *
 * 1. The clock only runs while the tab is **visible**. A forgotten tab in the
 *    background is not time spent, and counting it would make the limit fire
 *    on a day the member barely opened the app.
 * 2. The count lives on the server. This component only reports elapsed time
 *    and displays what comes back — a counter in localStorage is undone by a
 *    reload, a second tab, or clearing site data, which turns a limit into a
 *    suggestion.
 *
 * When the limit is reached this is a notice, not a lock. The blueprint asks
 * the platform to tell the truth about attention, not to seize the session.
 */
export default function WellbeingBar() {
  const [status, setStatus] = useState<WellbeingStatus | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const lastBeat = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const beat = async () => {
      if (document.visibilityState !== 'visible') {
        // Stop the clock rather than banking the gap: the next beat measures
        // from now, so time in another tab is not charged to this member.
        lastBeat.current = null
        return
      }
      const now = Date.now()
      const minutes = lastBeat.current === null ? 0 : (now - lastBeat.current) / 60_000
      lastBeat.current = now
      try {
        const next = await kaluta.account.wellbeingBeat(Math.min(10, Math.max(0, minutes)))
        if (!cancelled) setStatus(next)
      } catch {
        // A failed beat is not worth a message; the next one carries the time.
      }
    }

    // Read the current standing first, so a member who already crossed the
    // limit earlier today sees it immediately instead of a minute from now.
    kaluta.account
      .wellbeing()
      .then((initial) => !cancelled && setStatus(initial))
      .catch(() => undefined)

    beat()
    const timer = window.setInterval(beat, BEAT_MS)
    document.addEventListener('visibilitychange', beat)
    return () => {
      cancelled = true
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', beat)
    }
  }, [])

  if (!status?.enabled || !status.over_limit || dismissed) return null

  return (
    <div
      role="status"
      className="border-b border-gold/25 bg-gold/10 px-4 py-2 text-center text-xs text-text-hi"
    >
      <span className="inline-flex flex-wrap items-center justify-center gap-1.5">
        <Timer size={13} aria-hidden="true" className="text-gold-soft" />
        You have passed your daily limit of {status.limit_minutes} minutes
        <span className="mono-data text-text-mid">({Math.round(status.minutes_today)} min today)</span>
        <Link to="/dashboard?tab=experience" className="font-semibold text-gold-soft hover:underline">
          Adjust it
        </Link>
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss for now"
        className="ms-2 align-middle text-text-low transition-colors hover:text-text-hi"
      >
        <X size={13} aria-hidden="true" />
      </button>
    </div>
  )
}
