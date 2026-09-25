import { motion, useReducedMotion } from 'framer-motion'
import { Gauge as GaugeIcon, Package } from 'lucide-react'
import { Chip, SubSection } from './primitives'

interface Vital {
  name: string
  value: string
  budget: string
  pct: number // 0..1 of budget consumed
  tone: 'success' | 'warning' | 'danger'
}

const VITALS: Vital[] = [
  { name: 'LCP', value: '2.1s', budget: '≤ 2.5s', pct: 0.84, tone: 'success' },
  { name: 'INP', value: '180ms', budget: '≤ 200ms', pct: 0.9, tone: 'success' },
  { name: 'CLS', value: '0.04', budget: '≤ 0.10', pct: 0.4, tone: 'success' },
]

const TONE_STROKE: Record<Vital['tone'], string> = {
  success: '#3FB27F',
  warning: '#E0A33E',
  danger: '#DE5C5C',
}

/** Semicircle gauge for one Core Web Vital. */
function VitalGauge({ v, delay }: { v: Vital; delay: number }) {
  const reduceMotion = useReducedMotion()
  const r = 40
  const c = Math.PI * r // semicircle arc length
  return (
    <div className="flex flex-col items-center rounded-card-md border border-white/8 bg-ink-3/50 p-4">
      <svg viewBox="0 0 100 58" className="w-full max-w-[140px]" role="img" aria-label={`${v.name} ${v.value} against budget ${v.budget}`}>
        <path d="M10 54 A 40 40 0 0 1 90 54" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="7" strokeLinecap="round" />
        <motion.path
          d="M10 54 A 40 40 0 0 1 90 54"
          fill="none"
          stroke={TONE_STROKE[v.tone]}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduceMotion ? { strokeDashoffset: c * (1 - v.pct) } : { strokeDashoffset: c }}
          whileInView={{ strokeDashoffset: c * (1 - v.pct) }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay, ease: [0.65, 0, 0.35, 1] }}
        />
      </svg>
      <p className="mono-data -mt-7 text-lg text-text-hi">{v.value}</p>
      <p className="mono-data mt-1 text-[0.68rem] uppercase tracking-[0.14em] text-text-low">
        {v.name} · budget {v.budget}
      </p>
      <Chip tone={v.tone} className="mt-2">within budget</Chip>
    </div>
  )
}

/**
 * PerformanceBudgets (C5) — Core Web Vitals dashboard with budget gauges and the
 * bundle-size budget bar, including the code-splitting target.
 */
export default function PerformanceBudgets() {
  const reduceMotion = useReducedMotion()
  return (
    <SubSection
      id="performance-budgets"
      eyebrow="C5 · Performance Budgets"
      title={
        <>
          <GaugeIcon size={19} className="me-2 inline text-gold" aria-hidden="true" />
          Fast is a feature with a budget.
        </>
      }
      blurb="Core Web Vitals and bundle size are enforced budgets, measured on real devices in CI. A route that blows its budget fails the build — the same way a failing unit test does."
    >
      {/* Vitals gauges */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {VITALS.map((v, i) => (
          <VitalGauge key={v.name} v={v} delay={i * 0.12} />
        ))}
      </div>

      {/* Bundle-size budget bar */}
      <div className="mt-4 rounded-card-md border border-white/8 bg-ink-3/50 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="caption flex items-center gap-2 font-bold uppercase tracking-[0.14em] text-text-mid">
            <Package size={13} className="text-gold" aria-hidden="true" /> JS bundle budget · initial route
          </p>
          <p className="mono-data text-[0.72rem] text-text-low">budget: 1.8MB gzipped</p>
        </div>

        <div className="relative mt-5 h-3 rounded-full bg-white/8">
          {/* current */}
          <motion.div
            className="absolute inset-y-0 start-0 rounded-full bg-gradient-to-r from-warning/80 to-warning"
            initial={reduceMotion ? { width: '83%' } : { width: 0 }}
            whileInView={{ width: '83%' }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
          />
          {/* target after code-splitting */}
          <motion.div
            className="absolute inset-y-0 start-0 rounded-full bg-gradient-to-r from-success/70 to-success"
            initial={reduceMotion ? { width: '50%' } : { width: 0 }}
            whileInView={{ width: '50%' }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, delay: 0.25, ease: [0.65, 0, 0.35, 1] }}
          />
          {/* budget marker */}
          <div className="absolute inset-y-[-5px] end-0 w-[2px] rounded bg-danger" aria-hidden="true" />
        </div>
        <div className="mono-data mt-2 flex flex-wrap justify-between gap-2 text-[0.7rem]">
          <span className="text-success">target after code-splitting: 0.9MB</span>
          <span className="text-warning">current: 1.5MB</span>
          <span className="text-danger">budget: 1.8MB</span>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-card-sm border border-white/8 bg-ink-2 p-3.5">
            <p className="mono-data text-[0.72rem] leading-relaxed text-text-mid">
              <span className="text-gold-soft">route-level lazy-loading:</span> every module (Family Tree, Graveyard,
              Marketplace, Admin) loads its own chunk; the admin console splits again at section boundaries.
            </p>
          </div>
          <div className="rounded-card-sm border border-white/8 bg-ink-2 p-3.5">
            <p className="mono-data text-[0.72rem] leading-relaxed text-text-mid">
              <span className="text-sky">enforced in CI:</span> vite bundle report diffed per PR — a regression &gt;
              50KB on the initial route blocks merge, no exceptions.
            </p>
          </div>
        </div>
      </div>
    </SubSection>
  )
}
