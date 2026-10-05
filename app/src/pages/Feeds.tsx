import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import FeedsHero from '@/components/feeds/FeedsHero'
import FeedModesDemo from '@/components/feeds/FeedModesDemo'
import WhyDemo from '@/components/feeds/WhyDemo'
import AlgorithmMarketplace from '@/components/feeds/AlgorithmMarketplace'
import DevPublish from '@/components/feeds/DevPublish'
import GovernanceStrip from '@/components/feeds/GovernanceStrip'
import { ToastProvider, useToasts } from '@/components/feeds/Toast'
import type { Algorithm } from '@/components/feeds/data'
import PublicShell from '@/components/landing/PublicShell'

/** Section 7 — CTA, on the landing's closing paper stage. */
function FeedsCta() {
  return (
    <section className="mx-auto max-w-[1320px] px-4 pt-[clamp(40px,6vw,80px)]" aria-label="Call to action">
      <div
        className="relative overflow-hidden rounded-[20px] px-[clamp(24px,6vw,80px)] py-[clamp(90px,10vw,130px)] text-center"
        style={{ background: 'linear-gradient(180deg, var(--kl-stage-a), var(--kl-stage-b))' }}
      >
        <div aria-hidden="true" className="kl-sheen absolute -left-16 -top-20 h-[300px] w-[300px] rounded-full opacity-40 blur-[90px]" />
        <div aria-hidden="true" className="absolute -bottom-24 -right-10 h-[300px] w-[300px] rounded-full bg-[var(--kl-coral)] opacity-30 blur-[90px]" />
        <p className="kl-mono relative text-xs uppercase tracking-[.14em] text-[var(--kl-gold-deep)]">Your rules</p>
        <h2
          className="kl-serif relative mx-auto mt-5 max-w-[900px] font-semibold"
          style={{ fontSize: 'clamp(48px, 8vw, 112px)', lineHeight: 0.92, letterSpacing: '-.02em' }}
        >
          Take the controls.
        </h2>
        <div className="relative mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/app"
            className="kl-sheen inline-flex items-center gap-2 rounded-[20px] px-8 py-4 text-[17px] font-bold shadow-[0_14px_30px_-12px_rgba(169,118,28,.55)] transition-transform hover:-translate-y-0.5"
          >
            Open the app demo <ArrowRight size={17} />
          </Link>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 rounded-[20px] border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] px-8 py-4 text-[17px] font-semibold transition hover:border-[#D9A648]"
          >
            See pricing <ArrowRight size={17} />
          </Link>
        </div>
        <p className="relative mt-6 text-sm text-[var(--kl-mid)]">Custom algorithm feeds are a Premium feature.</p>
      </div>
    </section>
  )
}

function FeedsInner() {
  const [preview, setPreview] = useState<Algorithm | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const { push } = useToasts()

  // Clear the "suggested" highlight after a few seconds
  useEffect(() => {
    if (!highlightId) return
    const t = window.setTimeout(() => setHighlightId(null), 5200)
    return () => window.clearTimeout(t)
  }, [highlightId])

  /** "Change my algorithm" → smooth-scroll to the marketplace + pre-highlight a suggestion. */
  const goMarketplace = useCallback(
    (suggestId = 'friends-first') => {
      setHighlightId(suggestId)
      document.getElementById('algorithm-marketplace')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      push('Suggested for you: Friends First — based on your choice')
    },
    [push],
  )

  const useAlgorithm = useCallback((algo: Algorithm) => {
    setPreview(algo)
  }, [])

  const undoPreview = useCallback(() => setPreview(null), [])

  return (
    <>
      <FeedsHero />
      <FeedModesDemo preview={preview} onUndoPreview={undoPreview} onGoMarketplace={goMarketplace} />
      <WhyDemo onChangeAlgorithm={() => goMarketplace('friends-first')} />
      <AlgorithmMarketplace
        activeId={preview?.id ?? null}
        highlightId={highlightId}
        onUse={useAlgorithm}
        onUndoPreview={undoPreview}
      />
      <DevPublish />
      <GovernanceStrip />
      <FeedsCta />
    </>
  )
}

/** Route /feeds — 10 feed modes, transparency triad, 15-algorithm marketplace. */
export default function Feeds() {
  return (
    <PublicShell>
      <ToastProvider>
        <FeedsInner />
      </ToastProvider>
    </PublicShell>
  )
}
