import { useState } from 'react'
import { BadgeCheck, Lock } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta, type KycStatus } from '@/lib/api'
import { Badge, Panel, PanelState } from './primitives'

const TONE = {
  verified: 'good',
  pending: 'warn',
  rejected: 'bad',
  unverified: 'neutral',
} as const

/**
 * KinjyKYC (blueprint §20).
 *
 * Payment and verification are deliberately separate: paying the annual fee
 * does not verify anyone, and a failed check does not consume the year that was
 * paid for. The panel shows both facts independently for that reason.
 */
export default function Verification() {
  const kyc = useApi<KycStatus>(() => kaluta.account.kyc(), [])
  const [starting, setStarting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const start = async () => {
    setStarting(true)
    setMessage(null)
    try {
      const result = await kaluta.account.startKyc()
      setMessage(`Verification ${result.status}. Attempt ${result.attempt ?? 1}.`)
      kyc.reload()
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : 'Could not start verification')
    } finally {
      setStarting(false)
    }
  }

  return (
    <Panel
      title="Identity verification"
      subtitle="Required before you can take part in affiliate earnings."
      action={
        kyc.data ? <Badge tone={TONE[kyc.data.status]}>{kyc.data.status}</Badge> : undefined
      }
    >
      <PanelState loading={kyc.loading} error={kyc.error}>
        {kyc.data && (
          <>
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="caption">Annual fee ({kyc.data.year})</dt>
                <dd className="mono-data mt-1 text-text-hi">
                  ${kyc.data.fee_usd} {kyc.data.fee_paid ? '· paid' : '· unpaid'}
                </dd>
              </div>
              <div>
                <dt className="caption">Attempts used</dt>
                <dd className="mono-data mt-1 text-text-hi">
                  {kyc.data.attempts_used} / {kyc.data.attempts_allowed}
                </dd>
              </div>
              <div>
                <dt className="caption">Valid until</dt>
                <dd className="mono-data mt-1 text-text-hi">{kyc.data.expires_on ?? '—'}</dd>
              </div>
            </dl>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              {kyc.data.status === 'verified' ? (
                <p className="flex items-center gap-2 text-sm text-emerald-200">
                  <BadgeCheck size={16} aria-hidden="true" />
                  Verified — you can receive affiliate payouts.
                </p>
              ) : !kyc.data.fee_paid ? (
                <p className="text-sm text-text-mid">
                  Pay the ${kyc.data.fee_usd} annual fee to unlock verification. Paying does not
                  verify you on its own — the identity check still has to pass.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={start}
                  disabled={starting || kyc.data.attempts_used >= kyc.data.attempts_allowed}
                  className="rounded-full bg-gold px-5 py-2.5 text-sm font-semibold text-ink disabled:opacity-40"
                >
                  Start verification
                </button>
              )}
            </div>

            {message && <p className="caption mt-3 text-text-mid">{message}</p>}

            <p className="caption mt-5 flex items-start gap-2">
              <Lock size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
              Only the verification <em>result</em> is stored on Kinjy. Your identity documents stay
              with the verification provider.
            </p>
          </>
        )}
      </PanelState>
    </Panel>
  )
}
