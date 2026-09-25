import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { ArcButton } from '@/components/ui-kit'
import CreatorsHero from '@/components/creators/CreatorsHero'
import PublishingEngine from '@/components/creators/PublishingEngine'
import CopilotPanel from '@/components/creators/CopilotPanel'
import MonetizationWaterfall from '@/components/creators/MonetizationWaterfall'
import LeadersPool from '@/components/creators/LeadersPool'
import FormulaCards from '@/components/creators/FormulaCards'
import BadgeRow from '@/components/creators/BadgeRow'
import PrePublishGuardian from '@/components/creators/PrePublishGuardian'
import { KineticWords } from '@/components/creators/Kinetic'
import { EASE, useReducedMotion } from '@/components/creators/motion-utils'

/** Section 8 — CTA. */
function CreatorsCta() {
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
          ariaLabel="Your audience is already here."
          delay={0}
          words={[
            { text: 'Your' },
            { text: 'audience' },
            { text: 'is' },
            { text: 'already', gold: true },
            { text: 'here.', gold: true },
          ]}
        />
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <ArcButton size="lg" onClick={() => navigate('/app')}>Start creating</ArcButton>
          <ArcButton size="lg" variant="ghost" onClick={() => navigate('/pricing')}>
            Compare plans <ArrowRight size={16} aria-hidden="true" />
          </ArcButton>
        </div>
        <p className="caption mx-auto mt-6 max-w-md">
          KYC verification ($10/yr via KinjyKYC) is required before affiliate participation — only
          verification results are stored. AI Creator Studio features are part of Premium.
        </p>
      </motion.div>
    </section>
  )
}

/** /creators — Creator Studio & Earnings (creators.md). */
export default function Creators() {
  return (
    <>
      <CreatorsHero />
      <PublishingEngine />
      <CopilotPanel />
      <MonetizationWaterfall />
      <LeadersPool />
      <FormulaCards />
      <BadgeRow />
      <PrePublishGuardian />
      <CreatorsCta />
    </>
  )
}
