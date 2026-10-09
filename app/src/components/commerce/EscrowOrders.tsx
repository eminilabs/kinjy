import { useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import OrderCard, { OrderCardSkeleton } from '@/components/commerce/OrderCard'
import { useApi } from '@/hooks/useApi'
import { kaluta, type EscrowTerms, type Order } from '@/lib/api'

/**
 * A member's orders (as buyer and as seller) with the actions that fit each status.
 * The card, the status wording and the actions are shared with the My orders page.
 */
export default function EscrowOrders() {
  const orders = useApi<{ items: Order[] }>(() => kaluta.market.myOrders(), [])
  const terms = useApi<EscrowTerms>(() => kaluta.market.escrowTerms(), [])
  const [note, setNote] = useState<string | null>(null)

  const items = orders.data?.items ?? []
  if (orders.loading && !orders.data) {
    return (
      <ul className="space-y-3" aria-busy="true" role="status">
        <OrderCardSkeleton />
      </ul>
    )
  }
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
      <ul className="space-y-3">
        {items.map((order) => (
          <OrderCard key={order.id} order={order} onChanged={orders.reload} onNote={setNote} />
        ))}
      </ul>
    </section>
  )
}
