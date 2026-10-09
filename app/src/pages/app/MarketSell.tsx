import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { ArrowLeft, CheckCircle2, Cloud, Package, Wrench } from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import { useAppTheme } from '@/components/appdemo/theme'
import ImageUploader from '@/components/commerce/ImageUploader'
import MarginCalculator, { parseCents } from '@/components/commerce/MarginCalculator'
import { ApiError, kaluta } from '@/lib/api'
import { countryOptions } from '@/lib/profileOptions'
import { cn } from '@/lib/utils'

type Kind = 'product' | 'service' | 'digital'

const KINDS: { id: Kind; label: string; hint: string; icon: typeof Package }[] = [
  { id: 'product', label: 'Product', hint: 'Something you ship or hand over', icon: Package },
  { id: 'service', label: 'Service', hint: 'Work you do for the buyer', icon: Wrench },
  { id: 'digital', label: 'Digital', hint: 'A file or a download', icon: Cloud },
]

const field =
  'w-full min-h-[44px] rounded-2xl border border-white/10 bg-ink-2/60 px-4 py-2.5 text-base text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none sm:text-sm'

export default function MarketSell() {
  const { lang } = useAppTheme()
  const countries = useMemo(() => countryOptions(lang), [lang])

  const [kind, setKind] = useState<Kind>('product')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [stock, setStock] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [photos, setPhotos] = useState<{ urls: string[]; busy: boolean }>({ urls: [], busy: false })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [created, setCreated] = useState<{ id: string; pricing: Record<string, string> } | null>(null)

  const cents = parseCents(price)
  const stockNumber = stock === '' ? null : Number(stock)
  const stockOk = kind === 'product' ? stockNumber !== null : true
  const ready =
    title.trim().length >= 2 && cents !== null && stockOk && country !== '' && !photos.busy && !submitting

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!ready || cents === null) return
    setError(null)
    setSubmitting(true)
    try {
      const result = await kaluta.market.createProduct({
        title: title.trim(),
        description: description.trim() || undefined,
        kind,
        vendor_price: `${Math.floor(cents / 100)}.${(cents % 100).toString().padStart(2, '0')}`,
        stock: kind === 'digital' ? null : stockNumber,
        country,
        city: city.trim() || undefined,
        images: photos.urls,
      })
      setCreated(result)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not publish the listing')
    } finally {
      setSubmitting(false)
    }
  }

  if (created) {
    return (
      <AppShell title="Listing published">
        <div className="cloud-card mx-auto max-w-xl p-5 text-center">
          <CheckCircle2 size={36} className="mx-auto text-gold-soft" aria-hidden="true" />
          <h2 className="mt-3 text-base font-semibold text-text-hi">{title.trim()} is live</h2>
          <dl className="mono-data mt-4 space-y-1.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-text-mid">You asked</dt>
              <dd className="text-text-hi">${created.pricing.vendor_price}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-mid">Buyer pays</dt>
              <dd className="text-gold-soft">${created.pricing.customer_price}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-mid">Kinjy margin</dt>
              <dd className="text-text-hi">${created.pricing.margin}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link
              to={`/market/products/${created.id}`}
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 text-sm font-bold text-ink"
            >
              View my listing
            </Link>
            <Link
              to="/market"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/12 px-6 text-sm font-semibold text-text-mid hover:border-gold/40 hover:text-gold-soft"
            >
              Back to the marketplace
            </Link>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell
      title="Sell on Kinjy"
      subtitle="You set your price and receive exactly that. Kinjy adds a 20% margin on top for the buyer."
      action={
        <Link
          to="/market"
          className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold text-text-mid hover:text-gold-soft"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Marketplace
        </Link>
      }
    >
      <form onSubmit={submit} className="mx-auto max-w-xl space-y-5">
        <fieldset>
          <legend className="caption mb-2">What are you selling?</legend>
          <div className="grid grid-cols-3 gap-2">
            {KINDS.map(({ id, label, hint, icon: Icon }) => (
              <label
                key={id}
                className={cn(
                  'cloud-card flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-1 p-2 text-center',
                  kind === id && 'border-gold/60 bg-gold/[0.08]',
                )}
              >
                <input
                  type="radio"
                  name="kind"
                  value={id}
                  checked={kind === id}
                  onChange={() => setKind(id)}
                  className="sr-only"
                />
                <Icon size={20} className={kind === id ? 'text-gold-soft' : 'text-text-mid'} aria-hidden="true" />
                <span className="text-sm font-semibold text-text-hi">{label}</span>
                <span className="hidden text-[11px] leading-tight text-text-low sm:block">{hint}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="sell-title" className="caption mb-1.5 block">Title</label>
          <input
            id="sell-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="Hand-dyed kanga cloth"
            className={field}
          />
        </div>

        <div>
          <label htmlFor="sell-desc" className="caption mb-1.5 block">Description</label>
          <textarea
            id="sell-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="What it is, condition, what the buyer gets"
            className={cn(field, 'resize-y')}
          />
        </div>

        <div className={cn('grid gap-3', kind !== 'digital' && 'grid-cols-2')}>
          <div>
            <label htmlFor="sell-price" className="caption mb-1.5 block">Your price (USD)</label>
            <input
              id="sell-price"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ''))}
              inputMode="decimal"
              placeholder="100.00"
              aria-invalid={price !== '' && cents === null}
              className={field}
            />
          </div>
          {kind !== 'digital' && (
            <div>
              <label htmlFor="sell-stock" className="caption mb-1.5 block">
                Stock{kind === 'service' ? ' (optional)' : ''}
              </label>
              <input
                id="sell-stock"
                value={stock}
                onChange={(e) => setStock(e.target.value.replace(/\D/g, '').slice(0, 7))}
                inputMode="numeric"
                placeholder={kind === 'service' ? 'Unlimited' : '0'}
                className={field}
              />
            </div>
          )}
        </div>
        {price !== '' && cents === null && (
          <p className="-mt-3 text-xs text-red-200">Use a positive amount with at most two decimals, like 25 or 25.50.</p>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="sell-country" className="caption mb-1.5 block">Country</label>
            <select
              id="sell-country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={field}
              autoComplete="country"
            >
              <option value="">Select a country</option>
              {countries.map(({ code, name }) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="sell-city" className="caption mb-1.5 block">Pickup or shipping city</label>
            <input
              id="sell-city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={80}
              placeholder="Optional"
              className={field}
              autoComplete="address-level2"
            />
          </div>
        </div>

        <div>
          <p className="caption mb-1.5">Photos</p>
          <ImageUploader onChange={setPhotos} />
        </div>

        {/* Sticks above the bottom tab bar on a phone so the price stays in view while typing. */}
        <div className="sticky bottom-20 z-10 space-y-2 lg:bottom-4">
          <MarginCalculator value={price} className="bg-ink/95 backdrop-blur" />
          {error && (
            <p role="alert" className="rounded-2xl bg-ink/95 px-3 py-2 text-sm text-red-200">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!ready}
            className="min-h-[48px] w-full rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 text-sm font-bold text-ink disabled:opacity-40"
          >
            {submitting ? 'Publishing…' : photos.busy ? 'Uploading photos…' : 'Publish listing'}
          </button>
        </div>
      </form>
    </AppShell>
  )
}
