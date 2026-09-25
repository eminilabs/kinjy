import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BarChart3, Coffee, HeartPulse, Leaf, ShieldCheck, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const SNAP: [number, number, number, number] = [0.34, 1.56, 0.64, 1]

const SESSION_BARS = [3, 5, 4, 7, 6, 9, 8, 10, 9, 12, 11, 14] // minutes per 5-min bucket

const MODE_TIME = [
  { mode: 'For You', mins: 18, color: '#D9A648' },
  { mode: 'Watch', mins: 12, color: '#4A52E0' },
  { mode: 'Deep Reads', mins: 7, color: '#8FB8E8' },
  { mode: 'Family First', mins: 5, color: '#3FB27F' },
]

function BalanceRing({ score }: { score: number }) {
  const R = 30
  const C = 2 * Math.PI * R
  return (
    <div className="relative h-20 w-20" role="img" aria-label={`Balance score ${score} out of 100`}>
      <svg viewBox="0 0 72 72" className="h-full w-full -rotate-90">
        <circle cx="36" cy="36" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
        <motion.circle
          cx="36" cy="36" r={R} fill="none"
          stroke="#3FB27F" strokeWidth="5" strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          whileInView={{ strokeDashoffset: C * (1 - score / 100) }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
        />
      </svg>
      <span className="mono-data absolute inset-0 flex flex-col items-center justify-center text-sm text-success">
        {score}
        <span className="text-[0.55rem] font-semibold uppercase tracking-wider text-text-low">/ 100</span>
      </span>
    </div>
  )
}

/** A7 — opt-in wellbeing & session intelligence: insight, gentle nudge, mini dashboard. */
export default function WellbeingPanel() {
  const [optedIn, setOptedIn] = useState(false)
  const [action, setAction] = useState<'positive' | 'break' | null>(null)

  return (
    <section className="noise-overlay relative bg-ink-2/30 px-6 py-24 md:py-28">
      <div className="mx-auto max-w-container">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-12 max-w-2xl"
        >
          <p className="eyebrow text-gold">Wellbeing &amp; session intelligence</p>
          <h3 className="h3 mt-3 font-display text-3xl font-medium">
            Nudges, not penalties. <span className="text-gold-grad">Yours alone.</span>
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-text-mid">
            Kinjy notices session patterns and gently offers a change of pace — never a lock-out, never a
            lecture. Everything below is private to the member and off by default.
          </p>
        </motion.div>

        {/* opt-in switch */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.5, ease: EASE }}
          className="cloud-card mb-8 flex flex-wrap items-center gap-4 p-5"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-success/15 text-success">
            <HeartPulse size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-text-hi">Wellbeing insights</p>
            <p className="text-xs text-text-mid">Opt-in · processed on-device · you can turn it off anytime</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={optedIn}
            aria-label="Enable wellbeing insights"
            onClick={() => setOptedIn((v) => !v)}
            className={cn(
              'relative h-7 w-12 rounded-full transition-colors duration-300',
              optedIn ? 'bg-gradient-to-br from-gold-soft to-gold' : 'bg-white/15',
            )}
          >
            <motion.span
              layout="position"
              transition={{ duration: 0.25, ease: SNAP }}
              className={cn(
                'absolute top-1 h-5 w-5 rounded-full bg-ink shadow',
                optedIn ? 'end-1' : 'start-1 bg-text-mid',
              )}
            />
          </button>
        </motion.div>

        <AnimatePresence mode="wait" initial={false}>
          {!optedIn ? (
            <motion.div
              key="off"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="cloud-card flex items-center gap-4 border-dashed p-8 text-center"
            >
              <ShieldCheck size={22} className="shrink-0 text-text-low" aria-hidden="true" />
              <p className="text-start text-sm leading-relaxed text-text-low">
                Insights are off. Kinjy tracks nothing about your session rhythm until you ask it to —
                flip the switch above to preview the member experience.
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="on"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="grid gap-6 lg:grid-cols-5"
            >
              {/* session insight + intervention */}
              <div className="flex flex-col gap-6 lg:col-span-3">
                <div className="cloud-card p-5">
                  <p className="mb-3 flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-sky">
                    <BarChart3 size={12} aria-hidden="true" /> Session pattern · today
                  </p>
                  <div className="flex items-end gap-1.5" aria-hidden="true">
                    {SESSION_BARS.map((h, i) => (
                      <motion.span
                        key={i}
                        initial={{ scaleY: 0 }}
                        whileInView={{ scaleY: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.05, duration: 0.5, ease: EASE }}
                        style={{ height: `${h * 5}px`, transformOrigin: 'bottom' }}
                        className={cn('w-full rounded-t-sm', i >= 8 ? 'bg-warning/70' : 'bg-indigo/60')}
                      />
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-text-hi">
                    <span className="mono-data font-semibold text-gold-soft">42 min</span> of continuous
                    scrolling — longer than your usual evening session.
                  </p>
                </div>

                {/* gentle intervention */}
                <motion.div
                  initial={{ opacity: 0, y: 18, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.25, duration: 0.5, ease: SNAP }}
                  className="rounded-card-lg border border-gold/30 bg-gold/[0.07] p-5"
                >
                  <p className="flex items-center gap-2 text-sm font-bold text-text-hi">
                    <Leaf size={15} className="text-gold-soft" aria-hidden="true" /> A gentle suggestion
                  </p>
                  <p className="mt-1.5 text-xs leading-relaxed text-text-mid">
                    No pressure — your feed, your call. Would a different pace feel good right now?
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2.5">
                    <motion.button
                      type="button"
                      onClick={() => setAction('positive')}
                      whileTap={{ scale: 0.96 }}
                      aria-pressed={action === 'positive'}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-colors',
                        action === 'positive'
                          ? 'bg-gradient-to-br from-gold-soft to-gold text-ink'
                          : 'border border-gold/40 bg-gold/10 text-gold-soft hover:bg-gold/20',
                      )}
                    >
                      <Sun size={13} aria-hidden="true" /> Switch to Positive Content
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => setAction('break')}
                      whileTap={{ scale: 0.96 }}
                      aria-pressed={action === 'break'}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-colors',
                        action === 'break'
                          ? 'bg-gradient-to-br from-gold-soft to-gold text-ink'
                          : 'cloud-glass text-text-mid hover:text-gold-soft',
                      )}
                    >
                      <Coffee size={13} aria-hidden="true" /> Take a 10-min break
                    </motion.button>
                  </div>
                  <AnimatePresence>
                    {action && (
                      <motion.p
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35, ease: EASE }}
                        className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-success"
                        role="status"
                      >
                        <ShieldCheck size={13} aria-hidden="true" />
                        {action === 'positive'
                          ? 'Positive Content active — your feed rebalanced. Change back anytime.'
                          : 'Break noted — we’ll hold your place and quiet notifications for 10 minutes.'}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              </div>

              {/* mini dashboard */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-10%' }}
                transition={{ delay: 0.15, duration: 0.6, ease: EASE }}
                className="cloud-card flex flex-col gap-5 p-5 lg:col-span-2"
              >
                <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-gold">
                  Your balance · this week
                </p>
                <div className="flex items-center gap-5">
                  <BalanceRing score={82} />
                  <p className="flex-1 text-xs leading-relaxed text-text-mid">
                    A healthy mix of connection, learning and entertainment. Up 6 points from last week.
                  </p>
                </div>
                <div className="flex flex-col gap-2.5">
                  {MODE_TIME.map((m, i) => (
                    <div key={m.mode}>
                      <div className="mb-1 flex items-baseline justify-between">
                        <span className="text-xs font-semibold text-text-hi">{m.mode}</span>
                        <span className="mono-data text-[0.7rem] text-text-low">{m.mins}m</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <motion.span
                          initial={{ scaleX: 0 }}
                          whileInView={{ scaleX: m.mins / 18 }}
                          viewport={{ once: true }}
                          transition={{ delay: 0.2 + i * 0.1, duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
                          style={{ background: m.color, transformOrigin: 'left' }}
                          className="block h-full w-full rounded-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="border-t border-white/10 pt-3 text-[0.68rem] leading-relaxed text-text-low">
                  Private by design: these numbers never leave your device and are never used for ranking or ads.
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
