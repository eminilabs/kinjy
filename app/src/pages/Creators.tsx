import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import CreatorsHero from '@/components/creators/CreatorsHero'
import PublishingEngine from '@/components/creators/PublishingEngine'
import CopilotPanel from '@/components/creators/CopilotPanel'
import MonetizationWaterfall from '@/components/creators/MonetizationWaterfall'
import LeadersPool from '@/components/creators/LeadersPool'
import FormulaCards from '@/components/creators/FormulaCards'
import BadgeRow from '@/components/creators/BadgeRow'
import PrePublishGuardian from '@/components/creators/PrePublishGuardian'
import PublicShell from '@/components/landing/PublicShell'
import { ClosingStage } from '@/components/landing/PageKit'
import { KL_BTN_GHOST, KL_BTN_GOLD } from '@/components/landing/kl-classes'

/** Section 8 — CTA, on the landing's closing paper stage. */
function CreatorsCta() {
  return (
    <ClosingStage
      eyebrow="Start creating"
      glow="var(--kl-coral)"
      title={
        <>
          Your audience is <span className="italic text-[var(--kl-gold-deep)]">already here.</span>
        </>
      }
    >
      <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link to="/app" className={KL_BTN_GOLD}>
          Start creating <ArrowRight size={17} aria-hidden="true" />
        </Link>
        <Link to="/pricing" className={KL_BTN_GHOST}>
          Compare plans <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </div>
      <p className="mx-auto mt-6 max-w-md text-sm text-[var(--kl-mid)]">
        KYC verification ($10/yr via KinjyKYC) is required before affiliate participation — only
        verification results are stored. AI Creator Studio features are part of Premium.
      </p>
    </ClosingStage>
  )
}

/** /creators — Creator Studio & Earnings (creators.md). */
export default function Creators() {
  return (
    <PublicShell>
      <CreatorsHero />
      <PublishingEngine />
      <CopilotPanel />
      <MonetizationWaterfall />
      <LeadersPool />
      <FormulaCards />
      <BadgeRow />
      <PrePublishGuardian />
      <CreatorsCta />
    </PublicShell>
  )
}
