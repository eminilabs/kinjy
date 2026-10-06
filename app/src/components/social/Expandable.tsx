import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * A block that is cut off at a height, faded out, and opened by a button.
 *
 * A post is a mixed thing - a few words or twenty lines, a banner or a poster
 * two screens tall - and a feed only works if every card is roughly the size of
 * every other card. Letting one long post own the screen is what makes a feed
 * tiring to scroll, so a long one is cut and offers to open.
 *
 * The cut is only applied when there is something to cut: the height is
 * measured, and a block that already fits renders with no fade and no button at
 * all. Otherwise a short post would carry a "See more" that does nothing, which
 * is worse than no button.
 *
 * Re-measured on resize and whenever `deps` change, because the content that
 * decides this arrives after the first render - an image loads, a translation
 * replaces the text - and a block measured while empty would keep a verdict it
 * took before it had anything to measure.
 */
export default function Expandable({
  collapsedHeight,
  lines,
  children,
  label = 'See more',
  lessLabel = 'See less',
  /** Re-measure when these change. */
  deps = [],
  className,
  /** Instead of expanding in place, do this - opening a lightbox, say. */
  onExpand,
}: {
  collapsedHeight: number
  /**
   * Cut at a whole number of lines instead of at a pixel height.
   *
   * For running text this is the one to use. A pixel height lands wherever it
   * lands - usually halfway down a line - and the fade then sits over
   * characters that are still legible underneath it, which reads as a broken
   * render rather than as "there is more". A line clamp ends on a line, with
   * an ellipsis, and needs no fade at all.
   */
  lines?: number
  children: React.ReactNode
  label?: string
  lessLabel?: string
  deps?: unknown[]
  className?: string
  onExpand?: () => void
}) {
  const inner = useRef<HTMLDivElement | null>(null)
  const [open, setOpen] = useState(false)
  const [overflows, setOverflows] = useState(false)

  const measure = useCallback(() => {
    const el = inner.current
    if (!el) return
    if (lines) {
      // Measured against what the clamp *would* allow, worked out from the
      // line box - not against the element's current height.
      //
      // Comparing scrollHeight with clientHeight cannot work here: the clamp
      // is only applied once an overflow has been found, so until then the two
      // are equal, nothing is ever found, and the clamp is never applied. The
      // test has to hold whether or not it is currently clamped.
      const style = getComputedStyle(el)
      const lineHeight =
        parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5 || 20
      setOverflows(el.scrollHeight > lineHeight * lines + 4)
      return
    }
    // A few pixels of slack: a block one or two pixels over its limit is not
    // worth a button, and sub-pixel text metrics produce exactly that.
    setOverflows(el.scrollHeight > collapsedHeight + 4)
  }, [collapsedHeight, lines])

  useEffect(() => {
    measure()
    const el = inner.current
    if (!el || typeof ResizeObserver === 'undefined') return
    // The content changes height on its own - a font lands, an image decodes -
    // and none of that is a render here, so it is watched rather than guessed.
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measure, ...deps])

  const clipped = overflows && !open

  return (
    <div className={className}>
      <div
        ref={inner}
        className={cn('relative', clipped && 'overflow-hidden')}
        style={
          clipped
            ? lines
              ? {
                  // The clamp ends on a line and adds the ellipsis itself.
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: lines,
                  overflow: 'hidden',
                }
              : { maxHeight: collapsedHeight }
            : undefined
        }
      >
        {children}
        {clipped && !lines && (
          /* Only for a height clamp, which cuts wherever it happens to land.
             Short and quick to transparent: a tall fade washes out lines that
             are still perfectly readable, and ghosted text reads as a broken
             render rather than as "this continues".

             Not interactive - the button below is the control, and an overlay
             that swallowed taps would make the post unclickable along its
             bottom edge. */
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--cloud)] to-transparent"
          />
        )}
      </div>
      {overflows && (
        <button
          type="button"
          onClick={() => (onExpand ? onExpand() : setOpen((value) => !value))}
          // The button is what the screen reader announces, so it says what it
          // will do rather than describing the fade above it.
          aria-expanded={onExpand ? undefined : open}
          className="mt-1.5 inline-flex items-center gap-1 rounded-full py-1 text-[0.78rem] font-semibold text-text-mid hover:text-gold-soft"
        >
          {open && !onExpand ? lessLabel : label}
          <ChevronDown
            size={14}
            className={cn('transition-transform', open && !onExpand && 'rotate-180')}
            aria-hidden="true"
          />
        </button>
      )}
    </div>
  )
}
