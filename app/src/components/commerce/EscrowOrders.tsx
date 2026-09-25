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
  wait: 'border-sky/35 bg-sky/10 text-sky',
  good: 'border-emerald-400/35 bg-emerald-400/10 text-emerald-200',
  warn: 'border-amber-400/35 bg-amber-400/10 text-amber-200',
  muted: 'border-white/12 bg-white/5 text-text-mid',
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
    <form onSubmit={submit} className="mt-3 rounded-card-sm border border-amber-400/25 bg-amber-400/[0.05] p-4">
      <p className="text-sm font-semibold text-text-hi">Open a dispute</p>
      <p className="caption mt-1">
        The money stays with the custodian while this is open. The other side has a deadline to answer.
      </p>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        aria-label="What went wrong"
        className="mt-3 w-full rounded-card-sm border border-white/12 bg-ink-2/70 px-3 py-2 text-sm text-text-hi focus:border-gold/40 focus:outline-none"
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
        className="mt-2 w-full rounded-card-sm border border-white/12 bg-ink-2/70 px-3 py-2 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none"
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
          className="rounded-full bg-amber-400/90 px-4 py-2 text-xs font-bold text-ink disabled:opacity-40"
        >
          {busy ? 'Opening…' : 'Open dispute'}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-text-mid"
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
  if (orders.loading) return <p className="text-sm text-text-low">Loading your orders…</p>
  if (items.length === 0) {
    return <p className="text-sm text-text-low">No orders yet.</p>
  }

  return (
    <section>
      {terms.data && (
        <p className="caption mb-3 flex items-start gap-2">
          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
          <span>
            Your money is held by {terms.data.custodian} — {terms.data.licence} — not by Kinjy. It reaches the seller
            when you confirm receipt, or {terms.data.auto_release_days} days after payment if you neither confirm nor
            dispute.
          </span>
        </p>
      )}

      {note && <p className="mb-3 text-sm text-gold-soft">{note}</p>}
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-200">
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
            <li key={order.id} className="cloud-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="mono-data text-sm text-text-hi">{order.id.slice(0, 16)}</span>
                <span
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold',
                    TONE_CLASS[status.tone],
                  )}
                >
                  {status.label}
                </span>
              </div>

              <p className="caption mt-2">
                You are the {isBuyer ? 'buyer' : 'seller'} · seller ${order.vendor_price} + markup ${order.margin} = $
                {order.customer_price}
                {Number(order.refunded_amount) > 0 && ` · $${order.refunded_amount} refunded`}
              </p>

              {order.status === 'in_escrow' && order.dispute_window_ends && (
                <p className="caption mt-1 text-sky">
                  Releases automatically on {dateLabel(order.dispute_window_ends)} unless you confirm or dispute first.
                </p>
              )}
              {order.status === 'delivered' && order.delivery_note && (
                <p className="caption mt-1">Seller’s note: {order.delivery_note}</p>
              )}
              {order.status === 'disputed' && (
                <p className="caption mt-1 text-amber-200">
                  The release clock is stopped while this is open.
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
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
                    className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-xs font-bold text-ink disabled:opacity-40"
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
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-text-mid transition-colors hover:border-gold/40 hover:text-gold-soft disabled:opacity-40"
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
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 px-4 py-2 text-xs font-semibold text-amber-200"
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
