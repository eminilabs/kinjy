import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import OrderStatusChip from '@/components/commerce/OrderStatusChip'
import { ProductImage } from '@/components/commerce/ProductGallery'
import { useApi } from '@/hooks/useApi'
import { kaluta, type Order } from '@/lib/api'

/** Home-page glance at the latest purchases; the full list and actions live on /market/orders. */
export default function OrderRecent() {
  const orders = useApi<{ items: Order[] }>(() => kaluta.market.myOrders({ role: 'buyer' }), [])
  const items = (orders.data?.items ?? [])
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 3)

  if (orders.loading && !orders.data) {
    return (
      <ul className="space-y-2" aria-busy="true">
        {[0, 1].map((i) => (
          <li key={i} className="cloud-card h-[68px] animate-pulse" />
        ))}
      </ul>
    )
  }

  return (
    <div>
      {items.length === 0 ? (
        <p className="text-sm text-text-low">No orders yet.</p>
      ) : (
        <ul className="space-y-2">
          {items.map((order) => (
            <li key={order.id}>
              <Link
                to={`/market/orders/${order.id}`}
                className="cloud-card flex min-h-[68px] items-center gap-3 p-2.5 transition-colors hover:border-gold/30"
              >
                <ProductImage src={order.product?.images?.[0]} alt="" className="h-12 w-12 shrink-0 rounded-lg" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-text-hi">
                    {order.product?.title ?? 'Listing no longer available'}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-2">
                    <OrderStatusChip status={order.status} />
                    <span className="mono-data text-xs text-gold-soft">${order.customer_price}</span>
                  </span>
                </span>
                <ChevronRight size={16} className="shrink-0 text-text-low" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/market/orders"
        className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-full border border-white/12 px-5 text-sm font-semibold text-text-mid hover:border-gold/40 hover:text-gold-soft sm:w-auto"
      >
        See all my orders
      </Link>
    </div>
  )
}
