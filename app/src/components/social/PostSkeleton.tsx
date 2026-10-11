import { useAppTheme } from '@/components/appdemo/theme'
import { cn } from '@/lib/utils'

/**
 * The shape of a post, while the post is on its way.
 *
 * A spinner says something is happening; this says what is about to be there.
 * The difference matters most on the slowest connections, which is where this
 * is seen: the card is already the right size, so the feed does not shift
 * under a thumb when the real posts land.
 *
 * Not identical copies. Three widths of text and a picture on every other
 * card, because four identical blocks read as one loading bar drawn four
 * times rather than as a page of posts.
 */
export default function PostSkeleton({
  /** Index in the run, which decides the variation. */
  index = 0,
}: {
  index?: number
}) {
  // The theme's own subtle surface, not bg-current/10. An opacity modifier on
  // bg-current resolves to fully transparent, so the first version of this
  // drew a card with nothing in it - present in the DOM, invisible on screen.
  const { tok } = useAppTheme()
  // Deterministic rather than random: a skeleton that reshuffles on every
  // render flickers, and React may render this more than once before the data
  // arrives.
  const withMedia = index % 2 === 0
  const bodyWidths = [
    ['92%', '74%'],
    ['86%', '61%', '45%'],
    ['78%', '88%'],
  ][index % 3]

  const bar = cn('animate-pulse rounded', tok.subtleBg)

  return (
    <article className="cloud-card p-5" aria-hidden="true">
      <header className="flex items-center gap-2.5">
        <span className={cn('h-10 w-10 shrink-0 animate-pulse rounded-full', tok.subtleBg)} />
        <span className="min-w-0 flex-1">
          <span className={cn('block h-3 w-32', bar)} />
          <span className={cn('mt-1.5 block h-2.5 w-20', bar)} />
        </span>
      </header>

      <div className="mt-3 space-y-2">
        {bodyWidths.map((width) => (
          <span key={width} className={cn('block h-3', bar)} style={{ width }} />
        ))}
      </div>

      {withMedia && (
        /* Full-bleed like the real one, and at the ratio a single picture is
           clamped to, so the card is the height it will actually be. */
        <span
          className={cn('-mx-5 mt-3 block animate-pulse', tok.subtleBg)}
          style={{ aspectRatio: '1.5' }}
        />
      )}

      <footer className="mt-4 flex items-center gap-2">
        {[64, 52, 52, 60].map((width) => (
          <span key={width} className={cn('h-7 rounded-full', bar)} style={{ width }} />
        ))}
      </footer>
    </article>
  )
}

/** A run of them, for a feed that has nothing in it yet. */
export function PostSkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading posts">
      {Array.from({ length: count }, (_, index) => (
        <PostSkeleton key={index} index={index} />
      ))}
    </div>
  )
}
