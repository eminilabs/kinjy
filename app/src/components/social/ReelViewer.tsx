import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import type { Post } from '@/lib/api'
import ShortPlayer from './ShortPlayer'

/**
 * A video, opened the way Facebook opens a reel.
 *
 * Full screen on black, the clip you tapped first, and the next one one scroll
 * (or swipe, or arrow key) away. The scrolling, the autoplay of only the clip in
 * view, the like / comment / repost / share rail and the mute state are the
 * Shorts player's own: this is a frame around it, not a second player to keep in
 * step with the first.
 */
export default function ReelViewer({
  posts,
  startId,
  currentUserId,
  autoplay,
  onClose,
}: {
  posts: Post[]
  startId: string
  currentUserId: string
  autoplay: boolean
  onClose: () => void
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    // The page underneath must not scroll while a reel is: a flick at the end of
    // the list would otherwise move the feed and leave it somewhere else.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    // Arrow keys drive the reel, so the reel has to hold focus.
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-label="Shorts reel"]')?.focus())
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Video reel" className="fixed inset-0 z-[70] bg-black">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute start-3 top-3 z-20 grid h-11 w-11 place-items-center rounded-full bg-black/55 text-white backdrop-blur-sm hover:bg-black/75"
      >
        <X size={22} aria-hidden="true" />
      </button>
      <div className="flex h-full justify-center">
        <ShortPlayer
          posts={posts}
          startId={startId}
          currentUserId={currentUserId}
          autoplay={autoplay}
          className="h-full min-h-0 max-w-[520px] rounded-none shadow-none ring-0 focus-visible:ring-0"
        />
      </div>
    </div>,
    document.body,
  )
}
