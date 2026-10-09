import { useEffect, useState } from 'react'
import { Clock, Gavel } from 'lucide-react'
import type { EscrowTerms } from '@/lib/api'
import { cn } from '@/lib/utils'
import { parseTs, type DisputeView } from './DisputeModel'

const DAY = 86_400_000

/** Ticks once a minute: the display has no seconds, so faster would only burn battery. */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  return now
}

function split(ms: number) {
  const minutes = Math.max(0, Math.floor(ms / 60_000))
  return { d: Math.floor(minutes / 1440), h: Math.floor((minutes % 1440) / 60), m: minutes % 60 }
}

export default function DisputeCountdown({
  dispute,
  terms,
  viewerIsRespondent,
}: {
  dispute: DisputeView
  terms: EscrowTerms | null
  viewerIsRespondent: boolean
}) {
  const now = useNow()
  // Server-computed seconds are only a fallback: they are stale the moment they land.
  const [loadedAt] = useState(() => Date.now())

  if (dispute.status === 'resolved' || dispute.status === 'withdrawn') return null

  if (dispute.status === 'arbitration') {
    return (
      <section className="cloud-card flex items-start gap-3 p-4">
        <Gavel size={18} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-text-hi">With Kinjy arbitration</p>
          <p className="caption mt-1">
            Kinjy is reviewing both sides and the evidence. You can still add messages and photos until a decision is made.
          </p>
        </div>
      </section>
    )
  }

  const responding = dispute.status === 'open'
  const iso = responding ? dispute.respond_by : dispute.arbitrate_by
  const secs = responding ? dispute.seconds_left_to_respond : dispute.seconds_left_to_arbitrate
  const deadline = parseTs(iso) ?? (secs != null ? loadedAt + secs * 1000 : null)
  if (deadline === null) return null

  const left = deadline - now
  const { d, h, m } = split(left)
  const urgent = left < DAY
  const label = responding ? 'Time left to respond' : 'Time left before arbitration'

  const days = terms?.arbitration_days
  const what = responding
    ? viewerIsRespondent
      ? 'If you have not answered by then, the case moves to Kinjy arbitration.'
      : 'If the other side has not answered by then, the case moves to Kinjy arbitration.'
    : `If you cannot agree by then, Kinjy arbitration decides${days ? ` (within ${days} days of the case opening)` : ''}.`

  return (
    <section
      className={cn(
        'cloud-card p-4',
        urgent && 'border-amber-400/35 bg-amber-400/[0.06]',
      )}
    >
      <p className={cn('flex items-center gap-1.5 text-xs font-semibold', urgent ? 'text-amber-200' : 'text-text-mid')}>
        <Clock size={14} aria-hidden="true" />
        {label}
      </p>
      <p
        className={cn('mono-data mt-2 text-2xl', urgent ? 'text-amber-200' : 'text-gold-soft')}
        role="timer"
        aria-label={left <= 0 ? 'Time is up' : `${d} days ${h} hours ${m} minutes left`}
      >
        {left <= 0 ? (
          'Time is up'
        ) : (
          <>
            {d}
            <span className="caption mx-1">d</span>
            {h}
            <span className="caption mx-1">h</span>
            {m}
            <span className="caption ms-1">min</span>
          </>
        )}
      </p>
      <p className="caption mt-2">{what}</p>
    </section>
  )
}
