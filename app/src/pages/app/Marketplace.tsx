import { useState } from 'react'
import { Package, Plus, Search, ShoppingBag } from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import { useApi } from '@/hooks/useApi'
import EscrowOrders from '@/components/commerce/EscrowOrders'
import { ApiError, kaluta, type Product } from '@/lib/api'

export default function Marketplace() {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const products = useApi(() => kaluta.market.products({ q: search || undefined }), [search])
  // Bumped after a purchase so the escrow list refetches; it owns its own data.
  const [orderTick, setOrderTick] = useState(0)

  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const list = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !price) return
    setError(null)
    try {
      const created = await kaluta.market.createProduct({ title: title.trim(), vendor_price: price })
      setNote(
        `Listed. You asked ${created.pricing.vendor_price}; the customer pays ${created.pricing.customer_price} — the ${created.pricing.margin} markup is Kinjy's, and the buyer's sponsor is paid out of it.`,
      )
      setTitle('')
      setPrice('')
      products.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not list the product')
    }
  }

  const buy = async (product: Product) => {
    setError(null)
    try {
      const order = await kaluta.market.order(product.id)
      setNote(
        `Order ${order.id.slice(0, 12)} created at ${order.customer_price} — the custodian holds it until you confirm receipt.`,
      )
      setOrderTick((n) => n + 1)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not order')
    }
  }

  const field =
    'w-full rounded-full border border-white/10 bg-ink-2/60 px-4 py-2.5 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none'

  return (
    <AppShell
      title="Marketplace"
      subtitle="Sellers set their price; Kinjy adds a 20% markup on top. Buyer money is held by a licensed custodian until the buyer confirms receipt."
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setSearch(query.trim())
        }}
      >
        <label className="flex items-center gap-2.5 rounded-full border border-white/10 bg-ink-2/60 px-4 py-2.5">
          <Search size={15} className="shrink-0 text-text-low" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the marketplace…"
            aria-label="Search products"
            className="w-full bg-transparent text-sm text-text-hi placeholder:text-text-low focus:outline-none"
          />
        </label>
      </form>

      <form onSubmit={list} className="cloud-card mt-4 flex flex-wrap gap-2 p-5">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sell something — Kanga cloth"
          aria-label="Product title"
          className={`${field} flex-1`}
        />
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))}
          placeholder="Your price (USD)"
          aria-label="Vendor price"
          inputMode="decimal"
          className={`${field} w-44`}
        />
        <button
          type="submit"
          disabled={!title.trim() || !price}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-sm font-bold text-ink disabled:opacity-40"
        >
          <Plus size={14} aria-hidden="true" />
          List
        </button>
      </form>

      {note && <p className="mt-4 text-sm text-gold-soft">{note}</p>}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-200">
          {error}
        </p>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {products.loading && <p className="text-sm text-text-low">Loading…</p>}
        {products.data?.items.length === 0 && (
          <p className="text-sm text-text-low">Nothing listed yet.</p>
        )}
        {(products.data?.items ?? []).map((product) => (
          <article key={product.id} className="cloud-card flex flex-col p-5">
            <span
              aria-hidden="true"
              className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-indigo/25 text-sky"
            >
              <Package size={17} />
            </span>
            <h2 className="text-sm font-semibold text-text-hi">{product.title}</h2>
            {product.description && (
              <p className="mt-1.5 line-clamp-2 text-sm text-text-mid">{product.description}</p>
            )}
            <p className="mono-data mt-3 text-lg text-gold-soft">
              ${product.customer_price}
              <span className="caption ms-1.5">customer price</span>
            </p>
            <button
              type="button"
              onClick={() => buy(product)}
              className="mt-4 inline-flex items-center justify-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-text-mid transition-colors hover:border-gold/40 hover:text-gold-soft"
            >
              <ShoppingBag size={13} aria-hidden="true" />
              Order — held in escrow
            </button>
          </article>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-text-hi">Your orders</h2>
        <EscrowOrders key={orderTick} />
      </section>

    </AppShell>
  )
}
