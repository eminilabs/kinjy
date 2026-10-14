import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import AppShell from '@/components/app/AppShell'
import ErrorLine from '@/components/studio/ErrorLine'
import { when } from '@/components/studio/format'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta } from '@/lib/api'

const button = 'rounded-full border border-text-low/40 px-4 py-2 text-sm font-semibold text-text-hi hover:border-gold/50 disabled:opacity-40'
const primary = 'rounded-full bg-gold-soft px-4 py-2 text-sm font-bold text-ink disabled:opacity-40'
const planName = (tier: string | null) => tier ? tier[0].toUpperCase() + tier.slice(1) : ''
const message = (error: unknown) => error instanceof ApiError ? error.message : 'Could not reach Kinjy. Try again.'

function Payment({ id, canSimulate, onChanged }: { id: string; canSimulate: boolean; onChanged: () => void }) {
  const payment = useApi(() => kaluta.subscriptions.payment(id), [id])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const value = payment.data
  const terminal = value && (['failed', 'expired'].includes(value.status) || (['finished', 'refunded'].includes(value.status) && value.access_synced))
  useEffect(() => {
    if (!value || terminal) return
    const timer = window.setTimeout(payment.reload, 3000)
    return () => window.clearTimeout(timer)
  }, [value, terminal, payment.reload])
  useEffect(() => { if (terminal) onChanged() }, [terminal, onChanged])

  const act = async (action: 'settle' | 'refund' | 'sync') => {
    setBusy(true); setError(null)
    try {
      if (action === 'settle') await kaluta.subscriptions.simulate(id)
      else if (action === 'refund') await kaluta.subscriptions.simulateRefund(id)
      else await kaluta.subscriptions.sync(id)
      payment.reload(); onChanged()
    } catch (err) { setError(message(err)) }
    finally { setBusy(false) }
  }

  return (
    <section className="cloud-card space-y-3 p-5" aria-label="Payment">
      <h2 className="text-lg font-semibold text-text-hi">Payment</h2>
      {!value && !payment.error && <p role="status">Opening payment…</p>}
      {value && <>
        <p className="text-text-hi">{planName(value.tier)} · {value.period === 'yearly' ? 'One year' : 'One month'} · ${value.amount} {value.currency}</p>
        {value.mock && <p className="rounded-card-sm border border-gold/40 p-3 text-sm text-text-hi">Development simulation. No money is charged. Simulated access is never accepted in production.</p>}
        <p role="status" className="text-sm text-text-hi">{value.status === 'finished'
          ? value.access_synced ? 'Payment confirmed. Your paid period has been recorded.' : 'Payment confirmed. Activating access…'
          : value.status === 'refunded' ? value.access_synced ? 'Refund recorded. Access from this payment has been removed.' : 'Refund recorded. Updating access…'
          : ['failed', 'expired'].includes(value.status) ? `Payment ${value.status}. No access was activated.` : 'Waiting for payment confirmation.'}</p>
        {!value.mock && !['finished', 'refunded', 'failed', 'expired'].includes(value.status) && value.pay_address && value.pay_amount && (
          <div className="space-y-2 break-all text-sm text-text-hi"><p>Send exactly {value.pay_amount} {value.pay_currency?.toUpperCase()} using the matching network.</p><p>Payment address: <code>{value.pay_address}</code></p><p className="text-text-mid">Access starts only after the payment provider confirms payment.</p></div>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy || payment.loading} onClick={payment.reload} className={button}>Refresh payment</button>
          {canSimulate && value.mock && !['finished', 'refunded'].includes(value.status) && <button type="button" disabled={busy} onClick={() => void act('settle')} className={primary}>Simulate successful payment</button>}
          {canSimulate && value.mock && value.status === 'finished' && <button type="button" disabled={busy} onClick={() => void act('refund')} className={button}>Simulate refund</button>}
          {['finished', 'refunded'].includes(value.status) && !value.access_synced && <button type="button" disabled={busy} onClick={() => void act('sync')} className={button}>Retry access update</button>}
        </div>
      </>}
      {(error ?? payment.error) && <ErrorLine text={(error ?? payment.error) as string} />}
    </section>
  )
}

export default function Subscription() {
  const [params, setParams] = useSearchParams()
  const catalog = useApi(() => kaluta.subscriptions.catalog(), [])
  const membership = useApi(() => kaluta.subscriptions.me(), [])
  const options = useApi(() => kaluta.subscriptions.options(), [])
  const history = useApi(() => kaluta.subscriptions.history(), [])
  const [period, setPeriod] = useState<'monthly' | 'yearly'>(params.get('period') === 'yearly' ? 'yearly' : 'monthly')
  const [selected, setSelected] = useState<'basic' | 'premium' | null>(params.get('plan') === 'basic' ? 'basic' : params.get('plan') === 'premium' ? 'premium' : null)
  const [busy, setBusy] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const state = membership.data
  const paymentId = params.get('payment')
  const { reload: reloadMembership } = membership
  const { reload: reloadHistory } = history
  const changed = useCallback(() => { reloadMembership(); reloadHistory() }, [reloadMembership, reloadHistory])
  const selectedPlan = catalog.data?.plans.find((p) => p.tier === selected)

  const checkout = async () => {
    if (!selected) return
    setBusy(true); setError(null)
    try {
      const payment = await kaluta.subscriptions.checkout({ tier: selected, period })
      setParams({ payment: payment.payment_id }); setSelected(null); reloadHistory()
    } catch (err) { setError(message(err)) }
    finally { setBusy(false) }
  }
  const cancel = async () => {
    if (!state?.subscription_id) return
    setBusy(true); setError(null)
    try { await kaluta.subscriptions.cancel(state.subscription_id); setConfirmCancel(false); reloadMembership() }
    catch (err) { setError(message(err)) }
    finally { setBusy(false) }
  }

  return (
    <AppShell title="Your subscription" subtitle="Choose a paid period. Your benefits start only after payment is confirmed." rail={false}>
      <div className="mx-auto max-w-4xl space-y-5">
        <section className="cloud-card space-y-3 p-5" aria-label="Current plan">
          <h2 className="text-lg font-semibold text-text-hi">Current plan: {state ? planName(state.tier) : 'Loading…'}</h2>
          {state?.access_until && <p className="text-sm text-text-mid">Paid access until {when(state.access_until)}{state.mock ? ' · Development simulation' : ''}.</p>}
          <p className="text-sm text-text-mid">Renewal is manual. No automatic debit. Cancelling keeps access through periods already paid and does not request a refund.</p>
          {state?.status === 'cancelled' && <p className="text-sm text-text-hi">Subscription cancelled. Paid access remains available until its end date.</p>}
          {state?.subscription_id && state.status !== 'cancelled' && (confirmCancel ? <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void cancel()} className={button}>Confirm cancellation</button><button type="button" onClick={() => setConfirmCancel(false)} className={button}>Keep subscription</button></div> : <button type="button" onClick={() => setConfirmCancel(true)} className={button}>Cancel subscription</button>)}
          {membership.error && <ErrorLine text={membership.error} />}
        </section>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Subscription period">{(['monthly', 'yearly'] as const).map((p) => <button type="button" key={p} aria-pressed={p === period} onClick={() => { setPeriod(p); setSelected(null) }} className={p === period ? primary : button}>{p === 'monthly' ? 'Monthly' : 'Yearly'}</button>)}</div>
        {options.data?.mock_available && <p className="text-sm text-text-mid">Payments are currently simulated on this development server.</p>}
        {options.data && !options.data.checkout_available && <p className="text-sm text-text-hi">Paid checkout is not available on this server yet. Free access remains available.</p>}
        <div className="grid gap-4 md:grid-cols-3">{catalog.data?.plans.map((plan) => (
          <section key={plan.tier} className="cloud-card space-y-3 p-5" aria-label={`${planName(plan.tier)} plan`}>
            <h2 className="text-lg font-semibold text-text-hi">{planName(plan.tier)}</h2>
            <p className="text-2xl font-semibold text-text-hi">${plan.price[period]} <span className="text-xs text-text-mid">USD / {period === 'monthly' ? 'month' : 'year'}</span></p>
            <p className="text-sm text-text-mid">{plan.credits.toLocaleString()} AI credits each calendar month.</p>
            <p className="text-sm text-text-mid">{plan.features.scheduled_posts ? 'Scheduled posts and newsletter sending included.' : 'Original-language Studio tools and the Free translation allowance.'}</p>
            {plan.tier !== 'free' && <button type="button" disabled={busy || !options.data?.checkout_available} onClick={() => setSelected(plan.tier as 'basic' | 'premium')} className={button}>{state?.tier === plan.tier ? `Renew ${planName(plan.tier)}` : `Choose ${planName(plan.tier)}`}</button>}
          </section>
        ))}</div>
        <p className="text-xs text-text-mid">Monthly usage carries over when changing plans; a payment does not reset credits. Copilot, brand kit, dubbing, lip sync and autonomous agents are planned and are not included today.</p>
        {selected && selectedPlan && <section className="cloud-card space-y-3 p-5" aria-label="Confirm plan">
          <h2 className="text-lg font-semibold text-text-hi">{planName(selected)} · ${selectedPlan.price[period]} USD</h2>
          <p className="text-sm text-text-mid">Same-plan renewal extends the paid period. A higher plan starts after payment; a lower plan starts after higher paid periods end. Changes cost the full displayed price, without prorated credit.</p>
          <div className="flex flex-wrap gap-2"><button type="button" disabled={busy || !options.data?.checkout_available} onClick={() => void checkout()} className={primary}>{busy ? 'Preparing…' : options.data?.mock_available ? 'Start simulated checkout' : 'Continue to payment'}</button><button type="button" onClick={() => setSelected(null)} className={button}>Back</button></div>
        </section>}
        {paymentId && <Payment key={paymentId} id={paymentId} canSimulate={options.data?.mock_available ?? false} onChanged={changed} />}
        <section className="cloud-card space-y-3 p-5" aria-label="Payment history">
          <h2 className="text-lg font-semibold text-text-hi">Payment history</h2><p className="text-xs text-text-mid">Latest 50 payments. Pending payments do not grant access.</p>
          <ul className="space-y-2">{history.data?.items.map((payment) => <li key={payment.payment_id} className="flex flex-wrap items-center justify-between gap-2 border-b border-text-low/20 py-2 text-sm text-text-mid"><span>{planName(payment.tier)} · ${payment.amount} · {payment.status}{payment.mock ? ' · Simulated' : ''}</span><button type="button" onClick={() => setParams({ payment: payment.payment_id })} className={button}>Open payment</button></li>)}</ul>
          {history.error && <ErrorLine text={history.error} />}
        </section>
        {(error ?? catalog.error ?? options.error) && <ErrorLine text={(error ?? catalog.error ?? options.error) as string} />}
        <Link to="/studio" className="inline-block text-sm text-text-hi underline">Back to Creator Studio</Link>
      </div>
    </AppShell>
  )
}
