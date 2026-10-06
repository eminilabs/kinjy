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
    // A few pixels of slack: a block one or two pixels over its limit is not
    // worth a button, and sub-pixel text metrics produce exactly that.
    setOverflows(el.scrollHeight > collapsedHeight + 4)
  }, [collapsedHeight])

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
        style={clipped ? { maxHeight: collapsedHeight } : undefined}
      >
        {children}
        {clipped && (
          /* The fade sits over the last of the content rather than under a
             hard edge, so it reads as "this continues" instead of as a
             rendering fault. Not interactive: the button below is the control,
             and an overlay that swallowed taps would make the post itself
             unclickable along its bottom edge. */
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[var(--cloud)] via-[var(--cloud)]/85 to-transparent"
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
