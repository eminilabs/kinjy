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
import { FEATURES } from '@/lib/features'
import PublicShell from '@/components/landing/PublicShell'
import { Eyebrow } from '@/components/landing/PageKit'

/**
 * Admin Console — /admin (role-gated demo view).
 * Precise, calm authority: solid ink surfaces, mono-forward data design,
 * gold reserved for actions and alerts. Rendered as a product screenshot
 * brought to life: one console frame with an icon rail and all modules inside.
 */
export default function Admin() {
  return (
    <PublicShell>
      {/* Console hero */}
      <header className="kl-pad-x pb-10 pt-14">
        <div className="flex flex-wrap items-center gap-3">
          <Eyebrow>Admin Console</Eyebrow>
          <span className="kl-mono rounded-full bg-[#F6EBD3] px-3 py-1 text-[11px] tracking-[0.16em] text-[#8A6414]">
            ADMIN DEMO
          </span>
        </div>
        <h1 className="mt-6 max-w-4xl text-balance text-[clamp(40px,6vw,84px)] font-bold leading-[0.98] tracking-[-0.04em]">
          Mission control for a <span className="text-[var(--kl-gold-deep)]">global society</span>.
        </h1>
        <p className="mt-6 max-w-2xl text-[19px] leading-[1.55] text-[var(--kl-mid)]">
          An immutable ledger, a KYC-gated economy, anti-fraud radar and Kinjy Leaders
          pipeline — run with calm, verifiable precision.
        </p>
      </header>

      {/* The console frame — scales 0.97 → 1 and fades in on load */}
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="kl-pad-x pb-24"
      >
        <ConsoleFrame>
          <KpiStrip />
          <LedgerSection />
          <KycSection />
          <FraudSection />
          <LeadersPoolSection />
          {/* "Kinjy Assistant · Admin operations": the assistant's own inbox,
              hidden with it (lib/features.ts). */}
          {FEATURES.assistant && <AiWatchSection />}
          <ModerationSection />
          <PlatformQualitySection />
        </ConsoleFrame>
      </motion.div>
    </PublicShell>
  )
}
