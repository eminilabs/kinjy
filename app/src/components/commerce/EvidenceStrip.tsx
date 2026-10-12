import { useState } from 'react'
import MediaLightbox from '@/components/social/MediaLightbox'
import type { PostMedia } from '@/lib/api'

/** Tappable thumbnails; a tap opens the app's own full-screen viewer. */
export default function EvidenceStrip({ urls }: { urls: string[] }) {
  const [open, setOpen] = useState<number | null>(null)
  if (urls.length === 0) return null

  const media: PostMedia[] = urls.map((url) => ({ url, kind: 'image', alt_text: null }))

  return (
    <>
      <ul className="mt-2 flex flex-wrap gap-2">
        {urls.map((url, i) => (
          <li key={`${url}-${i}`}>
            <button
              type="button"
              onClick={() => setOpen(i)}
              aria-label={`Open evidence photo ${i + 1} of ${urls.length}`}
              className="block h-16 w-16 overflow-hidden rounded-card-sm border border-white/12 bg-ink-2/70 focus:border-gold/40 focus:outline-none"
            >
              <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
      {open !== null && <MediaLightbox media={media} index={open} onClose={() => setOpen(null)} />}
    </>
  )
}
