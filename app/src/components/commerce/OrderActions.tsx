import { useState } from 'react'
import { Link } from 'react-router'
import { AlertTriangle, Check, CreditCard, PackageCheck, Star, Truck } from 'lucide-react'
import ActionSheet from '@/components/commerce/ActionSheet'
import DeliverySheet from '@/components/commerce/DeliverySheet'
import PaymentPanel from '@/components/commerce/PaymentPanel'
import ReviewForm from '@/components/commerce/ReviewForm'
import { ApiError, kaluta, type Order } from '@/lib/api'

const primary =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-xs font-bold text-ink disabled:opacity-40'
const outline =
  'inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-text-mid transition-colors hover:border-gold/40 hover:text-gold-soft disabled:opacity-40'

/**
 * The buttons that fit an order's status, shared by the list, the detail page
 * and the home block so a rule such as "who may confirm" lives in one place.
 */
export default function OrderActions({
  order,
  onChanged,
  onNote,
}: {
  order: Order
  /** Called after anything that changes the order, so the caller can refetch. */
  onChanged: () => void
  onNote?: (message: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paying, setPaying] = useState(false)
  const [delivering, setDelivering] = useState(false)
  const [reviewing, setReviewing] = useState(false)
  // The server flag lags until the next fetch; this covers the moment after sending.
  const [justReviewed, setJustReviewed] = useState(false)

  const isBuyer = order.role !== 'seller'
  const active = order.status === 'in_escrow' || order.status === 'delivered'
  const canConfirm = isBuyer && active
  const canDeliver = !isBuyer && active
  const canDispute = isBuyer && active
  const reviewed = Boolean(order.reviewed) || justReviewed

  const confirm = async () => {
    setBusy(true)
    setError(null)
    try {
      await kaluta.market.confirmDelivery(order.id)
      onNote?.('Confirmed. The seller has been paid.')
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not go through')
    } finally {
      setBusy(false)
    }
  }

  const hasAny =
    (isBuyer && order.status === 'pending') ||
    canConfirm ||
    canDeliver ||
    (isBuyer && order.status === 'settled') ||
    canDispute ||
    Boolean(order.dispute_id)
  if (!hasAny) return null

  return (
    <div>
      {error && (
        <p role="alert" className="mb-2 text-sm text-red-200">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {isBuyer && order.status === 'pending' && (
          <button type="button" onClick={() => setPaying(true)} className={primary}>
            <CreditCard size={13} aria-hidden="true" />
            Pay ${order.customer_price} — held in escrow
          </button>
        )}
        {canConfirm && (
          <button type="button" disabled={busy} onClick={confirm} className={primary}>
            <Check size={13} aria-hidden="true" />
            Confirm receipt — release the money
          </button>
        )}
        {canDeliver && (
          <button
            type="button"
            disabled={busy || order.status === 'delivered'}
            onClick={() => setDelivering(true)}
            className={outline}
          >
            {order.status === 'delivered' ? (
              <PackageCheck size={13} aria-hidden="true" />
            ) : (
              <Truck size={13} aria-hidden="true" />
            )}
            {order.status === 'delivered' ? 'Marked delivered' : 'Mark as delivered'}
          </button>
        )}
        {isBuyer &&
          order.status === 'settled' &&
          (reviewed ? (
            <span className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-gold-soft">
              <Star size={13} className="fill-gold text-gold" aria-hidden="true" />
              Thanks for your review
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setReviewing(true)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-gold/40 px-4 py-2 text-xs font-semibold text-gold-soft"
            >
              <Star size={13} aria-hidden="true" />
              Rate this purchase
            </button>
          ))}
        {(canDispute || order.dispute_id) && (
          <Link
            to={`/market/orders/${order.id}/dispute`}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-amber-400/30 px-4 py-2 text-xs font-semibold text-amber-200"
          >
            <AlertTriangle size={13} aria-hidden="true" />
            {order.dispute_id ? 'View dispute' : 'Open dispute'}
          </Link>
        )}
      </div>

      {paying && (
        <ActionSheet
          open
          onClose={() => setPaying(false)}
          title="Pay for your order"
          description={`Order ${order.id.slice(0, 12)}`}
        >
          <PaymentPanel
            orderId={order.id}
            amount={order.customer_price}
            onPaid={() => {
              onNote?.('Payment received. It is held in escrow until you confirm receipt.')
              onChanged()
            }}
            onDone={() => setPaying(false)}
          />
        </ActionSheet>
      )}
      {delivering && (
        <DeliverySheet
          open
          orderId={order.id}
          productId={order.product_id}
          onClose={() => setDelivering(false)}
          onDone={() => {
            setDelivering(false)
            onNote?.('Marked as delivered. The buyer still has to confirm before the money is released.')
            onChanged()
          }}
        />
      )}
      {reviewing && (
        <ReviewForm
          open
          orderId={order.id}
          onClose={() => setReviewing(false)}
          onDone={(already) => {
            setJustReviewed(true)
            onNote?.(already ? 'You already reviewed this order.' : 'Thanks for your review')
            setReviewing(false)
            onChanged()
          }}
        />
      )}
    </div>
  )
}
