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

/** Section 7 — CTA. */
function FeedsCta() {
  return (
    <section className="twilight-field noise-overlay relative px-6 py-24 md:py-32" aria-label="Call to action">
      <div className="mx-auto max-w-2xl text-center">
        <p className="eyebrow text-gold">Your Rules</p>
        <h2 className="h2 mt-4">Take the controls.</h2>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link
            to="/app"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-8 py-4 text-base font-bold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:brightness-110"
          >
            Open the app demo <ArrowRight size={17} />
          </Link>
          <Link
            to="/pricing"
            className="cloud-glass inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold text-text-hi transition hover:border-gold/40 hover:text-gold-soft"
          >
            See pricing <ArrowRight size={17} />
          </Link>
        </div>
        <p className="caption mt-6">Custom algorithm feeds are a Premium feature.</p>
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
    <ToastProvider>
      <FeedsInner />
    </ToastProvider>
  )
}
