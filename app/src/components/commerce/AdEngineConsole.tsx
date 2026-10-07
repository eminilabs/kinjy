import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, FlaskConical, Megaphone, Pencil, Play, Sparkles, Target, Users, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EASE, useReducedMotion } from '@/components/creators/motion-utils'

const PROMPT = 'Create a $100 campaign promoting my restaurant to people aged 25–45 within 20 km of Dar es Salaam.'
const CREATIVES = ['Sizzling grill · 15s video', 'Family table · carousel', 'Lunch offer · static']

/** Section 5 — The AI Advertising Engine: staged build behind a human approval gate. */
export default function AdEngineConsole() {
  const reduced = useReducedMotion()
  const [stage, setStage] = useState(0) // 0 idle → 1..6 built
  const [approved, setApproved] = useState(false)
  const [running, setRunning] = useState(false)
  const timers = useRef<number[]>([])

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }

  const run = useCallback(() => {
    clearTimers()
    setApproved(false)
    setRunning(true)
    setStage(0)
    for (let s = 1; s <= 6; s += 1) {
      timers.current.push(
        window.setTimeout(() => {
          setStage(s)
          if (s === 6) setRunning(false)
        }, reduced ? 60 * s : 400 * s + 200),
      )
    }
  }, [reduced])

  useEffect(() => {
    const onReplay = () => run()
    window.addEventListener('kaluta:replay-ad-engine', onReplay)
    return () => {
      window.removeEventListener('kaluta:replay-ad-engine', onReplay)
      clearTimers()
    }
  }, [run])

  const stageItem = (n: number, node: React.ReactNode) => (
    <AnimatePresence>
      {stage >= n && (
        <motion.div
          key={n}
          initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          {node}
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <section id="ad-engine" className="kl-pad-x border-t border-[var(--kl-paper-2)] py-[clamp(72px,9vw,120px)]">
      <div className="mx-auto grid max-w-container items-center gap-14 lg:grid-cols-2">
        {/* Left: backdrop + prompt console */}
        <div
          className="relative min-h-[480px] overflow-hidden rounded-[20px]"
          style={{ background: 'linear-gradient(160deg, var(--kl-stage-a), var(--kl-stage-b))' }}
        >
          <div aria-hidden="true" className="absolute -right-16 -top-20 h-[280px] w-[280px] rounded-full opacity-35 blur-[90px]" style={{ background: 'var(--kl-sky)' }} />
          <div aria-hidden="true" className="absolute -bottom-24 -left-16 h-[260px] w-[260px] rounded-full opacity-30 blur-[90px]" style={{ background: '#D9A648' }} />

          {/* map radius circle draws at stage 3 */}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 620" fill="none" aria-hidden="true">
            <motion.circle
              cx="300"
              cy="260"
              r="150"
              stroke="#D9A648"
              strokeWidth="2"
              strokeDasharray="6 8"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={stage >= 3 ? { pathLength: 1, opacity: 0.9 } : { pathLength: 0, opacity: 0 }}
              transition={{ duration: 0.8, ease: [0.65, 0, 0.35, 1] }}
            />
            <motion.circle
              cx="300"
              cy="260"
              r="150"
              fill="#D9A648"
              initial={{ opacity: 0 }}
              animate={stage >= 3 ? { opacity: 0.08 } : { opacity: 0 }}
              transition={{ duration: 0.8 }}
            />
            <motion.g
              initial={{ opacity: 0, scale: 0 }}
              animate={stage >= 3 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
              transition={{ delay: 0.4, duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
              style={{ transformOrigin: '300px 260px' }}
            >
              <circle cx="300" cy="260" r="6" fill="#B8861F" />
              <circle cx="300" cy="260" r="12" fill="none" stroke="#B8861F" strokeOpacity="0.5" />
            </motion.g>
            {stage >= 3 && (
              <text x="318" y="255" className="mono-data" fill="#B8861F" fontSize="13" fontFamily="'JetBrains Mono', monospace">
                20 km · Dar es Salaam
              </text>
            )}
          </svg>

          {/* console */}
          <div className="relative p-5 sm:p-7">
            <div className="rounded-[14px] border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--grad-orb)' }}>
                  <Sparkles size={14} className="text-[var(--kl-night)]" aria-hidden="true" />
                </span>
                <p className="flex-1 text-sm leading-relaxed text-[var(--kl-ink)]">{PROMPT}</p>
              </div>
              <button
                type="button"
                onClick={run}
                disabled={running}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#F0C878] to-[#D9A648] px-5 py-2.5 text-sm font-bold text-[var(--kl-night)] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:brightness-110 disabled:opacity-60"
              >
                <Play size={14} aria-hidden="true" />
                {running ? 'Building…' : stage > 0 ? 'Rebuild campaign' : 'Generate campaign'}
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {stageItem(1, (
                <div className="flex items-center gap-2.5 rounded-[14px] border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] px-4 py-2.5 ">
                  <Target size={15} className="text-[var(--kl-gold-deep)]" aria-hidden="true" />
                  <span className="text-xs text-[var(--kl-mid)]">Objective</span>
                  <span className="mono-data ms-auto rounded-full bg-indigo/30 px-3 py-1 text-[0.68rem] text-[#3F6FA8]">
                    Foot traffic / local awareness
                  </span>
                </div>
              ))}
              {stageItem(2, (
                <div className="rounded-[14px] border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] p-3 ">
                  <p className="mb-2 flex items-center gap-2 text-xs text-[var(--kl-mid)]">
                    <Megaphone size={14} className="text-[var(--kl-gold-deep)]" aria-hidden="true" /> Creatives — 3 variants generated
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {CREATIVES.map((c) => (
                      <div key={c} className="rounded-[14px] border border-[var(--kl-paper-2)] bg-[var(--kl-paper)] p-2">
                        <div className="mb-1.5 h-8 rounded-[6px] bg-gradient-to-br from-indigo/50 to-gold/30" aria-hidden="true" />
                        <p className="text-[0.62rem] leading-tight text-[var(--kl-mid)]">{c}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {stageItem(3, (
                <div className="flex items-center gap-2.5 rounded-[14px] border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] px-4 py-2.5 ">
                  <Users size={15} className="text-[var(--kl-gold-deep)]" aria-hidden="true" />
                  <span className="text-xs text-[var(--kl-mid)]">Audience</span>
                  <span className="mono-data ms-auto text-[0.7rem] text-[var(--kl-gold-deep)]">age 25–45 · 20 km radius</span>
                </div>
              ))}
              {stageItem(4, (
                <div className="rounded-[14px] border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] p-3.5 ">
                  <p className="mb-2 flex items-center gap-2 text-xs text-[var(--kl-mid)]">
                    <Wallet size={14} className="text-[var(--kl-gold-deep)]" aria-hidden="true" /> Budget allocation — $100
                  </p>
                  <div className="flex h-6 overflow-hidden rounded-full border border-[var(--kl-paper-2)] text-[0.62rem] font-bold">
                    <motion.div
                      className="flex items-center justify-center bg-gold text-[var(--kl-night)]"
                      initial={{ width: '0%' }}
                      animate={{ width: '70%' }}
                      transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
                    >
                      70% local posts
                    </motion.div>
                    <motion.div
                      className="flex items-center justify-center bg-indigo text-white"
                      initial={{ width: '0%' }}
                      animate={{ width: '30%' }}
                      transition={{ duration: 0.6, delay: 0.15, ease: [0.65, 0, 0.35, 1] }}
                    >
                      30% CPC
                    </motion.div>
                  </div>
                </div>
              ))}
              {stageItem(5, (
                <div className="flex items-center gap-2.5 rounded-[14px] border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] px-4 py-2.5 ">
                  <FlaskConical size={15} className="text-[var(--kl-gold-deep)]" aria-hidden="true" />
                  <span className="text-xs text-[var(--kl-mid)]">A/B test plan</span>
                  <span className="mono-data ms-auto rounded-full bg-sky/15 px-3 py-1 text-[0.68rem] text-[#3F6FA8]">
                    variant A vs B · 50/50
                  </span>
                </div>
              ))}
              {stageItem(6, (
                <div className="rounded-[14px] border border-gold/40 bg-gold/[0.08] p-4 ">
                  <p className="text-sm font-semibold text-[var(--kl-gold-deep)]">Nothing launches until you approve.</p>
                  {approved ? (
                    <motion.p
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                      className="mono-data mt-3 inline-flex items-center gap-2 rounded-full bg-gold/20 px-4 py-1.5 text-xs text-[var(--kl-gold-deep)]"
                    >
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                        className="flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[var(--kl-night)]"
                      >
                        <Check size={10} aria-hidden="true" />
                      </motion.span>
                      Campaign scheduled — toast sent to your inbox
                    </motion.p>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setApproved(true)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[#F0C878] to-[#D9A648] px-4 py-2 text-xs font-bold text-[var(--kl-night)] transition hover:brightness-110"
                      >
                        <Check size={12} aria-hidden="true" /> Approve launch
                      </button>
                      <button
                        type="button"
                        onClick={run}
                        className="inline-flex items-center gap-1.5 rounded-full rounded-[14px] border border-[var(--kl-paper-2)] bg-[var(--kl-paper)] px-4 py-2 text-xs font-semibold text-[var(--kl-ink)] transition hover:text-[var(--kl-gold-deep)]"
                      >
                        <Pencil size={12} aria-hidden="true" /> Edit
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right copy */}
        <motion.div
          initial={reduced ? false : { opacity: 0, x: 60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <p className="kl-mono text-xs uppercase tracking-[.14em] text-[var(--kl-gold-deep)] ">AI Advertising Engine</p>
          <h2 className="kl-h2 mt-5">Say it plainly. Get a campaign.</h2>
          <p className="text-[17px] leading-[1.55] mt-5 text-[var(--kl-mid)]">
            Describe your goal in one sentence. The engine drafts the objective, creatives, audience,
            budget split and test plan — then stops.
          </p>
          <ul className="mt-7 space-y-4">
            {[
              'Six staged builds, each visible and editable — no black box',
              'Audience drawn on a real map: ages 25–45, 20 km of Dar es Salaam',
              'Budget allocated across the cheapest floors first',
              'A human approval gate stands between every draft and every launch',
            ].map((b) => (
              <li key={b} className="flex items-start gap-3 text-[var(--kl-mid)]">
                <svg width="18" height="14" viewBox="0 0 18 14" className="mt-1.5 shrink-0" aria-hidden="true">
                  <path d="M1 12 Q 9 -2 17 12" fill="none" stroke="#D9A648" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                {b}
              </li>
            ))}
          </ul>
          <p className={cn('mono-data mt-6 inline-block rounded-[14px] border border-gold/25 bg-gold/[0.06] px-4 py-3 text-[var(--kl-gold-deep)]')}>
            $100 → ~200,000 local impressions or 2,000 clicks at floor
          </p>
        </motion.div>
      </div>
    </section>
  )
}
