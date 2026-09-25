import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Bot, Check, ShieldQuestion, Sparkles } from 'lucide-react'
import { Chip, SubSection } from './primitives'
import { ModeChip } from '@/components/ui-kit'
import { cn } from '@/lib/utils'

interface Row {
  id: string
  label: string
  amount: string
  variance?: string
}

const ROWS: Row[] = [
  { id: 'SWEEP-8841', label: 'Creator payout batch · 2,140 wallets', amount: '$184,220.00' },
  { id: 'SWEEP-8842', label: 'Ad revenue accrual · 38 advertisers', amount: '$96,412.10' },
  { id: 'SWEEP-8843', label: 'Marketplace settlement · 512 orders', amount: '$61,204.37', variance: '+$0.37 FX rounding' },
  { id: 'SWEEP-8844', label: 'Kinjy Leaders reserve · snapshot', amount: '$250,000.00' },
  { id: 'SWEEP-8845', label: 'Subscription recognition · daily', amount: '$42,180.00' },
]

const NIGHTS = [
  { key: 'nov-29', label: 'Night · Nov 29', clean: true },
  { key: 'nov-28', label: 'Night · Nov 28', clean: false },
] as const

type NightKey = (typeof NIGHTS)[number]['key']

/**
 * ReconciliationBots (C6) — nightly ledger sweep: a bot scans every ledger row,
 * auto-flags variance with a red row and an investigation card, and reports the
 * "0 unresolved variances" green state on clean nights.
 */
export default function ReconciliationBots() {
  const [night, setNight] = useState<NightKey>('nov-29')
  const [sweepKey, setSweepKey] = useState(0)
  const reduceMotion = useReducedMotion()
  const clean = NIGHTS.find((n) => n.key === night)?.clean ?? true

  return (
    <SubSection
      id="reconciliation-bots"
      eyebrow="C6 · Ledger Reconciliation Bots"
      title={
        <>
          <Bot size={19} className="me-2 inline text-gold" aria-hidden="true" />
          While the world sleeps, the bots balance the books.
        </>
      }
      blurb="Every night at 04:00 UTC a reconciliation bot sweeps all ledger rows against wallet balances and gateway settlements. Variance is auto-flagged, investigated, and drafted into a corrective entry — humans only approve."
    >
      <div className="flex flex-wrap items-center gap-2">
        {NIGHTS.map((n) => (
          <ModeChip
            key={n.key}
            label={n.label}
            active={night === n.key}
            onClick={() => {
              setNight(n.key)
              setSweepKey((k) => k + 1)
            }}
          />
        ))}
        <span className="ms-auto">
          {clean ? (
            <Chip tone="success">
              <Sparkles size={10} aria-hidden="true" /> 0 unresolved variances
            </Chip>
          ) : (
            <Chip tone="danger">1 variance flagged</Chip>
          )}
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Sweep table */}
        <div className="relative overflow-hidden rounded-card-md border border-white/8">
          {/* bot sweep hairline */}
          {!reduceMotion && (
            <motion.div
              key={sweepKey}
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[2px]"
              style={{ background: 'var(--grad-arc)', boxShadow: '0 0 14px rgba(217,166,72,0.65)' }}
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: '340px', opacity: [1, 1, 0] }}
              transition={{ duration: 1.2, ease: [0.65, 0, 0.35, 1], delay: 0.3 }}
            />
          )}

          <div className="mono-data grid grid-cols-[1fr_96px_70px] items-center gap-3 border-b border-white/10 bg-ink-3/80 px-4 py-2.5 text-[0.7rem] uppercase tracking-[0.12em] text-text-low">
            <span>Sweep row</span>
            <span className="text-end">Amount</span>
            <span className="text-end">Bot</span>
          </div>
          {ROWS.map((r) => {
            const flagged = !clean && r.variance
            return (
              <div
                key={r.id}
                className={cn(
                  'mono-data grid grid-cols-[1fr_96px_70px] items-center gap-3 border-b border-white/5 px-4 py-3 text-[0.78rem]',
                  flagged ? 'bg-danger/[0.08]' : 'hover:bg-white/[0.03]',
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-text-hi">{r.label}</span>
                  <span className={cn('block truncate text-[0.68rem]', flagged ? 'text-danger' : 'text-text-low')}>
                    #{r.id}
                    {flagged ? ` · variance ${r.variance}` : ''}
                  </span>
                </span>
                <span className={cn('text-end', flagged ? 'text-danger' : 'text-gold-soft')}>{r.amount}</span>
                <span className="flex justify-end">
                  {flagged ? (
                    <Chip tone="danger">flagged</Chip>
                  ) : (
                    <span className="text-success" title="Reconciled">
                      <Check size={14} aria-hidden="true" />
                    </span>
                  )}
                </span>
              </div>
            )
          })}
          <div className="mono-data flex items-center justify-between gap-3 bg-ink-3/60 px-4 py-2.5 text-[0.7rem] text-text-low">
            <span>bot RECON-7 · 18,204 rows swept · 42s</span>
            <span className={clean ? 'text-success' : 'text-danger'}>
              {clean ? 'all rows reconciled' : 'investigation opened'}
            </span>
          </div>
        </div>

        {/* Status / investigation card */}
        <AnimatePresence mode="wait">
          {clean ? (
            <motion.aside
              key="clean"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col rounded-card-md border border-success/30 bg-success/[0.05] p-4"
            >
              <p className="caption flex items-center gap-2 font-bold uppercase tracking-[0.14em] text-success">
                <Sparkles size={13} aria-hidden="true" /> Clean sweep
              </p>
              <p className="mono-data mt-3 text-[1.6rem] leading-none text-success">0</p>
              <p className="mt-1 text-sm text-text-mid">unresolved variances — ledger, wallets and gateway agree to the cent.</p>
              <p className="mono-data mt-auto pt-4 text-[0.68rem] text-text-low">
                streak: 21 consecutive clean nights
              </p>
            </motion.aside>
          ) : (
            <motion.aside
              key="flagged"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col rounded-card-md border border-danger/30 bg-danger/[0.05] p-4"
            >
              <p className="caption flex items-center gap-2 font-bold uppercase tracking-[0.14em] text-danger">
                <ShieldQuestion size={13} aria-hidden="true" /> Investigation · INV-114
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-mid">
                <span className="mono-data text-danger">SWEEP-8843</span> settled{' '}
                <strong className="text-text-hi">+$0.37</strong> above order sum. Bot traced it to FX rounding at the
                payment gateway (KES→USD, 3 orders).
              </p>
              <p className="mt-2 text-sm leading-relaxed text-text-mid">
                Corrective entry drafted to <span className="mono-data text-gold-soft">4035 · Rounding</span> —
                awaiting one human approval.
              </p>
              <p className="mono-data mt-auto pt-4 text-[0.68rem] text-text-low">
                opened 04:00:31 UTC · resolved by 09:12 · 0 user impact
              </p>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </SubSection>
  )
}
