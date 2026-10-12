import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, PackageSearch, Store } from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import OrderCard, { OrderCardSkeleton } from '@/components/commerce/OrderCard'
import { STATUS_GROUPS } from '@/components/commerce/orderStatus'
import { useApi } from '@/hooks/useApi'
import { kaluta, type Order } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function MarketOrders() {
  // One fetch; the pills filter and count client-side so they never disagree with the list.
  const orders = useApi<{ items: Order[] }>(() => kaluta.market.myOrders({ role: 'buyer' }), [])
  const [group, setGroup] = useState<string>('all')
  const [note, setNote] = useState<string | null>(null)

  const items = useMemo(() => orders.data?.items ?? [], [orders.data])

  const pills = useMemo(() => {
    const counted = STATUS_GROUPS.map((g) => ({
      ...g,
      count: items.filter((o) => (g.statuses as readonly string[]).includes(o.status)).length,
    })).filter((g) => g.count > 0)
    return [{ id: 'all', label: 'All', count: items.length, statuses: [] as readonly string[] }, ...counted]
  }, [items])

  // If the selected group empties after an action, fall back to All instead of an empty page.
  const active = pills.some((p) => p.id === group) ? group : 'all'
  const statuses = STATUS_GROUPS.find((g) => g.id === active)?.statuses as readonly string[] | undefined
  const visible = statuses ? items.filter((o) => statuses.includes(o.status)) : items

  return (
    <AppShell title="My orders" subtitle="Everything you bought, where it stands and what to do next.">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/market"
          className="mb-1 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-text-mid hover:text-gold-soft"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Marketplace
        </Link>

        {items.length > 0 && (
          <div
            role="tablist"
            aria-label="Filter orders by status"
            className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0"
          >
            {pills.map(({ id, label, count }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active === id}
                onClick={() => setGroup(id)}
                className={cn(
                  'inline-flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-4 text-sm font-semibold transition-colors',
                  active === id
                    ? 'border-gold/60 bg-gold/[0.12] text-gold-soft'
                    : 'border-white/12 text-text-mid hover:border-gold/40',
                )}
              >
                {label}
                <span className="mono-data text-xs opacity-80">{count}</span>
              </button>
            ))}
          </div>
        )}

        {note && (
          <p role="status" className="mb-3 text-sm text-gold-soft">
            {note}
          </p>
        )}

        {orders.loading && !orders.data ? (
          <ul className="space-y-3" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <OrderCardSkeleton key={i} />
            ))}
          </ul>
        ) : orders.error && !orders.data ? (
          <div className="cloud-card p-5 text-center">
            <p className="text-sm text-text-mid">We could not load your orders.</p>
            <button
              type="button"
              onClick={orders.reload}
              className="mt-3 inline-flex min-h-[44px] items-center rounded-full border border-white/12 px-5 text-sm font-semibold text-text-mid"
            >
              Try again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="cloud-card flex flex-col items-center p-8 text-center">
            <PackageSearch size={28} className="text-gold" aria-hidden="true" />
            <h2 className="mt-3 text-base font-semibold text-text-hi">No orders yet</h2>
            <p className="caption mt-1">When you buy something, you follow it here.</p>
            <Link
              to="/market"
              className="mt-4 inline-flex min-h-[44px] items-center rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 text-sm font-bold text-ink"
            >
              Browse the marketplace
            </Link>
          </div>
        ) : visible.length === 0 ? (
          <p className="cloud-card p-5 text-center text-sm text-text-mid">No orders in this status.</p>
        ) : (
          <ul className="space-y-3">
            {visible.map((order) => (
              <OrderCard key={order.id} order={order} onChanged={orders.reload} onNote={setNote} />
            ))}
          </ul>
        )}

        <Link
          to="/market/seller"
          className="mt-6 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-text-mid hover:text-gold-soft"
        >
          <Store size={14} aria-hidden="true" />
          Selling? Open My shop
        </Link>
      </div>
    </AppShell>
  )
}
