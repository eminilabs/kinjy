import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { LedgerRow, ModeChip } from '@/components/ui-kit'
import { cn } from '@/lib/utils'

type Category = 'payouts' | 'ads' | 'marketplace' | 'other'

interface Tx {
  id: string
  type: string
  from: string
  to: string
  amount: string
  gl: string
  category: Category
  debit: { account: string; amount: string }
  credit: { account: string; amount: string }
}

const TXS: Tx[] = [
  {
    id: 'TX-90412', type: 'Tip', from: '@demo.creates', to: '@kofimusic', amount: '$4.50', gl: '2010 · Creator wallet',
    category: 'other',
    debit: { account: '1010 · Cash', amount: '$4.50' }, credit: { account: '2010 · Creator wallet', amount: '$4.50' },
  },
  {
    id: 'TX-90411', type: 'Ad purchase', from: 'Acme Safaris Ltd', to: 'Ads Engine', amount: '$100.00', gl: '4020 · Ad revenue',
    category: 'ads',
    debit: { account: '1010 · Cash', amount: '$100.00' }, credit: { account: '4020 · Ad revenue', amount: '$100.00' },
  },
  {
    id: 'TX-90409', type: 'Marketplace order', from: '@j.mwangi', to: 'Zanzibar Weavers', amount: '$120.00', gl: '4030 · Marketplace GMV',
    category: 'marketplace',
    debit: { account: '1010 · Cash', amount: '$120.00' }, credit: { account: '4030 · Marketplace GMV', amount: '$120.00' },
  },
  {
    id: 'TX-90407', type: 'Direct commission', from: 'Kinjy revenue', to: '@nadia.b', amount: '$5.00', gl: '5010 · Commission expense',
    category: 'payouts',
    debit: { account: '5010 · Commission expense', amount: '$5.00' }, credit: { account: '1010 · Cash', amount: '$5.00' },
  },
  {
    id: 'TX-90405', type: 'Subscription', from: '@li.wei', to: 'Premium annual', amount: '$99.00', gl: '4010 · Subscriptions',
    category: 'other',
    debit: { account: '1010 · Cash', amount: '$99.00' }, credit: { account: '4010 · Subscription revenue', amount: '$99.00' },
  },
  {
    id: 'TX-90399', type: 'Kinjy Leaders batch', from: 'Leaders pool reserve', to: '10,000 leaders', amount: '$250,000.00', gl: '5020 · Kinjy Leaders distributions',
    category: 'payouts',
    debit: { account: '5020 · Leader distributions', amount: '$250,000.00' }, credit: { account: '1010 · Cash', amount: '$250,000.00' },
  },
  {
    id: 'TX-90395', type: 'Refund', from: 'Kinjy', to: '@t.okafor', amount: '$12.00', gl: '4035 · Refunds',
    category: 'marketplace',
    debit: { account: '4035 · Refunds', amount: '$12.00' }, credit: { account: '1010 · Cash', amount: '$12.00' },
  },
  {
    id: 'TX-90390', type: 'KYC fee', from: '@s.mensah', to: 'KinjyKYC', amount: '$10.00', gl: '4050 · Verification fees',
    category: 'other',
    debit: { account: '1010 · Cash', amount: '$10.00' }, credit: { account: '4050 · Verification fees', amount: '$10.00' },
  },
]

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'payouts', label: 'Payouts' },
  { key: 'ads', label: 'Ads' },
  { key: 'marketplace', label: 'Marketplace' },
] as const

type FilterKey = (typeof FILTERS)[number]['key']

/**
 * LedgerSection — refinement #21. Immutable Transaction Ledger + General Ledger
 * (Singapore accounting). Filter chips with FLIP; hovering a row reveals its paired
 * double-entry GL posting; a gold hairline "reconciliation pass" sweeps once on entry.
 */
export default function LedgerSection() {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [hovered, setHovered] = useState<Tx | null>(null)
  const [swept, setSwept] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setSwept(true), 1800)
    return () => window.clearTimeout(t)
  }, [])

  const rows = TXS.filter((tx) => filter === 'all' || tx.category === filter)

  return (
    <section aria-labelledby="ledger-heading" className="border-t border-white/8 px-5 py-10 md:px-8">
      <p className="eyebrow text-gold">Refinement #21 · Immutable ledger</p>
      <h2 id="ledger-heading" className="h3 mt-2 text-xl">
        Every cent, written in stone.
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-text-mid">
        Transaction Ledger + General Ledger (Singapore accounting standards). Wallet balances
        reconcile to ledger entries — always.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <ModeChip key={f.key} label={f.label} active={filter === f.key} onClick={() => setFilter(f.key)} />
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* Ledger table with reconciliation sweep */}
        <div className="relative overflow-hidden rounded-card-md border border-white/8">
          {/* gold hairline reconciliation pass */}
          {!swept && (
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[2px]"
              style={{ background: 'var(--grad-arc)', boxShadow: '0 0 14px rgba(217,166,72,0.65)' }}
              initial={{ y: 0, opacity: 1 }}
              animate={{ y: '460px', opacity: [1, 1, 0] }}
              transition={{ duration: 1.2, ease: [0.65, 0, 0.35, 1], delay: 0.4 }}
            />
          )}

          <div className="mono-data grid grid-cols-[86px_1fr_1fr_96px_32px] items-center gap-3 border-b border-white/10 bg-ink-3/80 px-4 py-2.5 text-[0.7rem] uppercase tracking-[0.12em] text-text-low md:grid-cols-[96px_130px_1fr_110px_180px_36px]">
            <span>TX ID</span>
            <span className="hidden md:inline">Type</span>
            <span>From → To</span>
            <span className="text-end">Amount</span>
            <span className="hidden md:inline">GL Account</span>
            <span className="text-end" title="Status">
              ✓
            </span>
          </div>

          <div onMouseLeave={() => setHovered(null)}>
            <AnimatePresence initial={false} mode="popLayout">
              {rows.map((tx, i) => (
                <motion.div
                  layout
                  key={tx.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.32, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                  onMouseEnter={() => setHovered(tx)}
                  onFocus={() => setHovered(tx)}
                  tabIndex={0}
                  className={cn(
                    'mono-data grid grid-cols-[86px_1fr_1fr_96px_32px] items-center gap-3 border-b border-white/5 px-4 py-3 text-[0.8rem] transition-colors duration-200 md:grid-cols-[96px_130px_1fr_110px_180px_36px]',
                    hovered?.id === tx.id ? 'bg-gold/8' : 'hover:bg-white/[0.03]',
                  )}
                >
                  <span className="text-text-low">#{tx.id}</span>
                  <span className="hidden text-text-hi md:inline">{tx.type}</span>
                  <span className="truncate text-text-mid">
                    {tx.from} <span className="text-gold">→</span> {tx.to}
                  </span>
                  <span className="text-end text-gold-soft">{tx.amount}</span>
                  <span className="hidden truncate text-text-low md:inline">{tx.gl}</span>
                  <span className="flex justify-end text-success" title="Reconciled">
                    <Check size={14} aria-hidden="true" />
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Paired GL entry mini-panel */}
        <aside
          aria-live="polite"
          className="rounded-card-md border border-white/8 bg-ink-3/50 p-4"
        >
          <p className="caption uppercase tracking-[0.14em]">General Ledger · double-entry</p>
          <AnimatePresence mode="wait">
            {hovered ? (
              <motion.div
                key={hovered.id}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.2 }}
                className="mt-3 space-y-2"
              >
                <LedgerRow
                  id={`${hovered.id}-D`}
                  label={`DEBIT · ${hovered.debit.account}`}
                  amount={hovered.debit.amount}
                  reconciled
                />
                <LedgerRow
                  id={`${hovered.id}-C`}
                  label={`CREDIT · ${hovered.credit.account}`}
                  amount={hovered.credit.amount}
                  reconciled
                />
                <p className="mono-data pt-1 text-[0.72rem] text-text-low">
                  Posted · immutable · hash-chained
                </p>
              </motion.div>
            ) : (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 text-sm text-text-low"
              >
                Hover a transaction to inspect its paired GL posting — debit and credit,
                reconciled to the cent.
              </motion.p>
            )}
          </AnimatePresence>
        </aside>
      </div>
    </section>
  )
}
