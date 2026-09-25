import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { ArcButton } from '@/components/ui-kit'
import PricingTiers from '@/components/pricing/PricingTiers'
import OneOffPurchases from '@/components/pricing/OneOffPurchases'
import FinePrint from '@/components/pricing/FinePrint'
import { KineticWords } from '@/components/creators/Kinetic'
import { EASE, useReducedMotion } from '@/components/creators/motion-utils'

/** Section 5 — CTA. */
function PricingCta() {
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
          ariaLabel="Start free. Stay because it's beautiful."
          delay={0}
          words={[
            { text: 'Start' },
            { text: 'free.', gold: true },
            { text: 'Stay' },
            { text: 'because' },
            { text: 'it’s' },
            { text: 'beautiful.', gold: true },
          ]}
        />
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <ArcButton size="lg" onClick={() => navigate('/app')}>Create free account</ArcButton>
          <ArcButton size="lg" variant="ghost" onClick={() => navigate('/app')}>
            Open the app demo <ArrowRight size={16} aria-hidden="true" />
          </ArcButton>
        </div>
      </motion.div>
    </section>
  )
}

/** /pricing — Free / Basic / Premium tiers (pricing.md). */
export default function Pricing() {
  return (
    <>
      <PricingTiers />
      <OneOffPurchases />
      <FinePrint />
      <PricingCta />
    </>
  )
}
