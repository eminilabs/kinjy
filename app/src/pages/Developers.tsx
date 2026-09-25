import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { ArcButton } from '@/components/ui-kit'
import DevHero from '@/components/developers/DevHero'
import ApiSurface from '@/components/developers/ApiSurface'
import AlgorithmPublish from '@/components/developers/AlgorithmPublish'
import AgentReadable from '@/components/developers/AgentReadable'
import AIGateway from '@/components/developers/AIGateway'
import A2ARegistry from '@/components/developers/A2ARegistry'
import VerifiableCredentials from '@/components/developers/VerifiableCredentials'
import TrainingLicensing from '@/components/developers/TrainingLicensing'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/**
 * /developers — Developer Platform (Module O).
 * Dark-solid engineered theme, JetBrains Mono first-class, gold bracket motifs.
 */
export default function Developers() {
  return (
    <>
      <DevHero />
      <ApiSurface />
      <AlgorithmPublish />
      <AgentReadable />
      <AIGateway />
      <A2ARegistry />
      <VerifiableCredentials />
      <TrainingLicensing />

      {/* Section 9 — CTA */}
      <section className="noise-overlay relative overflow-hidden bg-ink-2/40 px-6 py-24 md:py-32">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{ background: 'radial-gradient(ellipse at 50% 120%, rgba(217,166,72,0.35), transparent 60%)' }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: EASE }}
            className="eyebrow text-gold"
          >
            Start building
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.65, ease: EASE }}
            className="h2 mt-4"
          >
            The society is <span className="text-gold-grad">programmable.</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.6, ease: EASE }}
            className="body-lg mx-auto mt-5 max-w-xl text-text-mid"
          >
            Keys in two minutes. Sandbox included. Your first webhook before the kettle boils.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.6, ease: EASE }}
            className="mt-9 flex flex-wrap items-center justify-center gap-4"
          >
            <ArcButton variant="gold" size="lg">Create a developer account</ArcButton>
            <Link to="/feeds">
              <ArcButton variant="ghost" size="lg">
                Explore the Algorithm Marketplace <ArrowRight size={17} aria-hidden="true" />
              </ArcButton>
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  )
}
