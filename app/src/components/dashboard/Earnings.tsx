import { useState } from 'react'
import { ArrowRight, Check, CircleDashed, Clock3, HandCoins, Landmark, Sparkles, Wallet as WalletIcon } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta, type CommissionsPage, type PayoutEligibility, type Wallet } from '@/lib/api'
import { Badge, KpiCard, Panel, PanelState, inputClass } from './primitives'

const usd = (value: string | number) =>
  `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const SOURCE_LABELS: Record<string, string> = {
  marketplace_order: 'Marketplace',
  service: 'Services',
  ad_purchase: 'Advertising',
  creator_revenue: 'Creator revenue',
  referral_pool_entry: 'Referral pool',
}

const BLOCKER_COPY: Record<string, string> = {
  kyc_required: 'Complete KinjyKYC verification',
  wallet_required: 'Add a payout wallet address',
  below_threshold: 'Reach the payout threshold',
}

/**
 * Earnings — the wallet, where the commission came from, and the payout gate.
 *
 * The three payout conditions (blueprint + info-payments.md) are shown together
 * and always, not only when they fail: a member who cannot be paid should know
 * exactly which of the three is missing rather than watching a balance sit still.
 */
export default function Earnings() {
  const wallet = useApi<Wallet>(() => kaluta.account.wallet(), [])
  const commissions = useApi<CommissionsPage>(() => kaluta.account.commissions({ limit: 10 }), [])
  const eligibility = useApi<PayoutEligibility>(() => kaluta.account.payoutEligibility(), [])

  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)

  const saveAddress = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!address.trim()) return
    setSaving(true)
    setSaveMessage(null)
    try {
      const result = await kaluta.account.addPayoutDestination({ address: address.trim() })
      setSaveMessage(result.note)
      setAddress('')
      eligibility.reload()
    } catch (err) {
      setSaveMessage(err instanceof ApiError ? err.message : 'Could not save the address')
    } finally {
      setSaving(false)
    }
  }

  // Commission has one rate and one level, so there is nothing to break down
  // by depth any more. What a member actually wants to know is which part of
  // the platform their sponsees are spending in.
  const bySource = commissions.data?.by_source ?? {}
  const sources = Object.entries(bySource).sort((a, b) => Number(b[1]) - Number(a[1]))
  const maxSource = Math.max(1, ...sources.map(([, amount]) => Number(amount)))

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
      <section className="lg:col-span-2" aria-label="Wallet">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4">
          <h2 className="text-[1.25rem] font-bold tracking-[-0.025em] text-text-hi">Wallet</h2>
          <p className="text-sm text-text-low">Balances reconcile line-by-line to the immutable ledger.</p>
        </div>
        <PanelState loading={wallet.loading} error={wallet.error}>
          {wallet.data && (
            <div className="space-y-4">
              <div className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 sm:gap-4 lg:grid-cols-4">
                <KpiCard icon={WalletIcon} tone="gold" featured label="Available" value={usd(wallet.data.available)} />
                <KpiCard icon={Clock3} tone="sky" label="Pending" value={usd(wallet.data.pending)} hint="In a dispute window" />
                <KpiCard icon={Sparkles} tone="emerald" label="Lifetime earned" value={usd(wallet.data.lifetime_earned)} />
                <KpiCard icon={Landmark} tone="coral" label="Lifetime paid out" value={usd(wallet.data.lifetime_paid)} />
              </div>

              {/* Progress toward the $1 batch threshold */}
              <div className="cloud-card p-5 md:p-6">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[0.95rem] font-semibold text-text-hi">Payout threshold</span>
                  <span className="mono-data text-sm text-text-mid">
                    {usd(wallet.data.available)} / {usd(wallet.data.payout_threshold)}
                  </span>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-text-hi/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold-soft to-gold"
                    style={{
                      width: `${Math.min(
                        100,
                        (Number(wallet.data.available) / Number(wallet.data.payout_threshold)) * 100,
                      )}%`,
                    }}
                  />
                </div>
                <p className="mt-3 text-sm text-text-low">
                  Commissions accrue in custody escrow and join the next batch once you clear{' '}
                  {usd(wallet.data.payout_threshold)}.
                </p>
              </div>
            </div>
          )}
        </PanelState>
      </section>

      <Panel
        title="Where your commission came from"
        subtitle="20% of Kinjy's revenue on everything the members you sponsored do."
      >
        <PanelState
          loading={commissions.loading}
          error={commissions.error}
          empty={commissions.data?.total === 0}
          emptyLabel="No commission yet. It appears as the people you sponsored transact."
          emptyNode={
            <div className="flex flex-col items-center py-8 text-center">
              <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl bg-sky/15 text-sky">
                <HandCoins size={22} />
              </span>
              <p className="mt-3 font-bold text-text-hi">No commission yet</p>
              <p className="mt-1 max-w-xs text-sm text-text-low">It appears as the people you sponsored transact.</p>
            </div>
          }
        >
          <div className="space-y-2">
            {sources.map(([source, amount]) => (
              <div key={source} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-sm capitalize text-text-low">
                  {SOURCE_LABELS[source] ?? source.replace(/_/g, ' ')}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-text-hi/10">
                  <div
                    className="h-full rounded-full bg-sky/70"
                    style={{ width: `${(Number(amount) / maxSource) * 100}%` }}
                  />
                </div>
                <span className="mono-data w-20 shrink-0 text-right text-sm text-text-mid">
                  {usd(amount)}
                </span>
              </div>
            ))}
          </div>
        </PanelState>
      </Panel>

      <Panel
        title="Getting paid"
        subtitle="All three conditions must hold before a payout batch includes you."
        action={
          eligibility.data ? (
            <Badge tone={eligibility.data.eligible ? 'good' : 'warn'}>
              {eligibility.data.eligible ? 'Eligible' : 'Action required'}
            </Badge>
          ) : undefined
        }
      >
        <PanelState loading={eligibility.loading} error={eligibility.error}>
          {eligibility.data && (
            <>
              <ul className="space-y-2">
                {[
                  { ok: eligibility.data.kyc_verified, label: 'Identity verified with KinjyKYC' },
                  { ok: eligibility.data.wallet_on_file, label: 'Payout wallet address on file' },
                  {
                    ok: Number(eligibility.data.accrued_usd) >= Number(eligibility.data.threshold_usd),
                    label: `Accrued at least ${usd(eligibility.data.threshold_usd)}`,
                  },
                ].map((row) => (
                  <li key={row.label} className="flex items-center gap-3 rounded-2xl bg-text-hi/[0.05] px-4 py-3 text-[0.95rem]">
                    <span
                      aria-hidden="true"
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${row.ok ? 'bg-emerald-400/20 text-emerald-300' : 'bg-amber-400/20 text-amber-300'}`}
                    >
                      {row.ok ? <Check size={14} /> : <CircleDashed size={14} />}
                    </span>
                    <span className={row.ok ? 'text-text-mid' : 'font-medium text-text-hi'}>{row.label}</span>
                  </li>
                ))}
              </ul>

              {eligibility.data.blocked_by && (
                <p className="mt-4 flex items-center gap-2 text-sm font-medium text-amber-200">
                  <ArrowRight size={14} aria-hidden="true" />
                  {BLOCKER_COPY[eligibility.data.blocked_by] ?? eligibility.data.blocked_by}
                </p>
              )}

              {!eligibility.data.wallet_on_file && (
                <form onSubmit={saveAddress} className="mt-5">
                  <label className="mb-2 block text-sm font-semibold text-text-mid" htmlFor="payout-address">
                    <WalletIcon size={13} className="mr-1 inline" aria-hidden="true" />
                    BSC wallet address (USDT)
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="payout-address"
                      className={inputClass}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="0x…"
                      spellCheck={false}
                    />
                    <button
                      type="submit"
                      disabled={saving || !address.trim()}
                      className="shrink-0 rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-3 text-sm font-bold text-ink disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>
                </form>
              )}

              {saveMessage && <p className="mt-3 text-sm text-text-mid">{saveMessage}</p>}
            </>
          )}
        </PanelState>
      </Panel>
    </div>
  )
}
