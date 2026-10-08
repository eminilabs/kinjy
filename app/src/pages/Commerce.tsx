import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import CommerceHero from '@/components/commerce/CommerceHero'
import MarginEquation from '@/components/commerce/MarginEquation'
import MarketplaceGrid from '@/components/commerce/MarketplaceGrid'
import AdRateCard from '@/components/commerce/AdRateCard'
import AdEngineConsole from '@/components/commerce/AdEngineConsole'
import DirectCommission from '@/components/commerce/DirectCommission'
import CommerceCopilot from '@/components/commerce/CommerceCopilot'
import AdCreativeIntelligence from '@/components/commerce/AdCreativeIntelligence'
import PublicShell from '@/components/landing/PublicShell'
import { ClosingStage } from '@/components/landing/PageKit'
import { KL_BTN_GHOST, KL_BTN_GOLD } from '@/components/landing/kl-classes'
import { useReducedMotion } from '@/components/creators/motion-utils'

/** Section 7 — CTA, on the landing's closing paper stage. */
function CommerceCta() {
  const reduced = useReducedMotion()
  return (
    <ClosingStage
      eyebrow="Start selling"
      glow="var(--kl-gold)"
      title={
        <>
          Sell to the <span className="italic text-[var(--kl-gold-deep)]">neighborhood</span> — or the{' '}
          <span className="italic text-[var(--kl-gold-deep)]">planet.</span>
        </>
      }
    >
      <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link to="/app" className={KL_BTN_GOLD}>
          Open Marketplace <ArrowRight size={17} aria-hidden="true" />
        </Link>
        <button
          type="button"
          className={KL_BTN_GHOST}
          onClick={() => {
            document.getElementById('ad-engine')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
            window.dispatchEvent(new CustomEvent('kaluta:replay-ad-engine'))
          }}
        >
          Launch the ad console
        </button>
      </div>
      <Link
        to="/creators"
        className="mt-8 inline-flex items-center gap-2 font-semibold text-[var(--kl-gold-deep)] transition-all hover:gap-3"
      >
        Earnings &amp; Kinjy Leaders <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </ClosingStage>
  )
}

/** /commerce — Marketplace & Advertising (commerce.md). */
export default function Commerce() {
  return (
    <PublicShell>
      <CommerceHero />
      <MarginEquation />
      <MarketplaceGrid />
      <CommerceCopilot />
      <AdRateCard />
      <AdEngineConsole />
      <DirectCommission />
      <AdCreativeIntelligence />
      <CommerceCta />
    </PublicShell>
  )
}
