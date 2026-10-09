import { useEffect, useState } from 'react'
import { kaluta } from '@/lib/api'
import { cn } from '@/lib/utils'

const MARKUP_PCT = 20

/** "12.5" -> 1250. Integer math only, so no float drift; null when not a price. */
export function parseCents(raw: string): number | null {
  const match = /^(\d{1,9})(?:\.(\d{0,2}))?$/.exec(raw.trim())
  if (!match) return null
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0') || 0)
  return cents > 0 ? cents : null
}

export function formatCents(cents: number): string {
  const whole = Math.floor(cents / 100).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return `$${whole}.${(cents % 100).toString().padStart(2, '0')}`
}

/** Markup is rounded down to the cent, like the backend's ROUND_DOWN. */
export function priceBreakdown(cents: number) {
  const margin = Math.floor((cents * MARKUP_PCT) / 100)
  return { ask: cents, margin, customer: cents + margin }
}

interface Props {
  /** The seller's typed price as text; the calculator parses it itself. */
  value: string
  className?: string
}

export default function MarginCalculator({ value, className }: Props) {
  const cents = parseCents(value)
  const figures = cents === null ? null : priceBreakdown(cents)
  // Server preview is only reassurance; the local figures are what is shown.
  const [mismatch, setMismatch] = useState(false)

  useEffect(() => {
    setMismatch(false)
    if (cents === null) return
    let live = true
    const timer = setTimeout(() => {
      kaluta.economy
        .marketplacePricing(`${Math.floor(cents / 100)}.${(cents % 100).toString().padStart(2, '0')}`)
        .then((server) => {
          if (!live) return
          const expected = priceBreakdown(cents)
          const serverCents = Math.round(Number(server.customer_price) * 100)
          setMismatch(Number.isFinite(serverCents) && serverCents !== expected.customer)
        })
        .catch(() => undefined)
    }, 400)
    return () => {
      live = false
      clearTimeout(timer)
    }
  }, [cents])

  return (
    <section
      aria-label="Price breakdown"
      aria-live="polite"
      className={cn('cloud-card border-gold/25 p-4', className)}
    >
      {figures === null ? (
        <p className="text-sm text-text-low">Enter your price to see what the buyer will pay.</p>
      ) : (
        <dl className="space-y-1.5 text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-text-mid">You ask</dt>
            <dd className="mono-data font-semibold text-text-hi">{formatCents(figures.ask)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-text-mid">Shown to the buyer</dt>
            <dd className="mono-data font-semibold text-gold-soft">{formatCents(figures.customer)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-text-mid">Kinjy margin ({MARKUP_PCT}%)</dt>
            <dd className="mono-data font-semibold text-text-hi">{formatCents(figures.margin)}</dd>
          </div>
          <p className="caption pt-1">It funds the affiliate commission, you never pay it. You receive exactly what you ask.</p>
        </dl>
      )}
      {mismatch && (
        <p className="mt-2 text-xs text-gold-soft">
          Kinjy's current rate differs slightly; the exact price is confirmed when you publish.
        </p>
      )}
    </section>
  )
}
