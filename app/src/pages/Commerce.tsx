import { Link, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { ArcButton } from '@/components/ui-kit'
import CommerceHero from '@/components/commerce/CommerceHero'
import MarginEquation from '@/components/commerce/MarginEquation'
import MarketplaceGrid from '@/components/commerce/MarketplaceGrid'
import AdRateCard from '@/components/commerce/AdRateCard'
import AdEngineConsole from '@/components/commerce/AdEngineConsole'
import DirectCommission from '@/components/commerce/DirectCommission'
import CommerceCopilot from '@/components/commerce/CommerceCopilot'
import AdCreativeIntelligence from '@/components/commerce/AdCreativeIntelligence'
import { KineticWords } from '@/components/creators/Kinetic'
import { EASE, useReducedMotion } from '@/components/creators/motion-utils'

/** Section 7 — CTA. */
function CommerceCta() {
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  return (
    <section className="noise-overlay twilight-field px-6 py-24 md:py-32">
      <motion.div
        className="mx-auto max-w-2xl text-center"
        initial={reduced ? false : { opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-20%' }}
        transition={{ duration: 0.7, ease: EASE }}
      >
        <KineticWords
          as="h2"
          className="h2"
          ariaLabel="Sell to the neighborhood — or the planet."
          delay={0}
          words={[
            { text: 'Sell' },
            { text: 'to' },
            { text: 'the' },
            { text: 'neighborhood', gold: true },
            { text: '—' },
            { text: 'or' },
            { text: 'the' },
            { text: 'planet.', gold: true },
          ]}
        />
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <ArcButton size="lg" onClick={() => navigate('/app')}>Open Marketplace</ArcButton>
          <ArcButton
            size="lg"
            variant="ghost"
            onClick={() => {
              document.getElementById('ad-engine')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
              window.dispatchEvent(new CustomEvent('kaluta:replay-ad-engine'))
            }}
          >
            Launch the ad console
          </ArcButton>
        </div>
        <Link to="/creators" className="mt-7 inline-flex items-center gap-2 font-semibold text-gold-soft transition-all hover:gap-3">
          Earnings &amp; Kinjy Leaders <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </motion.div>
    </section>
  )
}

/** /commerce — Marketplace & Advertising (commerce.md). */
export default function Commerce() {
  return (
    <>
      <CommerceHero />
      <MarginEquation />
      <MarketplaceGrid />
      <CommerceCopilot />
      <AdRateCard />
      <AdEngineConsole />
      <DirectCommission />
      <AdCreativeIntelligence />
      <CommerceCta />
    </>
  )
}
