import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import PricingTiers from '@/components/pricing/PricingTiers'
import OneOffPurchases from '@/components/pricing/OneOffPurchases'
import FinePrint from '@/components/pricing/FinePrint'
import PublicShell from '@/components/landing/PublicShell'
import { ClosingStage } from '@/components/landing/PageKit'
import { KL_BTN_GHOST, KL_BTN_GOLD } from '@/components/landing/kl-classes'
import { useJoinTarget } from '@/components/landing/useJoinTarget'

/** Section 5 — CTA, on the landing's closing paper stage. */
function PricingCta() {
  const join = useJoinTarget()
  return (
    <ClosingStage
      eyebrow="Start free"
      title={
        <>
          Start free. Stay because it’s <span className="italic text-[var(--kl-gold-deep)]">beautiful.</span>
        </>
      }
    >
      <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
        <Link to={join.to} className={KL_BTN_GOLD}>
          Create free account <ArrowRight size={17} aria-hidden="true" />
        </Link>
        <Link to="/app" className={KL_BTN_GHOST}>
          Open the app demo <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </div>
    </ClosingStage>
  )
}

/** /pricing — Free / Basic / Premium tiers (pricing.md). */
export default function Pricing() {
  return (
    <PublicShell>
      <PricingTiers />
      <OneOffPurchases />
      <FinePrint />
      <PricingCta />
    </PublicShell>
  )
}
