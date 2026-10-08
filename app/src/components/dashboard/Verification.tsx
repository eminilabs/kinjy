import { useState } from 'react'
import { BadgeCheck, CalendarClock, Check, Clock3, CreditCard, Lock, RotateCcw, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta, type KycStatus } from '@/lib/api'
import { Badge, KpiCard, Panel, PanelState } from './primitives'
import { cn } from '@/lib/utils'

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

  const status = kyc.data?.status
  const headline = {
    verified: { icon: ShieldCheck, tile: 'bg-emerald-400/20 text-emerald-300', title: 'You are verified', text: 'Your identity check passed — you can receive affiliate payouts.' },
    pending: { icon: Clock3, tile: 'bg-amber-400/20 text-amber-300', title: 'Verification in progress', text: 'The check is running. This page updates when it finishes.' },
    rejected: { icon: ShieldAlert, tile: 'bg-red-400/20 text-red-300', title: 'The check did not pass', text: 'You can try again while you still have attempts left.' },
    unverified: { icon: ShieldQuestion, tile: 'bg-gold/20 text-gold-soft', title: 'Not verified yet', text: 'Verification is required before you can take part in affiliate earnings.' },
  }[status ?? 'unverified']

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
          <div className="space-y-6">
            <div className="flex items-start gap-4 rounded-2xl bg-text-hi/[0.05] p-5">
              <span aria-hidden="true" className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-2xl', headline.tile)}>
                <headline.icon size={22} />
              </span>
              <div className="min-w-0">
                <p className="text-[1.15rem] font-bold tracking-[-0.02em] text-text-hi">{headline.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-text-low">{headline.text}</p>
              </div>
            </div>

            {/* Where you are: pay, pass the check, done. Paying alone is not verification. */}
            <ol className="grid grid-cols-3 gap-2" aria-label="Verification steps">
              {[
                { label: 'Annual fee', done: kyc.data.fee_paid },
                { label: 'Identity check', done: kyc.data.status === 'verified', current: kyc.data.fee_paid && kyc.data.status !== 'verified' },
                { label: 'Verified', done: kyc.data.status === 'verified' },
              ].map((step, i) => (
                <li key={step.label} className="flex flex-col items-center text-center">
                  <span
                    className={cn(
                      'grid h-9 w-9 place-items-center rounded-full text-sm font-bold',
                      step.done
                        ? 'bg-emerald-400/25 text-emerald-300'
                        : step.current
                          ? 'bg-gradient-to-br from-gold-soft to-gold text-ink'
                          : 'bg-text-hi/10 text-text-low',
                    )}
                  >
                    {step.done ? <Check size={16} aria-hidden="true" /> : i + 1}
                  </span>
                  <span className={cn('mt-2 text-xs font-semibold sm:text-sm', step.done || step.current ? 'text-text-hi' : 'text-text-low')}>
                    {step.label}
                  </span>
                </li>
              ))}
            </ol>

            <dl className="grid grid-cols-[repeat(1,minmax(0,1fr))] gap-3 sm:grid-cols-3 sm:gap-4">
              <KpiCard
                icon={CreditCard}
                tone="gold"
                label={`Annual fee (${kyc.data.year})`}
                value={`$${kyc.data.fee_usd}`}
                hint={kyc.data.fee_paid ? 'Paid' : 'Unpaid'}
              />
              <KpiCard
                icon={RotateCcw}
                tone="sky"
                label="Attempts used"
                value={`${kyc.data.attempts_used} / ${kyc.data.attempts_allowed}`}
              />
              <KpiCard
                icon={CalendarClock}
                tone="emerald"
                label="Valid until"
                value={kyc.data.expires_on ?? '—'}
              />
            </dl>

            <div className="flex flex-wrap items-center gap-3">
              {kyc.data.status === 'verified' ? (
                <p className="flex items-center gap-2 text-sm font-medium text-emerald-300">
                  <BadgeCheck size={16} aria-hidden="true" />
                  Verified — you can receive affiliate payouts.
                </p>
              ) : !kyc.data.fee_paid ? (
                <p className="text-sm leading-relaxed text-text-mid">
                  Pay the ${kyc.data.fee_usd} annual fee to unlock verification. Paying does not
                  verify you on its own — the identity check still has to pass.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={start}
                  disabled={starting || kyc.data.attempts_used >= kyc.data.attempts_allowed}
                  className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-7 py-3 text-sm font-bold text-ink shadow-[0_12px_24px_-12px_rgba(169,118,28,.6)] disabled:opacity-40"
                >
                  Start verification
                </button>
              )}
            </div>

            {message && <p className="rounded-2xl bg-gold/10 px-5 py-3 text-sm text-text-hi">{message}</p>}

            <p className="flex items-start gap-2.5 border-t border-[var(--cloud-border)] pt-5 text-sm leading-relaxed text-text-low">
              <Lock size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
              Only the verification <em>result</em> is stored on Kinjy. Your identity documents stay
              with the verification provider.
            </p>
          </div>
        )}
      </PanelState>
    </Panel>
  )
}
