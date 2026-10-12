import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * The way back up a long page.
 *
 * The marketing pages are tall on purpose - the platform page is a dozen
 * screens - and the navigation lives at the top of them. Reaching the end of
 * one and wanting the next meant scrolling all the way back by hand, or
 * reaching for a keyboard shortcut most people on a phone do not have.
 *
 * Only after the fold: a button offering to take you to the top of a page you
 * are already at the top of is clutter.
 */
export default function BackToTop() {
  const [shown, setShown] = useState(false)

  useEffect(() => {
    // A screen and a half, which is far enough that the header is well out of
    // reach and not so far that the button only appears at the very bottom.
    const threshold = () => window.innerHeight * 1.5
    const onScroll = () => setShown(window.scrollY > threshold())
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <button
      type="button"
      onClick={() =>
        window.scrollTo({
          top: 0,
          // Honour the member's own setting rather than deciding for them: an
          // animated jump of ten screens is exactly what reduced-motion is for.
          behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
            ? 'auto'
            : 'smooth',
        })
      }
      aria-label="Back to top"
      title="Back to top"
      // aria-hidden while invisible, so a screen reader is not offered a
      // control that does nothing where the member currently is.
      aria-hidden={!shown}
      tabIndex={shown ? 0 : -1}
      className={cn(
        'fixed bottom-6 end-6 z-40 grid h-11 w-11 place-items-center rounded-full',
        'bg-gradient-to-br from-gold-soft to-gold text-ink shadow-[0_10px_24px_-12px_rgba(166,120,57,0.8)]',
        'transition-all duration-200 hover:brightness-105',
        shown ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
      )}
    >
      <ArrowUp size={18} aria-hidden="true" />
    </button>
  )
}
