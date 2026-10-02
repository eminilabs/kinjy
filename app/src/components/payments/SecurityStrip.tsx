import { motion } from 'framer-motion'
import { BookLock, Fingerprint, KeyRound, Network, Wallet } from 'lucide-react'
import { EASE, useReducedMotion } from '@/components/creators/motion-utils'
import { Eyebrow } from '@/components/landing/PageKit'
import { KL_CARD } from '@/components/landing/kl-classes'
import { cn } from '@/lib/utils'

const ITEMS = [
  {
    icon: Network,
    title: 'IP whitelisting',
    text: 'NowPayments API access is locked to Kinjy server IPs only.',
  },
  {
    icon: Wallet,
    title: 'Wallet whitelisting',
    text: 'Payouts can only go to pre-approved destination addresses — the safe wallet and member wallets.',
  },
  {
    icon: KeyRound,
    title: '2FA on every payout',
    text: 'Mass Payout batches require a verification code; disabling it needs a signed email request.',
  },
  {
    icon: Fingerprint,
    title: 'HMAC IPN verification',
    text: 'Callbacks are only trusted when the x-nowpayments-sig header recomputes exactly.',
  },
  {
    icon: BookLock,
    title: 'Ledger reconciliation',
    text: 'Every rail movement appends to the immutable Kinjy ledger — audited entry by entry.',
  },
]

/** Section 7 — Security strip. */
export default function SecurityStrip() {
  const reduced = useReducedMotion()
  return (
    <section className="kl-pad-x scroll-mt-24 border-t border-[var(--kl-paper-2)] py-[clamp(72px,9vw,120px)]">
      <div>
        <Eyebrow>Security — Defense in depth</Eyebrow>
        <h2 className="kl-h2 mt-5 max-w-[900px]">
          Money moves on <span className="text-[var(--kl-gold-deep)]">five locks.</span>
        </h2>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {ITEMS.map((it, i) => (
            <motion.div
              key={it.title}
              className={cn(KL_CARD, 'transition-transform hover:-translate-y-0.5 p-5')}
              initial={reduced ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-12%' }}
              transition={{ delay: i * 0.09, duration: 0.5, ease: EASE }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'var(--grad-orb)' }}>
                <it.icon size={16} className="text-ink" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-text-hi">{it.title}</h3>
              <p className="caption mt-1.5">{it.text}</p>
            </motion.div>
          ))}
        </div>
        <p className="mono-data mt-8 text-center text-xs text-text-low">
          1000+ payouts per API call · average transaction ≈ 5 minutes · 0% service fee on payouts
        </p>
      </div>
    </section>
  )
}
