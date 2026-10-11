import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { createPortal } from 'react-dom'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { PostMedia } from '@/lib/api'
import VideoPlayer from './VideoPlayer'

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
  aside,
}: {
  media: PostMedia[]
  index: number
  onClose: () => void
  /**
   * What sits beside the picture on a wide screen - the post and its
   * comments, for a feed photo.
   *
   * Optional, because not every picture has a conversation around it: the
   * product gallery and a chat attachment are pictures and nothing else, and
   * giving them an empty panel would be worse than giving them none. Hidden
   * below lg, where the photo wants the whole screen and the comments are a
   * tap away on the post itself.
   */
  aside?: React.ReactNode
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
      className={cn(
        'fixed inset-0 z-[90] flex bg-black',
        // Pure black, not black/92: a photo viewer that lets the page glow
        // through reads as an overlay rather than as somewhere you have gone.
        aside ? 'items-stretch' : 'items-center justify-center',
      )}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close preview"
        // Top-left, where every photo viewer puts it - and away from the
        // comments panel's own controls on the right.
        className="absolute start-4 top-4 z-20 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20"
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
            className="absolute start-3 z-10 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 disabled:opacity-25"
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
            className="absolute end-3 z-10 rounded-full bg-white/10 p-3 text-white hover:bg-white/20 disabled:opacity-25"
          >
            <ChevronRight size={20} />
          </button>
        </>
      )}

      {/* The picture's half. flex-1 so it takes whatever the panel leaves,
          and centred inside that rather than inside the window - otherwise the
          photo sits behind the comments on a narrow desktop. */}
      <div className={cn('relative flex min-w-0 flex-1 items-center justify-center', aside && 'lg:pe-0')}>
      {/* Stop the backdrop's close handler from firing on the media itself. */}
      <div className="max-h-[92svh] max-w-[92vw]" onClick={(e) => e.stopPropagation()}>
        {item.kind === 'video' ? (
          // The same player as in the feed, so the controls do not change shape
          // between the card and the full-size view. Unmuted here: opening a
          // video full-size is asking to watch it.
          <VideoPlayer
            src={item.url ?? ''}
            autoplay
            startMuted={false}
            fill
            className="max-w-[92vw] rounded-lg"
          />
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
      </div>

      {/* The conversation, beside the picture. Its own scroll, so a long
          thread never pushes the photo out of the window. */}
      {aside && (
        <aside
          onClick={(e) => e.stopPropagation()}
          className="hidden w-[360px] shrink-0 overflow-y-auto overscroll-contain bg-ink-2 p-4 lg:block xl:w-[400px]"
        >
          {aside}
        </aside>
      )}
    </div>,
    document.body,
  )
}
