import { motion } from 'framer-motion'
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Flame,
  HandHelping,
  MessageSquareWarning,
  TrendingDown,
} from 'lucide-react'
import { EASE, useReducedMotion } from './motion-utils'

/** 14-day sentiment-drift sparkline points (0–100 scale, higher = healthier). */
const SENTIMENT = [72, 74, 73, 70, 71, 68, 66, 64, 61, 58, 55, 52, 49, 46]

function sparkPath(values: number[], w: number, h: number, pad = 4) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const step = (w - pad * 2) / (values.length - 1)
  return values
    .map((v, i) => {
      const x = pad + i * step
      const y = h - pad - ((v - min) / (max - min)) * (h - pad * 2)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

const WEEK_SUMMARY = [
  { label: 'Threads auto-de-escalated', value: '312' },
  { label: 'Guide interventions accepted', value: '87%' },
  { label: 'Median dispute resolution', value: '3.2h' },
  { label: 'Community health index', value: 'B+ ↑' },
]

/**
 * EarlyWarningSystem — moderator dashboard card (A9): sentiment-drift sparkline,
 * dispute-escalation prediction with recommended action, and a weekly
 * community-health summary preview.
 */
export default function EarlyWarningSystem() {
  const reduced = useReducedMotion()
  const path = sparkPath(SENTIMENT, 260, 72)

  return (
    <section aria-labelledby="early-warning-heading" className="noise-overlay twilight-field px-6 py-24">
      <div className="mx-auto max-w-container">
        <div className="max-w-2xl">
          <p className="eyebrow text-sky">Community Early-Warning System</p>
          <h2 id="early-warning-heading" className="h2 mt-3">
            Moderators see the storm <span className="font-display italic text-gold-grad">before it breaks.</span>
          </h2>
          <p className="body-lg mt-4 text-text-mid">
            Kinjy watches the drift, not just the incident. Sentiment trends and escalation
            predictions give community guides time to help — before a thread needs a takedown.
          </p>
        </div>

        {/* Moderator dashboard card */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.7, ease: EASE }}
          className="cloud-card mt-14 overflow-hidden"
        >
          {/* Dashboard chrome */}
          <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo/25">
              <Activity size={15} className="text-sky" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold text-text-hi">Moderator dashboard</p>
              <p className="caption">Mwanza Fishing Community · 4,218 members</p>
            </div>
            <span className="mono-data ml-auto rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-[0.65rem] uppercase tracking-wider text-success">
              Live preview
            </span>
          </div>

          <div className="grid gap-5 p-5 lg:grid-cols-3">
            {/* Sentiment-drift sparkline */}
            <div className="rounded-card-md border border-white/10 bg-ink-3/60 p-4">
              <p className="mono-data flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wider text-text-low">
                <TrendingDown size={12} className="text-warning" aria-hidden="true" /> Sentiment drift · 14 days
              </p>
              <svg
                viewBox="0 0 260 72"
                className="mt-3 w-full"
                role="img"
                aria-label="Sparkline: community sentiment declining from 72 to 46 over 14 days"
              >
                <defs>
                  <linearGradient id="sentiment-stroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3FB27F" />
                    <stop offset="55%" stopColor="#E0A33E" />
                    <stop offset="100%" stopColor="#DE5C5C" />
                  </linearGradient>
                </defs>
                {[18, 36, 54].map((y) => (
                  <line key={y} x1="0" y1={y} x2="260" y2={y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                ))}
                <motion.path
                  d={path}
                  fill="none"
                  stroke="url(#sentiment-stroke)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  initial={reduced ? false : { pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
                />
                <circle cx="256" cy="68" r="3.5" fill="#DE5C5C" />
              </svg>
              <div className="mono-data mt-2 flex justify-between text-[0.68rem] text-text-low">
                <span>72 → 46 index</span>
                <span className="text-danger">−36%</span>
              </div>
              <p className="caption mt-2">
                Tone in the community is cooling fast — a reliable precursor to disputes.
              </p>
            </div>

            {/* Escalation prediction */}
            <div className="rounded-card-md border border-warning/35 bg-warning/[0.06] p-4">
              <p className="mono-data flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wider text-text-low">
                <Flame size={12} className="text-warning" aria-hidden="true" /> Escalation prediction
              </p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-3xl text-warning">80%</span>
                <span className="text-sm text-text-mid">likely to need intervention</span>
              </div>
              <p className="mt-2 text-sm font-semibold text-text-hi">
                <MessageSquareWarning size={14} className="me-1 inline text-warning" aria-hidden="true" />
                Thread #4821 — “Boat permit fees”
              </p>
              {/* probability meter */}
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-warning to-danger"
                  initial={reduced ? false : { width: 0 }}
                  whileInView={{ width: '80%' }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1], delay: 0.25 }}
                />
              </div>
              <div className="mt-4 rounded-card-sm border border-white/10 bg-ink-3/70 p-3">
                <p className="mono-data flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wider text-sky">
                  <HandHelping size={11} aria-hidden="true" /> Recommended action
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-text-hi">
                  Suggest a 30-minute cooling period and loop in two community guides — no removals
                  needed yet.
                </p>
                <button
                  type="button"
                  className="mono-data mt-3 inline-flex items-center gap-1.5 rounded-full border border-gold/40 px-3 py-1.5 text-[0.7rem] font-semibold text-gold-soft transition-colors duration-200 ease-cloud-ease hover:bg-gold/10"
                >
                  Apply suggestion <ArrowRight size={12} aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Weekly community-health summary */}
            <div className="rounded-card-md border border-white/10 bg-ink-3/60 p-4">
              <p className="mono-data flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wider text-text-low">
                <CalendarDays size={12} className="text-gold" aria-hidden="true" /> Weekly health summary
              </p>
              <ul className="mt-3 space-y-2.5">
                {WEEK_SUMMARY.map((row, i) => (
                  <motion.li
                    key={row.label}
                    initial={reduced ? false : { opacity: 0, x: 12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.45, delay: 0.15 + i * 0.08, ease: EASE }}
                    className="flex items-baseline justify-between gap-3 border-b border-white/8 pb-2 last:border-0 last:pb-0"
                  >
                    <span className="text-[0.8rem] text-text-mid">{row.label}</span>
                    <span className="mono-data text-[0.8rem] text-gold-soft">{row.value}</span>
                  </motion.li>
                ))}
              </ul>
              <p className="caption mt-3">
                Every member gets this same summary — community health is public, not a moderator
                secret.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
