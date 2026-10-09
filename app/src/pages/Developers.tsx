import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import PublicShell from '@/components/landing/PublicShell'
import { ClosingStage } from '@/components/landing/PageKit'
import { KL_BTN_GHOST, KL_BTN_GOLD } from '@/components/landing/kl-classes'
import DevHero from '@/components/developers/DevHero'
import ApiSurface from '@/components/developers/ApiSurface'
import AlgorithmPublish from '@/components/developers/AlgorithmPublish'
import AgentReadable from '@/components/developers/AgentReadable'
import AIGateway from '@/components/developers/AIGateway'
import A2ARegistry from '@/components/developers/A2ARegistry'
import VerifiableCredentials from '@/components/developers/VerifiableCredentials'
import TrainingLicensing from '@/components/developers/TrainingLicensing'
import { FEATURES } from '@/lib/features'

/**
 * /developers — Developer Platform (Module O).
 * Dark-solid engineered theme, JetBrains Mono first-class, gold bracket motifs.
 */
export default function Developers() {
  return (
    <PublicShell>
      <DevHero />
      <ApiSurface />
      <AlgorithmPublish />
      <AgentReadable />
      <AIGateway />
      {/* The registry is shown through a personal assistant negotiating with
          business agents; it goes with the assistant (lib/features.ts). */}
      {FEATURES.assistant && <A2ARegistry />}
      <VerifiableCredentials />
      <TrainingLicensing />

      <ClosingStage
        eyebrow="Start building"
        glow="var(--kl-indigo)"
        title={
          <>
            The society is <span className="text-[var(--kl-gold-deep)]">programmable.</span>
          </>
        }
      >
        <p className="mx-auto mt-6 max-w-xl text-[18px] text-[var(--kl-mid)]">
          Keys in two minutes. Sandbox included. Your first webhook before the kettle boils.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <button type="button" className={KL_BTN_GOLD}>Create a developer account</button>
          <Link to="/feeds" className={KL_BTN_GHOST}>
            Explore the Algorithm Marketplace <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </ClosingStage>
    </PublicShell>
  )
}
