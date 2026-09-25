import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { ArcButton } from '@/components/ui-kit'
import PaymentsHero from '@/components/payments/PaymentsHero'
import CryptoCheckout from '@/components/payments/CryptoCheckout'
import AutoconversionPipeline from '@/components/payments/AutoconversionPipeline'
import CashoutEngine from '@/components/payments/CashoutEngine'
import EligibilityGate from '@/components/payments/EligibilityGate'
import DualRail from '@/components/payments/DualRail'
import SecurityStrip from '@/components/payments/SecurityStrip'
import { KineticWords } from '@/components/creators/Kinetic'
import { EASE, useReducedMotion } from '@/components/creators/motion-utils'

/** Section 8 — CTA. */
function PaymentsCta() {
  const navigate = useNavigate()
  const reduced = useReducedMotion()
  return (
    <section className="noise-overlay px-6 py-24 md:py-32" style={{ background: 'var(--ink)' }}>
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
          ariaLabel="Verify your account. Add your wallet. Get paid."
          delay={0}
          words={[
            { text: 'Verify' },
            { text: 'your' },
            { text: 'account.' },
            { text: 'Add' },
            { text: 'your' },
            { text: 'wallet.', gold: true },
            { text: 'Get' },
            { text: 'paid.', gold: true },
          ]}
        />
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <ArcButton size="lg" onClick={() => navigate('/app')}>Open your backoffice</ArcButton>
          <ArcButton
            size="lg"
            variant="ghost"
            onClick={() =>
              document.getElementById('crypto-checkout')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
            }
          >
            Replay the checkout
          </ArcButton>
        </div>
        <button
          type="button"
          onClick={() => navigate('/creators')}
          className="mt-7 inline-flex items-center gap-2 font-semibold text-gold-soft transition-all hover:gap-3"
        >
          How commissions are earned <ArrowRight size={16} aria-hidden="true" />
        </button>
      </motion.div>
    </section>
  )
}

/** /payments — NowPayments crypto rail, 10-level cashout engine, escrow rails. */
export default function Payments() {
  return (
    <>
      <PaymentsHero />
      <CryptoCheckout />
      <AutoconversionPipeline />
      <CashoutEngine />
      <EligibilityGate />
      <DualRail />
      <SecurityStrip />
      <PaymentsCta />
    </>
  )
}
