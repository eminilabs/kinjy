import { motion } from 'framer-motion'
import ConsoleFrame from '@/components/admin/ConsoleFrame'
import KpiStrip from '@/components/admin/KpiStrip'
import LedgerSection from '@/components/admin/LedgerSection'
import KycSection from '@/components/admin/KycSection'
import FraudSection from '@/components/admin/FraudSection'
import LeadersPoolSection from '@/components/admin/LeadersPoolSection'
import AiWatchSection from '@/components/admin/AiWatchSection'
import ModerationSection from '@/components/admin/ModerationSection'
import PlatformQualitySection from '@/components/admin/PlatformQualitySection'

/**
 * Admin Console — /admin (role-gated demo view).
 * Precise, calm authority: solid ink surfaces, mono-forward data design,
 * gold reserved for actions and alerts. Rendered as a product screenshot
 * brought to life: one console frame with an icon rail and all modules inside.
 */
export default function Admin() {
  return (
    <div className="noise-overlay bg-ink">
      {/* Console hero */}
      <header className="px-6 pb-8 pt-14 md:pt-20">
        <div className="mx-auto max-w-container">
          <div className="flex flex-wrap items-center gap-3">
            <p className="eyebrow text-gold">Admin Console</p>
            <span className="mono-data rounded-full border border-gold/50 bg-gold/15 px-2.5 py-0.5 text-[0.65rem] tracking-[0.18em] text-gold-soft">
              ADMIN DEMO
            </span>
          </div>
          <h1 className="h1 mt-3 max-w-3xl">
            Mission control for a <span className="text-gold-grad">global society</span>.
          </h1>
          <p className="body-lg mt-4 max-w-2xl text-text-mid">
            An immutable ledger, a KYC-gated economy, anti-fraud radar and Kinjy Leaders
            pipeline — run with calm, verifiable precision.
          </p>
        </div>
      </header>

      {/* The console frame — scales 0.97 → 1 and fades in on load */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="px-4 pb-24 md:px-6"
      >
        <div className="mx-auto max-w-container">
          <ConsoleFrame>
            <KpiStrip />
            <LedgerSection />
            <KycSection />
            <FraudSection />
            <LeadersPoolSection />
            <AiWatchSection />
            <ModerationSection />
            <PlatformQualitySection />
          </ConsoleFrame>
        </div>
      </motion.div>
    </div>
  )
}
