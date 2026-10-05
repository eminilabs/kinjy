import { useApi } from '@/hooks/useApi'
import { kaluta, type Wallet } from '@/lib/api'

const usd = (value: string | number) =>
  `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/**
 * The member's money at a glance, above every section: what can be paid out
 * now, what is still in a dispute window, and how far the balance is from the
 * payout threshold.
 */
export default function WalletStrip() {
  const wallet = useApi<Wallet>(() => kaluta.account.wallet(), [])
  const w = wallet.data
  const pct = w ? Math.min(100, (Number(w.available) / Number(w.payout_threshold || 1)) * 100) : 0

  const items = w
    ? [
        { label: 'Available', value: usd(w.available), big: true, hint: 'Ready for the next batch' },
        { label: 'Pending', value: usd(w.pending), hint: 'In a dispute window' },
        { label: 'Lifetime earned', value: usd(w.lifetime_earned) },
        { label: 'Lifetime paid out', value: usd(w.lifetime_paid) },
      ]
    : []

  return (
    <section
      aria-label="Wallet"
      className="relative isolate overflow-hidden rounded-[24px] border border-[var(--cloud-border)] bg-[var(--cloud)] p-6 md:p-8"
    >
      <div aria-hidden="true" className="absolute -right-16 -top-24 -z-10 h-[300px] w-[300px] rounded-full bg-[#D9A648] opacity-25 blur-[90px]" />
      <div aria-hidden="true" className="absolute -bottom-28 -left-10 -z-10 h-[260px] w-[260px] rounded-full bg-sky opacity-20 blur-[90px]" />

      <div className="flex items-baseline justify-between gap-4">
        <p className="mono-data text-[0.7rem] uppercase tracking-[0.14em] text-gold-soft">Wallet</p>
        <p className="text-xs text-text-low">Reconciled line-by-line to the immutable ledger</p>
      </div>

      {wallet.loading && <p className="mt-6 text-sm text-text-low" role="status">Loading…</p>}
      {wallet.error && <p className="mt-6 text-sm text-text-low" role="alert">{wallet.error}</p>}

      {w && (
        <>
          <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-7 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            {items.map((i) => (
              <div key={i.label}>
                <dt className="text-sm text-text-mid">{i.label}</dt>
                <dd
                  className={
                    i.big
                      ? 'mt-1 text-[clamp(40px,5vw,60px)] font-bold leading-none tracking-[-0.04em] tabular-nums text-text-hi'
                      : 'mt-1 text-[clamp(26px,3vw,34px)] font-bold leading-none tracking-[-0.03em] tabular-nums text-text-hi'
                  }
                >
                  {i.value}
                </dd>
                {i.hint && <p className="mt-2 text-xs text-text-low">{i.hint}</p>}
              </div>
            ))}
          </dl>

          <div className="mt-8">
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-text-mid">Payout threshold</span>
              <span className="tabular-nums text-text-mid">
                {usd(w.available)} <span className="text-text-low">/ {usd(w.payout_threshold)}</span>
              </span>
            </div>
            <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-text-hi/10">
              <div className="h-full rounded-full bg-gradient-to-r from-gold-soft to-gold" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </>
      )}
    </section>
  )
}
