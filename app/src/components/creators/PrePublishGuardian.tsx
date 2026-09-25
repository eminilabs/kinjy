import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowRight,
  Check,
  FileText,
  RotateCcw,
  ScanSearch,
  ShieldCheck,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ArcButton } from '@/components/ui-kit'
import { EASE, useReducedMotion } from './motion-utils'

type Phase = 'draft' | 'scanning' | 'flagged' | 'rescanning' | 'safe'

const ORIGINAL_TEXT =
  'This herbal tea CURES diabetes — guaranteed results in 7 days. Share with everyone you know!'
const FIXED_TEXT =
  'This herbal tea has become part of my morning routine and I genuinely enjoy it. Not medical advice — talk to a clinician about diabetes care.'

const CLAIM_FRAGMENT = 'CURES diabetes — guaranteed results'
const FIX_FRAGMENT = 'part of my morning routine and I genuinely enjoy it'

/**
 * PrePublishGuardian — interactive demo of the pre-publish scan (A2).
 * A draft post is scanned, Rule 4.2 is cited with a suggested edit, the creator
 * applies the fix, and the Guardian returns a green "Safe to publish" state.
 */
export default function PrePublishGuardian() {
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('draft')
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, reduced ? Math.min(ms, 250) : ms))
  }

  const runScan = () => {
    setPhase('scanning')
    later(() => setPhase('flagged'), 1400)
  }

  const applyFix = () => {
    setPhase('rescanning')
    later(() => setPhase('safe'), 1400)
  }

  const reset = () => setPhase('draft')

  const scanning = phase === 'scanning' || phase === 'rescanning'
  const resolved = phase === 'flagged' || phase === 'safe'

  return (
    <section aria-labelledby="guardian-heading" className="px-6 py-24 md:py-32">
      <div className="mx-auto max-w-container">
        <div className="max-w-2xl">
          <p className="eyebrow text-gold">Creator Pre-Publish Guardian</p>
          <h2 id="guardian-heading" className="h2 mt-3">
            Know before you post — <span className="font-display italic text-gold-grad">not after.</span>
          </h2>
          <p className="body-lg mt-4 text-text-mid">
            Every draft runs through the Guardian before it goes live. If something would likely be
            flagged, you see the exact rule, the reason, and a suggested fix — while you can still
            change it.
          </p>
        </div>

        <div className="mt-14 grid items-start gap-8 lg:grid-cols-[1.1fr_1fr]">
          {/* Draft composer */}
          <motion.div
            className="cloud-card p-5"
            initial={reduced ? false : { opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <div className="flex items-center gap-2.5 border-b border-white/10 pb-4">
              <span className="h-9 w-9 rounded-full bg-gradient-to-br from-indigo to-sky/80" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-text-hi">@demo.cooks</p>
                <p className="caption">Draft · Public feed · Swahili + English</p>
              </div>
              <span
                className={cn(
                  'mono-data ml-auto rounded-full border px-2.5 py-1 text-[0.65rem] uppercase tracking-wider',
                  phase === 'safe'
                    ? 'border-success/50 bg-success/15 text-success'
                    : resolved
                      ? 'border-warning/50 bg-warning/15 text-warning'
                      : 'border-white/15 bg-white/5 text-text-low',
                )}
              >
                {phase === 'safe' ? 'Ready' : resolved ? 'Needs edit' : 'Draft'}
              </span>
            </div>

            {/* Draft body — swaps when the fix is applied */}
            <div className="relative mt-4 min-h-[7.5rem]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.p
                  key={phase === 'safe' || phase === 'rescanning' ? 'fixed' : 'original'}
                  initial={reduced ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
                  transition={{ duration: 0.35, ease: EASE }}
                  className={cn(
                    'rounded-card-md border p-4 text-sm leading-relaxed',
                    phase === 'flagged'
                      ? 'border-warning/40 bg-warning/[0.07] text-text-hi'
                      : phase === 'safe'
                        ? 'border-success/40 bg-success/[0.07] text-text-hi'
                        : 'border-white/10 bg-ink-3/60 text-text-hi',
                  )}
                >
                  {phase === 'safe' || phase === 'rescanning' ? FIXED_TEXT : ORIGINAL_TEXT}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {phase === 'draft' && (
                <ArcButton size="sm" variant="indigo" onClick={runScan}>
                  <ScanSearch size={15} aria-hidden="true" /> Run pre-publish scan
                </ArcButton>
              )}
              {scanning && (
                <span className="mono-data inline-flex items-center gap-2 text-[0.75rem] text-sky">
                  <ScanSearch size={14} className="animate-pulse" aria-hidden="true" />
                  {phase === 'scanning' ? 'Scanning against Community Rules…' : 'Re-scanning edited draft…'}
                </span>
              )}
              {phase === 'flagged' && (
                <ArcButton size="sm" onClick={applyFix}>
                  <Sparkles size={15} aria-hidden="true" /> Apply suggested edit
                </ArcButton>
              )}
              {phase === 'safe' && (
                <>
                  <ArcButton size="sm">
                    Publish now <ArrowRight size={15} aria-hidden="true" />
                  </ArcButton>
                  <ArcButton size="sm" variant="ghost" onClick={reset}>
                    <RotateCcw size={14} aria-hidden="true" /> Replay demo
                  </ArcButton>
                </>
              )}
            </div>

            {/* Scan progress bar */}
            <AnimatePresence>
              {scanning && !reduced && (
                <motion.div
                  className="mt-4 h-1 overflow-hidden rounded-full bg-white/10"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: 'var(--grad-arc)' }}
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 1.2, ease: [0.65, 0, 0.35, 1], repeat: Infinity }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Guardian verdict panel */}
          <motion.div
            className="cloud-card p-5"
            initial={reduced ? false : { opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ duration: 0.7, delay: 0.12, ease: EASE }}
            aria-live="polite"
          >
            <p className="mono-data flex items-center gap-2 text-[0.7rem] uppercase tracking-wider text-text-low">
              <ShieldCheck size={14} className="text-gold" aria-hidden="true" /> Guardian verdict
            </p>

            <div className="mt-4">
              <AnimatePresence mode="wait" initial={false}>
                {phase === 'flagged' ? (
                  <motion.div
                    key="flagged"
                    initial={reduced ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: EASE }}
                  >
                    <div className="rounded-card-md border border-warning/40 bg-warning/[0.08] p-4">
                      <p className="flex items-center gap-2 text-sm font-bold text-warning">
                        <AlertTriangle size={15} aria-hidden="true" /> Likely flagged
                      </p>
                      <p className="mono-data mt-2 inline-block rounded border border-warning/30 bg-ink-3/70 px-2 py-1 text-[0.7rem] text-gold-soft">
                        Rule 4.2 — Unverified health claim
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-text-hi">
                        <span className="font-semibold text-warning">Why:</span> the phrase{' '}
                        <span className="font-display italic text-gold-soft">“{CLAIM_FRAGMENT}”</span>{' '}
                        asserts a medical outcome without evidence. Posts like this are removed under
                        Rule 4.2 after publication.
                      </p>
                      <div className="mt-3 rounded-card-sm border border-white/10 bg-ink-3/60 p-3">
                        <p className="mono-data flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wider text-sky">
                          <Sparkles size={11} aria-hidden="true" /> Suggested edit
                        </p>
                        <p className="mt-1.5 text-sm leading-relaxed text-text-hi">
                          “{FIX_FRAGMENT}.”
                        </p>
                      </div>
                      <p className="caption mt-3 flex items-center gap-1.5">
                        <FileText size={12} aria-hidden="true" /> Full rule text: kaluta.society/rules#4-2
                      </p>
                    </div>
                  </motion.div>
                ) : phase === 'safe' ? (
                  <motion.div
                    key="safe"
                    initial={reduced ? false : { opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: EASE }}
                    className="rounded-card-md border border-success/40 bg-success/[0.08] p-4"
                  >
                    <p className="flex items-center gap-2 text-sm font-bold text-success">
                      <motion.span
                        initial={reduced ? false : { scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.1 }}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-success/20"
                      >
                        <Check size={14} aria-hidden="true" />
                      </motion.span>
                      Safe to publish
                    </p>
                    <p className="mt-2.5 text-sm leading-relaxed text-text-hi">
                      No rule conflicts found. The revised wording shares your experience without
                      asserting a medical outcome.
                    </p>
                    <p className="mono-data mt-3 text-[0.68rem] text-text-low">
                      scanned 2 drafts · 0 strikes on your account · appeal-free
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="flex min-h-[12rem] flex-col items-center justify-center rounded-card-md border border-dashed border-white/15 p-6 text-center"
                  >
                    <ShieldCheck size={28} className="text-text-low" aria-hidden="true" />
                    <p className="caption mt-3 max-w-[16rem]">
                      {scanning
                        ? 'Guardian is checking your draft against every Community Rule…'
                        : 'Run the scan to see the Guardian’s verdict before your post goes live.'}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* Contrast strip */}
        <motion.p
          initial={reduced ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.7 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mx-auto mt-16 max-w-2xl text-center font-display text-[clamp(1.25rem,2.4vw,1.75rem)] italic leading-snug text-gold-soft"
        >
          “Moderation that helps you publish — <span className="text-gold-grad">not strike you after.</span>”
        </motion.p>
      </div>
    </section>
  )
}
