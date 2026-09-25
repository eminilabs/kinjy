import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, BadgeCheck, Check, ClipboardCheck, ScanLine, Wallet, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EASE, useReducedMotion } from '@/components/creators/motion-utils'

const VALID_ADDRESS = '0x8Ba1f109551bD432803012645Ac136ddd64DBA72'

const QUEUE = [
  { name: 'Demo K.', balance: '$1.04', demo: true },
  { name: 'Diego M.', balance: '$3.18', demo: false },
  { name: 'Wanjiru N.', balance: '$12.40', demo: false },
]

/** Toggle row with snap-ease thumb. */
function GateToggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={cn(
        'relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-200 ease-cloud-ease',
        on ? 'border-success/50 bg-success/25' : 'border-white/15 bg-white/[0.06]',
      )}
    >
      <motion.span
        className={cn('absolute top-1 h-[18px] w-[18px] rounded-full', on ? 'bg-success' : 'bg-text-low')}
        animate={{ left: on ? 26 : 5 }}
        transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
      />
    </button>
  )
}

/** Section 5 — Eligibility gate: KYC + backoffice wallet before commissions pay out. */
export default function EligibilityGate() {
  const reduced = useReducedMotion()
  const [kyc, setKyc] = useState(true)
  const [address, setAddress] = useState(VALID_ADDRESS)

  const formatOk = useMemo(() => /^0x[0-9a-fA-F]{40}$/.test(address.trim()), [address])
  const checksumCasing = useMemo(() => {
    const hex = address.trim().slice(2)
    return formatOk && /[a-z]/.test(hex) && /[A-Z]/.test(hex)
  }, [address, formatOk])
  const walletOk = formatOk
  const eligible = kyc && walletOk

  return (
    <section className="noise-overlay twilight-field px-6 py-24 md:py-32">
      <div className="mx-auto max-w-container">
        <p className="eyebrow text-gold">Backoffice — Eligibility gate</p>
        <h2 className="h2 mt-4 max-w-2xl">
          Verified and wallet-ready, <span className="text-gold-grad font-display italic">or the escrow waits.</span>
        </h2>
        <p className="body-lg mt-4 max-w-2xl text-text-mid">
          To qualify for commission cashouts, a member must have a verified account and a crypto
          wallet address saved in their backoffice. Everyone still accrues — but ineligible members
          hold in escrow with a clear "action required" until both boxes tick green.
        </p>

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-2">
          {/* checklist cards */}
          <div className="space-y-6">
            {/* Card 1: KinjyKYC */}
            <motion.div
              className={cn('cloud-card p-6 transition-colors duration-300', kyc && 'shadow-gold-ring')}
              initial={reduced ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={{ duration: 0.55, ease: EASE }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <span
                    className={cn(
                      'flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-300',
                      kyc ? 'bg-success/15 text-success' : 'bg-white/[0.06] text-text-low',
                    )}
                  >
                    <BadgeCheck size={19} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="font-semibold text-text-hi">1 · Account verified via KinjyKYC</p>
                    <p className="caption mt-1 max-w-sm">
                      Identity verified once, recognized across the society — payouts, leader badges
                      and escrow release all key off the same KYC record.
                    </p>
                    <p
                      className={cn(
                        'mono-data mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs',
                        kyc ? 'border-success/40 bg-success/10 text-success' : 'border-warning/40 bg-warning/10 text-warning',
                      )}
                    >
                      {kyc ? <Check size={12} aria-hidden="true" /> : <X size={12} aria-hidden="true" />}
                      {kyc ? 'kyc_status: verified' : 'kyc_status: unverified'}
                    </p>
                  </div>
                </div>
                <GateToggle on={kyc} onChange={setKyc} label="Toggle KYC verified" />
              </div>
            </motion.div>

            {/* Card 2: wallet address with checksum validation */}
            <motion.div
              className={cn('cloud-card p-6 transition-colors duration-300', walletOk && 'shadow-gold-ring')}
              initial={reduced ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={{ delay: 0.12, duration: 0.55, ease: EASE }}
            >
              <div className="flex items-start gap-4">
                <span
                  className={cn(
                    'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors duration-300',
                    walletOk ? 'bg-success/15 text-success' : 'bg-white/[0.06] text-text-low',
                  )}
                >
                  <Wallet size={19} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-text-hi">2 · Crypto wallet in backoffice</p>
                  <p className="caption mt-1">
                    BSC (BEP-20) address where USDT cashouts arrive. Try editing it — validation is live.
                  </p>
                  <div
                    className={cn(
                      'mono-data mt-4 flex items-center gap-2 rounded-card-sm border bg-ink/70 px-3 py-2.5 text-xs transition-colors duration-300',
                      walletOk ? 'border-success/40' : address.trim() ? 'border-danger/50' : 'border-white/15',
                    )}
                  >
                    <ScanLine size={14} className="shrink-0 text-text-low" aria-hidden="true" />
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      spellCheck={false}
                      aria-label="BSC wallet address"
                      className="w-full min-w-0 bg-transparent text-gold-soft outline-none placeholder:text-text-low"
                      placeholder="0x… (42 characters)"
                    />
                    {walletOk ? (
                      <Check size={14} className="shrink-0 text-success" aria-hidden="true" />
                    ) : (
                      <X size={14} className="shrink-0 text-danger" aria-hidden="true" />
                    )}
                  </div>
                  <div className="mono-data mt-2.5 flex flex-wrap gap-2 text-[0.7rem]">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5',
                        formatOk ? 'border-success/40 bg-success/10 text-success' : 'border-danger/40 bg-danger/10 text-danger',
                      )}
                    >
                      {formatOk ? <Check size={10} aria-hidden="true" /> : <X size={10} aria-hidden="true" />}
                      format 0x + 40 hex
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5',
                        checksumCasing
                          ? 'border-success/40 bg-success/10 text-success'
                          : 'border-white/10 bg-white/[0.03] text-text-low',
                      )}
                    >
                      {checksumCasing ? <Check size={10} aria-hidden="true" /> : <ClipboardCheck size={10} aria-hidden="true" />}
                      {checksumCasing ? 'EIP-55 checksum casing detected' : 'checksum casing — paste checksummed address'}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* payout queue reacting */}
          <motion.div
            className="cloud-card p-6 sm:p-8"
            initial={reduced ? false : { opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ delay: 0.2, duration: 0.55, ease: EASE }}
          >
            <p className="eyebrow text-text-low">Next Mass Payouts batch — live queue</p>
            <ul className="mt-5 space-y-3">
              {QUEUE.map((m) => {
                const blocked = m.demo && !eligible
                return (
                  <li
                    key={m.name}
                    className={cn(
                      'flex flex-wrap items-center gap-3 rounded-card-md border p-4 transition-colors duration-300',
                      blocked ? 'border-warning/40 bg-warning/[0.06]' : 'border-white/10 bg-white/[0.02]',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-full font-display text-sm',
                        blocked ? 'bg-warning/20 text-warning' : 'bg-indigo/40 text-text-hi',
                      )}
                    >
                      {m.name[0]}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-text-hi">{m.name}</p>
                      <p className="mono-data text-[0.7rem] text-text-low">accrued {m.balance} USDT·BSC</p>
                    </div>
                    <AnimatePresence mode="wait">
                      {blocked ? (
                        <motion.div
                          key="blocked"
                          initial={reduced ? false : { opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.3, ease: EASE }}
                          className="flex flex-col items-end gap-1.5"
                        >
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/50 bg-warning/15 px-3 py-1 text-xs font-semibold text-warning">
                            <AlertTriangle size={12} aria-hidden="true" /> Action required
                          </span>
                          <span className="mono-data text-[0.65rem] text-text-low">
                            missing: {!kyc && 'KYC'}{!kyc && !walletOk && ' + '}{!walletOk && 'wallet'}
                          </span>
                        </motion.div>
                      ) : (
                        <motion.span
                          key="queued"
                          initial={reduced ? false : { opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -10 }}
                          transition={{ duration: 0.3, ease: EASE }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-semibold text-success"
                        >
                          <Check size={12} aria-hidden="true" /> Queued for batch
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </li>
                )
              })}
            </ul>
            <p className="caption mt-5 border-t border-white/10 pt-4">
              Ineligible members keep accruing in custody escrow — nothing is lost and nothing is
              clawed back. The moment both checks pass, their full balance rides the very next batch.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
