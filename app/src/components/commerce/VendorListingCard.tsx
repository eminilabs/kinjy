import { useState } from 'react'
import { Link } from 'react-router'
import { ImageOff } from 'lucide-react'
import type { Product } from '@/lib/api'

export default function VendorListingCard({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false)
  const src = product.images[0]

  return (
    <Link
      to={`/market/products/${product.id}`}
      className="cloud-card block overflow-hidden transition-colors hover:border-gold/40"
    >
      <div className="flex aspect-square items-center justify-center bg-ink-2/80">
        {src && !failed ? (
          <img src={src} alt="" loading="lazy" onError={() => setFailed(true)} className="size-full object-cover" />
        ) : (
          <ImageOff size={24} className="text-text-low" aria-hidden="true" />
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-semibold text-text-hi">{product.title}</p>
        <p className="mono-data mt-1 text-sm text-gold-soft">
          ${product.customer_price}
        </p>
        {(product.city || product.country) && (
          <p className="caption mt-0.5 truncate">{[product.city, product.country].filter(Boolean).join(', ')}</p>
        )}
      </div>
    </Link>
  )
}
