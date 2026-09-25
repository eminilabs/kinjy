import { useState } from 'react'
import { ArrowRight, Wallet as WalletIcon } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta, type CommissionsPage, type PayoutEligibility, type Wallet } from '@/lib/api'
import { Badge, Panel, PanelState, Stat, inputClass } from './primitives'

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
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel
        title="Wallet"
        subtitle="Balances reconcile line-by-line to the immutable ledger."
        className="lg:col-span-2"
      >
        <PanelState loading={wallet.loading} error={wallet.error}>
          {wallet.data && (
            <>
              <div className="grid gap-6 sm:grid-cols-4">
                <Stat label="Available" value={usd(wallet.data.available)} tone="gold" />
                <Stat label="Pending" value={usd(wallet.data.pending)} tone="muted" hint="In a dispute window" />
                <Stat label="Lifetime earned" value={usd(wallet.data.lifetime_earned)} />
                <Stat label="Lifetime paid out" value={usd(wallet.data.lifetime_paid)} tone="muted" />
              </div>

              {/* Progress toward the $1 batch threshold */}
              <div className="mt-6">
                <div className="flex items-baseline justify-between">
                  <span className="caption">Payout threshold</span>
                  <span className="mono-data text-sm text-text-mid">
                    {usd(wallet.data.available)} / {usd(wallet.data.payout_threshold)}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/8">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-gold-soft to-gold transition-[width] duration-700"
                    style={{
                      width: `${Math.min(
                        100,
                        (Number(wallet.data.available) / Number(wallet.data.payout_threshold)) * 100,
                      )}%`,
                    }}
                  />
                </div>
                <p className="caption mt-2">
                  Commissions accrue in custody escrow and join the next batch once you clear{' '}
                  {usd(wallet.data.payout_threshold)}.
                </p>
              </div>
            </>
          )}
        </PanelState>
      </Panel>

      <Panel
        title="Where your commission came from"
        subtitle="20% of Kinjy's revenue on everything the members you sponsored do."
      >
        <PanelState
          loading={commissions.loading}
          error={commissions.error}
          empty={commissions.data?.total === 0}
          emptyLabel="No commission yet. It appears as the people you sponsored transact."
        >
          <div className="space-y-2">
            {sources.map(([source, amount]) => (
              <div key={source} className="flex items-center gap-3">
                <span className="caption w-32 shrink-0 truncate capitalize">
                  {SOURCE_LABELS[source] ?? source.replace(/_/g, ' ')}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/6">
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
              <ul className="space-y-2.5">
                {[
                  { ok: eligibility.data.kyc_verified, label: 'Identity verified with KinjyKYC' },
                  { ok: eligibility.data.wallet_on_file, label: 'Payout wallet address on file' },
                  {
                    ok: Number(eligibility.data.accrued_usd) >= Number(eligibility.data.threshold_usd),
                    label: `Accrued at least ${usd(eligibility.data.threshold_usd)}`,
                  },
                ].map((row) => (
                  <li key={row.label} className="flex items-center gap-2.5 text-sm">
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 shrink-0 rounded-full ${row.ok ? 'bg-emerald-400' : 'bg-amber-400'}`}
                    />
                    <span className={row.ok ? 'text-text-mid' : 'text-text-hi'}>{row.label}</span>
                  </li>
                ))}
              </ul>

              {eligibility.data.blocked_by && (
                <p className="mt-4 flex items-center gap-2 text-sm text-amber-200">
                  <ArrowRight size={14} aria-hidden="true" />
                  {BLOCKER_COPY[eligibility.data.blocked_by] ?? eligibility.data.blocked_by}
                </p>
              )}

              {!eligibility.data.wallet_on_file && (
                <form onSubmit={saveAddress} className="mt-5">
                  <label className="caption mb-1.5 block" htmlFor="payout-address">
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
                      className="shrink-0 rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>
                </form>
              )}

              {saveMessage && <p className="caption mt-2 text-text-mid">{saveMessage}</p>}
            </>
          )}
        </PanelState>
      </Panel>
    </div>
  )
}
