import { useAppTheme } from '@/components/appdemo/theme'
import { cn } from '@/lib/utils'

/**
 * What a route looks like while its code is still downloading.
 *
 * Every page below the shell is a separate chunk, so clicking a menu item
 * unmounts the page you were on before the next one exists. The fallback used
 * to be a single orb centred in an empty box, which on the dark theme is a
 * black screen with a dot on it - and on a slow connection it is a black
 * screen for several seconds. That is what "the page goes black" was.
 *
 * This holds the shape of the app instead: the rails and a column of cards,
 * at the widths the real shell uses, so a menu click looks like the page
 * arriving rather than the app falling over.
 */
export default function RouteSkeleton({
  /**
   * App routes sit in the three-column shell; the public pages do not, and
   * giving them rails would be a worse lie than the orb was.
   */
  shell = true,
}: {
  shell?: boolean
}) {
  const { tok } = useAppTheme()
  const block = cn('animate-pulse rounded-card-lg', tok.subtleBg)
  const bar = cn('block animate-pulse rounded', tok.subtleBg)

  const column = (
    <div className="space-y-4">
      {[0, 1].map((card) => (
        <div key={card} className={cn('rounded-card-lg p-5', tok.card)}>
          <div className="flex items-center gap-2.5">
            <span className={cn('h-10 w-10 shrink-0 animate-pulse rounded-full', tok.subtleBg)} />
            <span className="min-w-0 flex-1">
              <span className={cn('h-3 w-32', bar)} />
              <span className={cn('mt-1.5 h-2.5 w-20', bar)} />
            </span>
          </div>
          <div className="mt-3 space-y-2">
            {['90%', '72%'].map((width) => (
              <span key={width} className={cn('h-3', bar)} style={{ width }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  if (!shell) {
    return (
      <div className="mx-auto w-full max-w-container px-4 py-10" role="status" aria-label="Loading page">
        <span className={cn('block h-7 w-56', bar)} />
        <span className={cn('mt-3 block h-4 w-80 max-w-full', bar)} />
        <div className="mt-8">{column}</div>
      </div>
    )
  }

  return (
    <div
      // The shell's own geometry, so the content does not jump sideways when
      // the real page replaces this.
      className="mx-auto grid w-full max-w-[1320px] gap-[26px] px-4 pb-24 pt-6 md:px-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_300px]"
      role="status"
      aria-label="Loading page"
    >
      <div className="hidden lg:block">
        <div className={cn('h-64', block)} />
      </div>
      {column}
      <div className="hidden xl:block">
        <div className={cn('h-44', block)} />
      </div>
    </div>
  )
}
