import { useState } from 'react'
import { Link } from 'react-router'
import { ImageOff, Pause, Pencil, Play, Plus, Trash2 } from 'lucide-react'
import { ghostBtn } from '@/components/commerce/ActionSheet'
import ListingEditSheet from '@/components/commerce/ListingEditSheet'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta, type MyProduct } from '@/lib/api'
import { cn } from '@/lib/utils'

function Thumb({ src }: { src?: string }) {
  const [failed, setFailed] = useState(false)
  return (
    <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-ink-2/80">
      {src && !failed ? (
        <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="size-full object-cover" />
      ) : (
        <ImageOff size={20} className="text-text-low" aria-hidden="true" />
      )}
    </div>
  )
}

export default function SellerListings() {
  const mine = useApi<{ items: MyProduct[] }>(() => kaluta.market.myProducts(), [])
  const [editing, setEditing] = useState<MyProduct | null>(null)
  const [confirming, setConfirming] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (id: string, fn: () => Promise<unknown>, fallback: string) => {
    setBusy(id)
    setError(null)
    try {
      await fn()
      setConfirming(null)
      mine.reload()
    } catch (err) {
      setConfirming(null)
      setError(
        err instanceof ApiError && err.status === 409
          ? 'You cannot delete this listing while an order is in progress. Pause it instead, and delete it once the order is finished.'
          : err instanceof ApiError
            ? err.message
            : fallback,
      )
    } finally {
      setBusy(null)
    }
  }

  const items = (mine.data?.items ?? []).filter((p) => p.status !== 'removed')
  if (mine.loading && !mine.data) return <p className="text-sm text-text-low">Loading your listings…</p>
  if (mine.error) return <p role="alert" className="text-sm text-red-200">{mine.error}</p>

  return (
    <section>
      {error && (
        <p role="alert" className="mb-3 text-sm text-red-200">
          {error}
        </p>
      )}
      {items.length === 0 ? (
        <div className="cloud-card p-5 text-center">
          <p className="text-sm text-text-mid">You have no listings yet.</p>
          <Link
            to="/market/sell"
            className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 text-sm font-bold text-ink"
          >
            <Plus size={14} aria-hidden="true" />
            Create a listing
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((product) => {
            const paused = product.status === 'paused'
            return (
              <li key={product.id} className="cloud-card p-3">
                <div className="flex gap-3">
                  <Thumb src={product.images[0]} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/market/products/${product.id}`}
                        className="line-clamp-2 text-sm font-semibold text-text-hi hover:text-gold-soft"
                      >
                        {product.title}
                      </Link>
                      <span
                        className={cn(
                          'shrink-0 rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold',
                          paused
                            ? 'border-white/12 bg-white/5 text-text-mid'
                            : 'border-emerald-400/35 bg-emerald-400/10 text-emerald-200',
                        )}
                      >
                        {paused ? 'Paused' : 'Active'}
                      </span>
                    </div>
                    <p className="caption mt-1">
                      {product.stock == null ? 'Unlimited stock' : `${product.stock} in stock`}
                    </p>
                    <p className="mono-data mt-1 text-xs text-text-mid">
                      You receive <span className="text-text-hi">${product.vendor_price}</span> · buyers pay{' '}
                      <span className="text-gold-soft">${product.customer_price}</span>
                    </p>
                  </div>
                </div>

                {confirming === product.id ? (
                  <div className="mt-3 rounded-2xl border border-red-400/30 bg-red-400/5 p-3">
                    <p className="text-sm text-text-hi">Delete this listing? Buyers will no longer find it.</p>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        disabled={busy === product.id}
                        onClick={() => run(product.id, () => kaluta.market.removeProduct(product.id), 'Could not delete')}
                        className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-red-400/90 px-4 text-xs font-bold text-ink disabled:opacity-40"
                      >
                        Yes, delete
                      </button>
                      <button type="button" onClick={() => setConfirming(null)} className={cn(ghostBtn, 'flex-1')}>
                        Keep it
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => setEditing(product)} className={ghostBtn}>
                      <Pencil size={13} aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busy === product.id}
                      onClick={() =>
                        run(
                          product.id,
                          () => kaluta.market.updateProduct(product.id, { status: paused ? 'active' : 'paused' }),
                          'Could not update the listing',
                        )
                      }
                      className={ghostBtn}
                    >
                      {paused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
                      {paused ? 'Activate' : 'Pause'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null)
                        setConfirming(product.id)
                      }}
                      className={cn(ghostBtn, 'hover:border-red-400/50 hover:text-red-200')}
                    >
                      <Trash2 size={13} aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <ListingEditSheet
        product={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          mine.reload()
        }}
      />
    </section>
  )
}
