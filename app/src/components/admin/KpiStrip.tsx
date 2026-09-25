import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { TrendingUp, TrendingDown, Check, Users, Wallet, BookCheck, Radar } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Kpi {
  icon: typeof Users
  label: string
  value: number
  prefix?: string
  suffix?: string
  decimals: number
  delta?: string
  deltaUp?: boolean
  steady?: string
}

const KPIS: Kpi[] = [
  { icon: Users, label: 'Members', value: 2.4, suffix: 'M', decimals: 1, delta: '4.2%', deltaUp: true },
  { icon: Wallet, label: 'Monthly creator payouts', value: 1.8, prefix: '$', suffix: 'M', decimals: 1, delta: '6.1%', deltaUp: true },
  { icon: BookCheck, label: 'Ledger reconciliation', value: 100, suffix: '%', decimals: 0, steady: '✓ reconciled' },
  { icon: Radar, label: 'Open fraud reviews', value: 37, decimals: 0, delta: '12%', deltaUp: false },
]

/** KpiStrip — 4 KPI stat cards with mono-data numerals that count up (GSAP, 900ms, 0.1s stagger). */
export default function KpiStrip() {
  const scope = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const numerals = gsap.utils.toArray<HTMLElement>('[data-count]')
      numerals.forEach((el, i) => {
        const target = Number(el.dataset.count)
        const decimals = Number(el.dataset.decimals ?? 0)
        if (reduce) {
          el.textContent = target.toFixed(decimals)
          return
        }
        const state = { v: 0 }
        gsap.to(state, {
          v: target,
          duration: 0.9,
          delay: 0.3 + i * 0.1,
          ease: 'power2.out',
          onUpdate: () => {
            el.textContent = state.v.toFixed(decimals)
          },
        })
      })
    },
    { scope },
  )

  return (
    <div ref={scope} className="grid grid-cols-2 gap-3 p-5 lg:grid-cols-4">
      {KPIS.map((kpi) => (
        <div
          key={kpi.label}
          className="rounded-card-md border border-white/8 bg-ink-3/70 px-4 py-4"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="caption uppercase tracking-[0.14em]">{kpi.label}</p>
            <kpi.icon size={16} className="shrink-0 text-text-low" aria-hidden="true" />
          </div>
          <p className="mono-data mt-2 text-2xl font-semibold text-text-hi">
            {kpi.prefix}
            <span data-count={kpi.value} data-decimals={kpi.decimals}>
              0
            </span>
            {kpi.suffix}
          </p>
          <div className="mt-2">
            {kpi.steady ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[0.7rem] font-semibold text-success">
                <Check size={11} aria-hidden="true" /> {kpi.steady}
              </span>
            ) : (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.7rem] font-semibold',
                  kpi.deltaUp
                    ? 'border-success/30 bg-success/10 text-success'
                    : 'border-sky/30 bg-sky/10 text-sky',
                )}
              >
                {kpi.deltaUp ? (
                  <TrendingUp size={11} aria-hidden="true" />
                ) : (
                  <TrendingDown size={11} aria-hidden="true" />
                )}
                {kpi.deltaUp ? '▲' : '▼'} {kpi.delta}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
