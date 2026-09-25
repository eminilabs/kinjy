import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { FileText, ArrowRight } from 'lucide-react'
import { ArcButton } from '@/components/ui-kit'
import SafetyHero from '@/components/safety/SafetyHero'
import ModerationStack from '@/components/safety/ModerationStack'
import AgeModes from '@/components/safety/AgeModes'
import HonestContent from '@/components/safety/HonestContent'
import PasskeysSection from '@/components/safety/PasskeysSection'
import DeletionStepper from '@/components/safety/DeletionStepper'
import TranslationPrivacy from '@/components/safety/TranslationPrivacy'
import EarlyWarningSystem from '@/components/safety/EarlyWarningSystem'
import CrisisAlertMode from '@/components/safety/CrisisAlertMode'
import ProvenanceSigning from '@/components/safety/ProvenanceSigning'
import VoiceFirstAccess from '@/components/safety/VoiceFirstAccess'

/**
 * Safety, Privacy & Account Control — /safety.
 * Reassuring, principled, transparent. Layered moderation, age-appropriate spaces,
 * provenance & Community Notes, passkeys (no central biometrics), self-service
 * deletion, and privacy-first translation routing.
 */
export default function Safety() {
  return (
    <div className="bg-ink">
      <SafetyHero />
      <ModerationStack />
      <AgeModes />
      <HonestContent />
      <PasskeysSection />
      <DeletionStepper />
      <TranslationPrivacy />
      <EarlyWarningSystem />
      <CrisisAlertMode />
      <ProvenanceSigning />
      <VoiceFirstAccess />

      {/* CTA */}
      <section aria-labelledby="safety-cta-heading" className="twilight-field noise-overlay py-24 text-center">
        <div className="mx-auto max-w-container px-6">
          <motion.h2
            id="safety-cta-heading"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="h2"
          >
            Trust, <span className="text-gold-grad">verified.</span>
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.6, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 flex flex-wrap items-center justify-center gap-3"
          >
            <ArcButton variant="ghost" type="button">
              <FileText size={15} aria-hidden="true" /> Read the transparency report
            </ArcButton>
            <Link to="/app">
              <ArcButton variant="gold" type="button">
                See account controls in the app <ArrowRight size={15} aria-hidden="true" />
              </ArcButton>
            </Link>
            <Link to="/admin">
              <ArcButton variant="ghost" type="button">
                Admin console <ArrowRight size={15} aria-hidden="true" />
              </ArcButton>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
