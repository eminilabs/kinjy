import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useAppTheme } from '@/components/appdemo/theme'
import { countryOptions } from '@/lib/profileOptions'

export interface MarketFilters {
  country: string
  city: string
  min_price: string
  max_price: string
}

export const NO_FILTERS: MarketFilters = { country: '', city: '', min_price: '', max_price: '' }

export function countFilters(filters: MarketFilters): number {
  return Object.values(filters).filter((v) => v !== '').length
}

const field =
  'w-full min-h-[44px] rounded-2xl border border-white/10 bg-ink-2/60 px-4 py-2.5 text-base text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none sm:text-sm'

const amount = (value: string) => value.replace(/[^\d.]/g, '')

export default function FilterSheet({
  value,
  onApply,
  onClose,
}: {
  value: MarketFilters
  onApply: (filters: MarketFilters) => void
  onClose: () => void
}) {
  const { lang } = useAppTheme()
  const countries = useMemo(() => countryOptions(lang), [lang])
  const [draft, setDraft] = useState(value)

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  const set = (key: keyof MarketFilters) => (v: string) => setDraft((d) => ({ ...d, [key]: v }))
  const rangeInvalid =
    draft.min_price !== '' && draft.max_price !== '' && Number(draft.min_price) > Number(draft.max_price)

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 md:items-center md:p-6"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Filters"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (rangeInvalid) return
          onApply({ ...draft, city: draft.city.trim() })
          onClose()
        }}
        className="flex max-h-[92svh] w-full flex-col rounded-t-3xl border border-white/10 bg-ink md:max-w-md md:rounded-3xl"
      >
        <div className="flex items-center justify-between px-5 pb-2 pt-4">
          <h2 className="text-base font-semibold text-text-hi">Filters</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-me-2 flex h-11 w-11 items-center justify-center rounded-full text-text-mid hover:text-gold-soft"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-4">
          <div>
            <label htmlFor="flt-country" className="caption mb-1.5 block">Country</label>
            <select
              id="flt-country"
              value={draft.country}
              onChange={(e) => set('country')(e.target.value)}
              className={field}
            >
              <option value="">Any country</option>
              {countries.map(({ code, name }) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="flt-city" className="caption mb-1.5 block">City</label>
            <input
              id="flt-city"
              value={draft.city}
              onChange={(e) => set('city')(e.target.value)}
              maxLength={80}
              placeholder="Any city"
              className={field}
            />
          </div>
          <div>
            <p className="caption mb-1.5">Price (USD, what the buyer pays)</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                value={draft.min_price}
                onChange={(e) => set('min_price')(amount(e.target.value))}
                inputMode="decimal"
                placeholder="Min"
                aria-label="Minimum price"
                className={field}
              />
              <input
                value={draft.max_price}
                onChange={(e) => set('max_price')(amount(e.target.value))}
                inputMode="decimal"
                placeholder="Max"
                aria-label="Maximum price"
                aria-invalid={rangeInvalid || undefined}
                className={field}
              />
            </div>
            {rangeInvalid && <p className="mt-1 text-xs text-red-200">The minimum is above the maximum.</p>}
          </div>
        </div>

        <div className="flex gap-2 border-t border-white/10 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <button
            type="button"
            onClick={() => {
              onApply(NO_FILTERS)
              onClose()
            }}
            className="min-h-[48px] flex-1 rounded-full border border-white/12 px-4 text-sm font-semibold text-text-mid hover:border-gold/40 hover:text-gold-soft"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={rangeInvalid}
            className="min-h-[48px] flex-1 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 text-sm font-bold text-ink disabled:opacity-40"
          >
            Apply
          </button>
        </div>
      </form>
    </div>,
    document.body,
  )
}
