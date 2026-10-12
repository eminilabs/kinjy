import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Check, Gauge, Languages, Play, RotateCcw, Sparkles, TrendingDown } from 'lucide-react'
import { KlButton } from '@/components/landing/PageKit'
import { cn } from '@/lib/utils'
import { EASE, useReducedMotion } from '@/components/creators/motion-utils'

const VARIANTS = [
  {
    id: 'A',
    copy: 'Three days at the loom. One basket that outlives the trend. Neema Crafts — woven, not manufactured.',
    score: 87,
    tone: 'heritage · editorial',
  },
  {
    id: 'B',
    copy: 'Your Sunday market find, delivered. Hand-woven in Arusha, $24, ships this week.',
    score: 74,
    tone: 'direct · warm',
  },
  {
    id: 'C',
    copy: 'The basket your grandmother would approve of. Natural dyes, honest price, maker paid fairly.',
    score: 91,
    tone: 'family · playful',
  },
]

const DECAY = [22, 21, 20, 18, 15, 12, 10, 8, 6, 5, 4, 3]

const LANGUAGES = [
  { code: 'SW', name: 'Kiswahili', sample: 'Yakutwa kwa mikono Arusha' },
  { code: 'FR', name: 'Français', sample: 'Tissé à la main à Arusha' },
  { code: 'AR', name: 'العربية', sample: 'منسوج يدوياً في أروشا', rtl: true },
  { code: 'ZH', name: '中文', sample: '阿鲁沙手工编织' },
]

/** Decaying CTR sparkline for the fatigue alert. */
function DecaySparkline({ active, reduced }: { active: boolean; reduced: boolean }) {
  const max = Math.max(...DECAY)
  const pts = DECAY.map((v, i) => `${(i / (DECAY.length - 1)) * 260},${52 - (v / max) * 44}`).join(' ')
  return (
    <svg viewBox="0 0 260 56" className="h-14 w-full" fill="none" aria-hidden="true">
      <motion.polyline
        points={pts}
        stroke="#DE5C5C"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="1 0"
        initial={{ pathLength: reduced ? 1 : 0, opacity: 0 }}
        animate={active ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
        transition={{ duration: reduced ? 0.01 : 1, ease: [0.65, 0, 0.35, 1] }}
      />
    </svg>
  )
}

/** Section A6 — Ad Creative Intelligence+: brand-voice variants, pre-spend scores, fatigue alerts, multilingual fan-out. */
export default function AdCreativeIntelligence() {
  const reduced = useReducedMotion()
  const [stage, setStage] = useState(0) // 0 idle · 1..3 variants · 4 fatigue alert · 5 multilingual
  const [running, setRunning] = useState(false)
  const timers = useRef<number[]>([])

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  const run = useCallback(() => {
    clearTimers()
    setStage(0)
    setRunning(true)
    for (let s = 1; s <= 5; s += 1) {
      timers.current.push(
        window.setTimeout(() => {
          setStage(s)
          if (s === 5) setRunning(false)
        }, reduced ? 80 * s : 300 + s * 650),
      )
    }
  }, [reduced])

  return (
    <section className="kl-pad-x border-t border-[var(--kl-paper-2)] py-[clamp(72px,9vw,120px)]">
      <div className="mx-auto max-w-container">
        <p className="kl-mono text-xs uppercase tracking-[.14em] text-[var(--kl-gold-deep)] ">Ad Creative Intelligence+</p>
        <h2 className="kl-h2 mt-5 max-w-2xl">
          Creative that knows your voice — <span className="italic text-[var(--kl-gold-deep)]">and when it's tiring.</span>
        </h2>
        <p className="text-[17px] leading-[1.55] mt-4 max-w-2xl text-[var(--kl-mid)]">
          Trained on each brand's own voice, the engine drafts ad variants, scores their predicted
          performance before a cent is spent, watches for creative fatigue, and fans the winner out
          across every language your buyers speak.
        </p>

        <div className="mt-10">
          <KlButton onClick={run} disabled={running}>
            {stage >= 5 ? (
              <>
                <RotateCcw size={15} aria-hidden="true" /> Regenerate variants
              </>
            ) : (
              <>
                <Play size={15} aria-hidden="true" /> {running ? 'Generating…' : 'Train on brand voice'}
              </>
            )}
          </KlButton>
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-3">
          {/* Variants with pre-spend predicted-performance scores */}
          <div className="space-y-4 lg:col-span-2">
            {VARIANTS.map((v, i) => {
              const on = stage > i
              return (
                <AnimatePresence key={v.id}>
                  {on && (
                    <motion.div
                      initial={reduced ? false : { opacity: 0, y: 18, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.45, ease: EASE }}
                      className={cn('rounded-[20px] border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] shadow-[0_24px_48px_-34px_var(--kl-shadow)] p-5', v.score >= 90 && 'shadow-[0_0_0_1px_var(--kl-gold)]')}
                    >
                      <div className="flex items-start gap-4">
                        <span
                          className={cn(
                            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-display text-sm',
                            v.score >= 90 ? 'bg-gradient-to-br from-[#F0C878] to-[#D9A648] text-[var(--kl-night)]' : 'bg-indigo/40 text-[var(--kl-ink)]',
                          )}
                        >
                          {v.id}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-relaxed text-[var(--kl-ink)]">{v.copy}</p>
                          <p className="text-xs text-[var(--kl-low)] mt-1.5">voice profile: {v.tone}</p>
                          {/* predicted performance bar */}
                          <div className="mt-3 flex items-center gap-3">
                            <span className="mono-data inline-flex items-center gap-1.5 text-[0.7rem] text-[var(--kl-low)]">
                              <Gauge size={12} aria-hidden="true" /> predicted pre-spend
                            </span>
                            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--kl-paper-2)]">
                              <motion.div
                                className={cn('h-full rounded-full', v.score >= 90 ? 'bg-gradient-to-r from-[#F0C878] to-[#D9A648]' : 'bg-indigo')}
                                initial={{ width: 0 }}
                                animate={{ width: `${v.score}%` }}
                                transition={{ duration: reduced ? 0.01 : 0.9, delay: reduced ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
                              />
                            </div>
                            <span className={cn('mono-data text-sm font-semibold', v.score >= 90 ? 'text-[var(--kl-gold-deep)]' : 'text-[#3F6FA8]')}>
                              {v.score}
                            </span>
                          </div>
                        </div>
                        {v.score >= 90 && (
                          <span className="mono-data hidden shrink-0 items-center gap-1 rounded-full border border-gold/50 bg-gold/10 px-2.5 py-1 text-[0.65rem] text-[var(--kl-gold-deep)] sm:inline-flex">
                            <Sparkles size={11} aria-hidden="true" /> engine pick
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )
            })}
            {stage === 0 && (
              <div className="rounded-[20px] border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] shadow-[0_24px_48px_-34px_var(--kl-shadow)] flex items-center justify-center border-dashed p-10 text-center">
                <p className="text-xs text-[var(--kl-low)] max-w-xs">
                  Three brand-voice variants appear here, each scored before you spend anything.
                </p>
              </div>
            )}
          </div>

          {/* Right rail: fatigue alert + multilingual fan-out */}
          <div className="space-y-4">
            <AnimatePresence>
              {stage >= 4 && (
                <motion.div
                  key="fatigue"
                  initial={reduced ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: EASE }}
                  className="rounded-[20px] border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] shadow-[0_24px_48px_-34px_var(--kl-shadow)] border-danger/30 p-5"
                >
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-danger">
                    <AlertTriangle size={15} aria-hidden="true" /> Creative-fatigue alert
                  </p>
                  <p className="mono-data mt-2 text-xs text-[var(--kl-mid)]">
                    CTR decaying on variant A — <span className="text-[var(--kl-gold-deep)]">rotate variant B</span>
                  </p>
                  <DecaySparkline active={stage >= 4} reduced={reduced} />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-[var(--kl-low)] inline-flex items-center gap-1">
                      <TrendingDown size={13} className="text-danger" aria-hidden="true" /> 2.2% → 0.4% in 12 days
                    </span>
                    <span className="mono-data text-[0.65rem] text-[var(--kl-low)]">auto-rotate armed</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {stage >= 5 && (
                <motion.div
                  key="langs"
                  initial={reduced ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: EASE }}
                  className="rounded-[20px] border border-[var(--kl-gold)] bg-[var(--kl-surface)] shadow-[0_0_0_1px_var(--kl-gold),0_30px_60px_-36px_rgba(169,118,28,.5)] p-5"
                >
                  <p className="kl-mono text-xs uppercase tracking-[.14em] text-[var(--kl-gold-deep)] ">
                    <Languages size={14} aria-hidden="true" /> Multilingual fan-out
                  </p>
                  <p className="text-xs text-[var(--kl-low)] mt-2">Winning variant C, re-voiced — not just translated.</p>
                  <div className="mt-4 rounded-[14px] border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] p-3">
                    <p className="mono-data text-[0.65rem] text-[var(--kl-low)]">EN · source</p>
                    <p className="mt-1 text-sm text-[var(--kl-ink)]">The basket your grandmother would approve of.</p>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {LANGUAGES.map((l, i) => (
                      <motion.li
                        key={l.code}
                        initial={reduced ? false : { opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: reduced ? 0 : 0.2 + i * 0.15, duration: 0.35, ease: EASE }}
                        className="flex items-center gap-3 rounded-[14px] border border-[var(--kl-paper-2)] bg-[var(--kl-paper)] px-3 py-2"
                      >
                        <span className="mono-data w-7 shrink-0 text-xs text-[var(--kl-gold-deep)]">{l.code}</span>
                        <span className="min-w-0 flex-1 truncate text-sm text-[var(--kl-mid)]" dir={l.rtl ? 'rtl' : 'ltr'}>
                          {l.sample}
                        </span>
                        <Check size={13} className="shrink-0 text-success" aria-hidden="true" />
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
