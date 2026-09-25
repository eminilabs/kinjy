import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { PostMedia } from '@/lib/api'

/**
 * Full-size preview for a post's media.
 *
 * Deliberately not the shadcn Dialog: this needs the whole viewport, a black
 * ground and keyboard paging, and fighting a centred, padded, max-width panel
 * into that shape costs more than the ~60 lines here.
 */
export default function MediaLightbox({
  media,
  index,
  onClose,
}: {
  media: PostMedia[]
  index: number
  onClose: () => void
}) {
  const [current, setCurrent] = useState(index)

  useEffect(() => setCurrent(index), [index])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key === 'ArrowRight') setCurrent((i) => Math.min(media.length - 1, i + 1))
      if (event.key === 'ArrowLeft') setCurrent((i) => Math.max(0, i - 1))
    }
    document.addEventListener('keydown', onKey)
    // The page behind must not scroll while a full-screen viewer is open.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [media.length, onClose])

  const item = media[current]
  if (!item) return null

  // Portalled to <body>: an ancestor with backdrop-filter (every .cloud-card
  // has one) establishes a containing block, and `position: fixed` would then
  // resolve against the post card instead of the viewport — the overlay opened
  // at 664×453 inside the card rather than full screen.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Media preview"
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/92"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        className="absolute end-4 top-4 z-10 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20"
      >
        <X size={18} />
      </button>

      {media.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setCurrent((i) => Math.max(0, i - 1))
            }}
            disabled={current === 0}
            aria-label="Previous"
            className="absolute start-3 z-10 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 disabled:opacity-25"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setCurrent((i) => Math.min(media.length - 1, i + 1))
            }}
            disabled={current === media.length - 1}
            aria-label="Next"
            className="absolute end-3 z-10 rounded-full bg-white/10 p-3 text-white transition-colors hover:bg-white/20 disabled:opacity-25"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* Stop the backdrop's close handler from firing on the media itself. */}
      <div className="max-h-[92svh] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
        {item.kind === 'video' ? (
          <video src={item.url ?? undefined} controls autoPlay className="max-h-[92svh] max-w-[92vw]" />
        ) : (
          <img
            src={item.url ?? undefined}
            alt={item.alt_text ?? ''}
            className="max-h-[92svh] max-w-[92vw] object-contain"
          />
        )}
      </div>

      {media.length > 1 && (
        <p className="absolute bottom-5 text-xs text-white/70">
          {current + 1} / {media.length}
        </p>
      )}
      {item.alt_text && (
        <p className="absolute bottom-12 max-w-lg px-6 text-center text-sm text-white/80">
          {item.alt_text}
        </p>
      )}
    </div>,
    document.body,
  )
}
