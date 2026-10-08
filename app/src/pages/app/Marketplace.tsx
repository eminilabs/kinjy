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
    'w-full rounded-full border border-transparent bg-text-hi/[0.07] px-5 py-3 text-[0.95rem] text-text-hi placeholder:text-text-low focus:border-gold/50 focus:bg-transparent focus:outline-none'

  return (
    <AppShell>
      <header className="mb-6">
        <p className="mono-data text-[0.72rem] font-bold uppercase tracking-[0.15em] text-gold-soft">Marketplace</p>
        <h1 className="mt-2 text-[clamp(38px,5vw,56px)] font-bold leading-[1.02] tracking-[-0.045em] text-text-hi">
          Buy and sell, safely
        </h1>
        <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-text-low">
          Sellers set their price; Kinjy adds a 20% markup on top. Buyer money is held by a licensed custodian
          until the buyer confirms receipt.
        </p>
      </header>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setSearch(query.trim())
        }}
      >
        <label className="flex items-center gap-2.5 rounded-full bg-text-hi/[0.07] px-5 py-3">
          <Search size={15} className="shrink-0 text-text-low" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the marketplace…"
            aria-label="Search products"
            className="w-full bg-transparent text-[0.95rem] text-text-hi placeholder:text-text-low focus:outline-none"
          />
        </label>
      </form>

      <form onSubmit={list} className="cloud-card mt-4 flex flex-wrap gap-3 p-5 md:p-6">
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
          className={`${field} sm:w-48`}
        />
        <button
          type="submit"
          disabled={!title.trim() || !price}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-3 text-sm font-bold text-ink disabled:opacity-40"
        >
          <Plus size={14} aria-hidden="true" />
          List
        </button>
      </form>

      {note && <p className="mt-4 rounded-2xl bg-gold/10 px-5 py-3 text-sm text-text-hi">{note}</p>}
      {error && (
        <p role="alert" className="mt-4 rounded-2xl bg-danger/10 px-5 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.loading && <p className="text-sm text-text-low" role="status">Loading…</p>}
        {products.data?.items.length === 0 && (
          <div className="cloud-card col-span-full flex flex-col items-center px-6 py-14 text-center">
            <span aria-hidden="true" className="grid h-14 w-14 place-items-center rounded-2xl bg-sky/15 text-sky">
              <ShoppingBag size={24} />
            </span>
            <p className="mt-4 text-lg font-bold tracking-[-0.02em] text-text-hi">Nothing listed yet</p>
            <p className="mt-1 max-w-sm text-sm text-text-low">List the first product above and it shows up here.</p>
          </div>
        )}
        {(products.data?.items ?? []).map((product) => (
          <article key={product.id} className="cloud-card flex flex-col p-5 md:p-6">
            <span
              aria-hidden="true"
              className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-sky/15 text-sky"
            >
              <Package size={17} />
            </span>
            <h2 className="text-[1.05rem] font-bold tracking-[-0.02em] text-text-hi">{product.title}</h2>
            {product.description && (
              <p className="mt-1.5 line-clamp-2 text-sm text-text-mid">{product.description}</p>
            )}
            <p className="mono-data mt-4 text-[1.4rem] font-bold text-text-hi">
              ${product.customer_price}
              <span className="ms-2 text-xs font-medium text-text-low">customer price</span>
            </p>
            <button
              type="button"
              onClick={() => buy(product)}
              className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--cloud-border)] px-5 py-2.5 text-sm font-semibold text-text-mid transition-colors hover:border-gold/50 hover:bg-gold/10 hover:text-text-hi"
            >
              <ShoppingBag size={13} aria-hidden="true" />
              Order — held in escrow
            </button>
          </article>
        ))}
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-[1.4rem] font-bold tracking-[-0.03em] text-text-hi">Your orders</h2>
        <EscrowOrders key={orderTick} />
      </section>

    </AppShell>
  )
}
