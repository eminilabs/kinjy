import { useState } from 'react'
import { AlertTriangle, Check, PackageCheck, ShieldCheck, Truck } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta, type Dispute, type EscrowTerms, type Order } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * A member's orders, and what they can actually do about them.
 *
 * The status line is the whole point. "In escrow" without a date is a promise;
 * with the release date on it, it is a fact the member can plan around — and it
 * is the single thing they ask support about when it is missing.
 */

const STATUS: Record<string, { label: string; tone: 'wait' | 'good' | 'warn' | 'muted' }> = {
  pending: { label: 'Awaiting payment', tone: 'muted' },
  in_escrow: { label: 'Held in escrow', tone: 'wait' },
  delivered: { label: 'Delivered — confirm to release', tone: 'wait' },
  settled: { label: 'Settled', tone: 'good' },
  part_refunded: { label: 'Partly refunded, then settled', tone: 'good' },
  refunded: { label: 'Refunded', tone: 'warn' },
  disputed: { label: 'In dispute — escrow frozen', tone: 'warn' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
}

const TONE_CLASS = {
  wait: 'bg-sky/15 text-sky',
  good: 'bg-emerald-400/15 text-emerald-200',
  warn: 'bg-amber-400/15 text-amber-200',
  muted: 'bg-text-hi/[0.07] text-text-mid',
}

const CATEGORIES = [
  { value: 'not_received', label: 'It never arrived' },
  { value: 'not_as_described', label: 'Not what was described' },
  { value: 'damaged', label: 'Arrived damaged' },
  { value: 'unauthorised', label: 'I did not authorise this' },
  { value: 'other', label: 'Something else' },
]

function dateLabel(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

function DisputeForm({ order, onDone }: { order: Order; onDone: () => void }) {
  const [category, setCategory] = useState('not_received')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (reason.trim().length < 10) {
      setError('Please describe what went wrong — at least a sentence.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await kaluta.market.openDispute(order.id, { category, reason: reason.trim() })
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not open the dispute')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 rounded-2xl bg-amber-400/10 p-5">
      <p className="text-sm font-semibold text-text-hi">Open a dispute</p>
      <p className="caption mt-1">
        The money stays with the custodian while this is open. The other side has a deadline to answer.
      </p>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        aria-label="What went wrong"
        className="mt-3 w-full rounded-full border border-transparent bg-text-hi/[0.07] px-5 py-3 text-[0.95rem] text-text-hi focus:border-gold/50 focus:outline-none"
      >
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={3}
        placeholder="What happened? Dates, tracking numbers and what you were told all help."
        aria-label="What happened"
        className="mt-2 w-full rounded-2xl border border-transparent bg-text-hi/[0.07] px-5 py-3 text-[0.95rem] text-text-hi placeholder:text-text-low focus:border-gold/50 focus:outline-none"
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-200">
          {error}
        </p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-sm font-bold text-ink disabled:opacity-40"
        >
          {busy ? 'Opening…' : 'Open dispute'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border border-[var(--cloud-border)] px-5 py-2.5 text-sm font-semibold text-text-mid"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

export default function EscrowOrders() {
  const orders = useApi<{ items: Order[] }>(() => kaluta.market.myOrders(), [])
  const disputes = useApi<{ items: Dispute[] }>(() => kaluta.market.myDisputes(), [])
  const terms = useApi<EscrowTerms>(() => kaluta.market.escrowTerms(), [])

  const [disputing, setDisputing] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const act = async (id: string, fn: () => Promise<unknown>, message: string) => {
    setBusy(id)
    setError(null)
    setNote(null)
    try {
      await fn()
      setNote(message)
      orders.reload()
      disputes.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not go through')
    } finally {
      setBusy(null)
    }
  }

  const items = orders.data?.items ?? []
  if (orders.loading) return <p className="text-sm text-text-low" role="status">Loading your orders…</p>
  if (items.length === 0) {
    return <p className="cloud-card px-6 py-10 text-center text-sm text-text-low">No orders yet.</p>
  }

  return (
    <section>
      {terms.data && (
        <p className="mb-4 flex items-start gap-2.5 text-sm leading-relaxed text-text-low">
          <ShieldCheck size={16} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
          <span>
            Your money is held by {terms.data.custodian} — {terms.data.licence} — not by Kinjy. It reaches the seller
            when you confirm receipt, or {terms.data.auto_release_days} days after payment if you neither confirm nor
            dispute.
          </span>
        </p>
      )}

      {note && <p className="mb-4 rounded-2xl bg-gold/10 px-5 py-3 text-sm text-text-hi">{note}</p>}
      {error && (
        <p role="alert" className="mb-4 rounded-2xl bg-danger/10 px-5 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <ul className="space-y-3">
        {items.map((order) => {
          const status = STATUS[order.status] ?? { label: order.status, tone: 'muted' as const }
          const isBuyer = order.role === 'buyer'
          const canConfirm = isBuyer && (order.status === 'in_escrow' || order.status === 'delivered')
          const canDeliver = !isBuyer && (order.status === 'in_escrow' || order.status === 'delivered')
          const canDispute = order.status === 'in_escrow' || order.status === 'delivered'

          return (
            <li key={order.id} className="cloud-card p-5 md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="mono-data text-sm font-semibold text-text-hi">{order.id.slice(0, 16)}</span>
                <span
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold',
                    TONE_CLASS[status.tone],
                  )}
                >
                  {status.label}
                </span>
              </div>

              <p className="mt-3 text-sm text-text-low">
                You are the {isBuyer ? 'buyer' : 'seller'} · seller ${order.vendor_price} + markup ${order.margin} = $
                {order.customer_price}
                {Number(order.refunded_amount) > 0 && ` · $${order.refunded_amount} refunded`}
              </p>

              {order.status === 'in_escrow' && order.dispute_window_ends && (
                <p className="mt-1.5 text-sm text-sky">
                  Releases automatically on {dateLabel(order.dispute_window_ends)} unless you confirm or dispute first.
                </p>
              )}
              {order.status === 'delivered' && order.delivery_note && (
                <p className="mt-1.5 text-sm text-text-low">Seller’s note: {order.delivery_note}</p>
              )}
              {order.status === 'disputed' && (
                <p className="mt-1.5 text-sm text-warning">
                  The release clock is stopped while this is open.
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {canConfirm && (
                  <button
                    type="button"
                    disabled={busy === order.id}
                    onClick={() =>
                      act(
                        order.id,
                        () => kaluta.market.confirmDelivery(order.id),
                        'Confirmed. The seller has been paid.',
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-sm font-bold text-ink disabled:opacity-40"
                  >
                    <Check size={13} aria-hidden="true" />
                    Confirm receipt — release the money
                  </button>
                )}
                {canDeliver && (
                  <button
                    type="button"
                    disabled={busy === order.id || order.status === 'delivered'}
                    onClick={() =>
                      act(
                        order.id,
                        () => kaluta.market.markDelivered(order.id),
                        'Marked as delivered. The buyer still has to confirm before the money is released.',
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-full border border-[var(--cloud-border)] px-5 py-2.5 text-sm font-semibold text-text-mid transition-colors hover:border-gold/50 hover:bg-gold/10 hover:text-text-hi disabled:opacity-40"
                  >
                    {order.status === 'delivered' ? (
                      <PackageCheck size={13} aria-hidden="true" />
                    ) : (
                      <Truck size={13} aria-hidden="true" />
                    )}
                    {order.status === 'delivered' ? 'Marked delivered' : 'Mark as delivered'}
                  </button>
                )}
                {canDispute && disputing !== order.id && (
                  <button
                    type="button"
                    onClick={() => setDisputing(order.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 px-5 py-2.5 text-sm font-semibold text-warning hover:bg-amber-400/10"
                  >
                    <AlertTriangle size={13} aria-hidden="true" />
                    Something is wrong
                  </button>
                )}
              </div>

              {disputing === order.id && (
                <DisputeForm
                  order={order}
                  onDone={() => {
                    setDisputing(null)
                    orders.reload()
                    disputes.reload()
                  }}
                />
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
