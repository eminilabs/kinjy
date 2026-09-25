import { motion } from 'framer-motion'
import { ArrowDownUp, Banknote, Bitcoin, BookLock, Check, Clock, Split, UserCheck, Vault, Globe2 } from 'lucide-react'
import { LedgerRow } from '@/components/ui-kit'
import { cn } from '@/lib/utils'
import { EASE, useReducedMotion } from '@/components/creators/motion-utils'

const CRYPTO_FEATURES = [
  { icon: Bitcoin, text: '350+ coins in, deposit addresses via POST /v1/payment' },
  { icon: ArrowDownUp, text: 'Custody autoconversion to a single USDT · BSC balance' },
  { icon: Vault, text: 'Batched treasury sweeps to the company safe wallet' },
  { icon: Globe2, text: 'Mass Payouts to whitelisted member wallets — 0% service fee' },
]

const BANK_FEATURES = [
  { icon: Vault, text: 'Purpose-built escrow wallets — unlimited escrow duration, release on conditions' },
  { icon: Split, text: 'Multi-party splits between as many parties as needed — built for a 10-level chain' },
  { icon: UserCheck, text: "Per-user KYC'd e-wallets for every earning member" },
  { icon: Banknote, text: 'Cashouts to bank accounts worldwide, plus subscription billing' },
]

const ALTERNATIVES = [
  { name: 'Mangopay', fit: 'Escrow wallets + unlimited-duration escrow + multi-party splits', verdict: 'Primary', primary: true },
  { name: 'Trolley', fit: 'Affiliate/creator payout specialist with built-in tax handling', verdict: 'Complementary', primary: false },
  { name: 'Hyperwallet (PayPal)', fit: 'Local bank transfers in 200+ countries, white-label payout portals', verdict: 'Complementary', primary: false },
  { name: 'Tipalti', fit: 'Enterprise-grade, 190+ countries, tax/fraud automation', verdict: 'At scale', primary: false },
  { name: 'PayQuicker', fit: 'Real-time micro-disbursements for affiliate networks', verdict: 'Complementary', primary: false },
]

/** Section 6 — Dual-rail architecture: crypto rail now, bank-escrow rail next. */
export default function DualRail() {
  const reduced = useReducedMotion()

  return (
    <section className="noise-overlay px-6 py-24 md:py-32" style={{ background: 'var(--ink)' }}>
      <div className="mx-auto max-w-container">
        <p className="eyebrow text-gold">Architecture — Dual-rail settlement</p>
        <h2 className="h2 mt-4 max-w-3xl">
          Crypto rail live today. <span className="text-gold-grad font-display italic">Bank escrow next.</span>
        </h2>
        <p className="body-lg mt-4 max-w-2xl text-text-mid">
          Two settlement rails, one source of truth. Members choose crypto or — once our bank
          escrow partner is onboarded — fiat. Both reconcile against the same immutable Kinjy
          ledger, entry for entry.
        </p>

        <div className="relative mt-12 grid items-stretch gap-6 lg:grid-cols-[1fr_auto_1fr]">
          {/* Rail 1: NowPayments */}
          <motion.div
            className="cloud-card gold flex flex-col p-6 sm:p-8"
            initial={reduced ? false : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-12%' }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="h3">NowPayments — crypto rail</h3>
              <span className="mono-data inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" /> live
              </span>
            </div>
            <p className="caption mt-2">Receipts → custody → USDT·BSC → safe wallet. Commissions out via Mass Payouts.</p>
            <ul className="mt-6 flex-1 space-y-4">
              {CRYPTO_FEATURES.map((f) => (
                <li key={f.text} className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold-soft">
                    <f.icon size={15} aria-hidden="true" />
                  </span>
                  <p className="text-sm leading-relaxed text-text-mid">{f.text}</p>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* reconciliation spine */}
          <motion.div
            className="flex flex-row items-center justify-center gap-3 lg:flex-col"
            initial={reduced ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.6 }}
          >
            <span className="h-px w-10 lg:h-10 lg:w-px" style={{ background: 'var(--grad-arc)' }} aria-hidden="true" />
            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/40 bg-ink-2 shadow-gold-ring">
              <BookLock size={20} className="text-gold-soft" aria-hidden="true" />
            </span>
            <p className="mono-data hidden max-w-[120px] text-center text-[0.65rem] leading-relaxed text-text-low lg:block">
              one immutable Kinjy ledger
            </p>
            <span className="h-px w-10 lg:h-10 lg:w-px" style={{ background: 'var(--grad-arc)' }} aria-hidden="true" />
          </motion.div>

          {/* Rail 2: Mangopay */}
          <motion.div
            className="cloud-card flex flex-col p-6 sm:p-8"
            initial={reduced ? false : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-12%' }}
            transition={{ delay: 0.12, duration: 0.6, ease: EASE }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="h3">Mangopay — bank escrow rail</h3>
              <span className="mono-data inline-flex items-center gap-1.5 rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-xs text-warning">
                <Clock size={12} aria-hidden="true" /> recommended
              </span>
            </div>
            <p className="caption mt-2">Fiat escrow purpose-built for marketplaces and multi-party commission chains.</p>
            <ul className="mt-6 flex-1 space-y-4">
              {BANK_FEATURES.map((f) => (
                <li key={f.text} className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky/15 text-sky">
                    <f.icon size={15} aria-hidden="true" />
                  </span>
                  <p className="text-sm leading-relaxed text-text-mid">{f.text}</p>
                </li>
              ))}
            </ul>
            <p className="mono-data mt-5 inline-flex w-fit items-center gap-2 rounded-full border border-indigo/50 bg-indigo/15 px-3.5 py-1.5 text-xs text-sky">
              <Clock size={12} aria-hidden="true" />
              Fiat cashout — coming after bank escrow partner onboarding
            </p>
          </motion.div>
        </div>

        {/* comparison mini-table */}
        <motion.div
          className="cloud-card mt-8 overflow-x-auto p-6 sm:p-8"
          initial={reduced ? false : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-12%' }}
          transition={{ delay: 0.15, duration: 0.6, ease: EASE }}
        >
          <p className="eyebrow text-text-low">Bank/fintech escrow candidates — evaluation</p>
          <table className="mt-5 w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="pb-3 pr-6 font-semibold text-text-hi">Provider</th>
                <th className="pb-3 pr-6 font-semibold text-text-hi">Why it fits a 10-level escrow</th>
                <th className="pb-3 font-semibold text-text-hi">Role</th>
              </tr>
            </thead>
            <tbody>
              {ALTERNATIVES.map((a) => (
                <tr key={a.name} className={cn('border-b border-white/5 last:border-0', a.primary && 'bg-gold/[0.04]')}>
                  <td className="py-3.5 pr-6">
                    <span className={cn('font-semibold', a.primary ? 'text-gold-soft' : 'text-text-hi')}>{a.name}</span>
                  </td>
                  <td className="py-3.5 pr-6 text-text-mid">{a.fit}</td>
                  <td className="py-3.5">
                    <span
                      className={cn(
                        'mono-data inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs',
                        a.primary ? 'border-gold/50 bg-gold/10 text-gold-soft' : 'border-white/10 bg-white/[0.03] text-text-mid',
                      )}
                    >
                      {a.primary && <Check size={12} aria-hidden="true" />}
                      {a.verdict}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

        {/* both rails reconcile */}
        <motion.div
          className="mt-8"
          initial={reduced ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.25, duration: 0.6 }}
        >
          <p className="mono-data mb-3 text-xs text-text-low">both rails append to the same ledger — never edit</p>
          <div className="grid gap-2 md:grid-cols-2">
            <LedgerRow id="8841207" label="Crypto rail — receipt settled USDT·BSC" amount="+$9.99" reconciled timestamp="now" />
            <LedgerRow id="po-55231" label="Crypto rail — Mass Payout to member wallet" amount="-$1.04" reconciled timestamp="now" />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
