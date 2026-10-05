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
import { Eyebrow, Stage } from '@/components/landing/PageKit'
import { KL_PILL, KL_PILL_GOLD } from '@/components/landing/kl-classes'
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
    <section aria-labelledby="guardian-heading" className="kl-pad-x border-t border-[var(--kl-paper-2)] py-[clamp(72px,9vw,120px)]">
      <div>
        <div className="max-w-2xl">
          <Eyebrow>Creator pre-publish guardian</Eyebrow>
          <h2 id="guardian-heading" className="kl-h2 mt-5">
            Know before you post — <span className="italic text-[var(--kl-gold-deep)]">not after.</span>
          </h2>
          <p className="kl-lead mt-5 !max-w-[600px]">
            Every draft runs through the Guardian before it goes live. If something would likely be
            flagged, you see the exact rule, the reason, and a suggested fix — while you can still
            change it.
          </p>
        </div>

        <Stage className="mt-14 p-[clamp(14px,3vw,40px)]" glows={['var(--kl-sky)', 'var(--kl-coral)']}>
        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {/* Draft composer */}
          <motion.div
            className="rounded-[20px] bg-[var(--kl-surface)] p-5 shadow-[0_30px_60px_-36px_var(--kl-shadow)]"
            initial={reduced ? false : { opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ duration: 0.7, ease: EASE }}
          >
            <div className="flex items-center gap-2.5 border-b border-[var(--kl-paper-2)] pb-4">
              <span className="kl-orb-ring h-9 w-9 rounded-full" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">@demo.cooks</p>
                <p className="text-xs text-[var(--kl-low)]">Draft · Public feed · Swahili + English</p>
              </div>
              <span
                className={cn(
                  'kl-mono ml-auto rounded-full px-2.5 py-1 text-[10px] uppercase tracking-wider',
                  phase === 'safe'
                    ? 'bg-[#DDF0E5] text-[#2E7D57]'
                    : resolved
                      ? 'bg-[#F7E1D8] text-[#C45531]'
                      : 'bg-[var(--kl-paper)] text-[var(--kl-low)]',
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
                    'rounded-[14px] border p-4 text-[15px] leading-relaxed',
                    phase === 'flagged'
                      ? 'border-[#E07856]/50 bg-[#E07856]/[0.08]'
                      : phase === 'safe'
                        ? 'border-[#3FB27F]/50 bg-[#3FB27F]/[0.08]'
                        : 'border-[var(--kl-paper-2)] bg-[var(--kl-paper)]',
                  )}
                >
                  {phase === 'safe' || phase === 'rescanning' ? FIXED_TEXT : ORIGINAL_TEXT}
                </motion.p>
              </AnimatePresence>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {phase === 'draft' && (
                <button type="button" onClick={runScan} className="inline-flex items-center gap-1.5 rounded-full bg-[var(--kl-indigo)] px-4 py-2 text-sm font-semibold text-white hover:brightness-110">
                  <ScanSearch size={15} aria-hidden="true" /> Run pre-publish scan
                </button>
              )}
              {scanning && (
                <span className="kl-mono inline-flex items-center gap-2 text-xs text-[#4A52E0]">
                  <ScanSearch size={14} className="animate-pulse" aria-hidden="true" />
                  {phase === 'scanning' ? 'Scanning against Community Rules…' : 'Re-scanning edited draft…'}
                </span>
              )}
              {phase === 'flagged' && (
                <button type="button" onClick={applyFix} className={KL_PILL_GOLD}>
                  <Sparkles size={15} aria-hidden="true" /> Apply suggested edit
                </button>
              )}
              {phase === 'safe' && (
                <>
                  <button type="button" className={KL_PILL_GOLD}>
                    Publish now <ArrowRight size={15} aria-hidden="true" />
                  </button>
                  <button type="button" onClick={reset} className={KL_PILL}>
                    <RotateCcw size={14} aria-hidden="true" /> Replay demo
                  </button>
                </>
              )}
            </div>

            {/* Scan progress bar */}
            <AnimatePresence>
              {scanning && !reduced && (
                <motion.div
                  className="mt-4 h-1 overflow-hidden rounded-full bg-[var(--kl-paper-2)]"
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
            className="rounded-[20px] bg-[var(--kl-surface)] p-5 shadow-[0_30px_60px_-36px_var(--kl-shadow)]"
            initial={reduced ? false : { opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ duration: 0.7, delay: 0.12, ease: EASE }}
            aria-live="polite"
          >
            <p className="kl-mono flex items-center gap-2 text-[11px] uppercase tracking-[.14em] text-[var(--kl-low)]">
              <ShieldCheck size={14} className="text-[var(--kl-gold-deep)]" aria-hidden="true" /> Guardian verdict
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
                    <div className="rounded-[14px] border border-[#E07856]/50 bg-[#E07856]/[0.08] p-4">
                      <p className="flex items-center gap-2 text-sm font-bold text-[#C45531]">
                        <AlertTriangle size={15} aria-hidden="true" /> Likely flagged
                      </p>
                      <p className="kl-mono mt-2 inline-block rounded-[6px] bg-[var(--kl-surface)] px-2 py-1 text-[11px] text-[#C45531]">
                        Rule 4.2 — Unverified health claim
                      </p>
                      <p className="mt-3 text-sm leading-relaxed">
                        <span className="font-semibold text-[#C45531]">Why:</span> the phrase{' '}
                        <span className="kl-serif italic text-[var(--kl-gold-deep)]">“{CLAIM_FRAGMENT}”</span>{' '}
                        asserts a medical outcome without evidence. Posts like this are removed under
                        Rule 4.2 after publication.
                      </p>
                      <div className="mt-3 rounded-[10px] bg-[var(--kl-surface)] p-3">
                        <p className="kl-mono flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#4A52E0]">
                          <Sparkles size={11} aria-hidden="true" /> Suggested edit
                        </p>
                        <p className="mt-1.5 text-sm leading-relaxed">
                          “{FIX_FRAGMENT}.”
                        </p>
                      </div>
                      <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--kl-low)]">
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
                    className="rounded-[14px] border border-[#3FB27F]/50 bg-[#3FB27F]/[0.08] p-4"
                  >
                    <p className="flex items-center gap-2 text-sm font-bold text-[#2E7D57]">
                      <motion.span
                        initial={reduced ? false : { scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 16, delay: 0.1 }}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-[#DDF0E5]"
                      >
                        <Check size={14} aria-hidden="true" />
                      </motion.span>
                      Safe to publish
                    </p>
                    <p className="mt-2.5 text-sm leading-relaxed">
                      No rule conflicts found. The revised wording shares your experience without
                      asserting a medical outcome.
                    </p>
                    <p className="kl-mono mt-3 text-[11px] text-[var(--kl-low)]">
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
                    className="flex min-h-[12rem] flex-col items-center justify-center rounded-[14px] border border-dashed border-[var(--kl-dash)] p-6 text-center"
                  >
                    <ShieldCheck size={28} className="text-[var(--kl-low)]" aria-hidden="true" />
                    <p className="mt-3 max-w-[16rem] text-sm text-[var(--kl-mid)]">
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
        </Stage>

        {/* Contrast strip */}
        <motion.p
          initial={reduced ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.7 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="kl-serif mx-auto mt-16 max-w-3xl text-center text-[clamp(26px,3.2vw,40px)] italic leading-snug"
        >
          “Moderation that helps you publish — <span className="text-[var(--kl-gold-deep)]">not strike you after.</span>”
        </motion.p>
      </div>
    </section>
  )
}
