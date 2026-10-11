import { useAppTheme } from '@/components/appdemo/theme'
import { PostSkeletonList } from '@/components/social/PostSkeleton'
import { cn } from '@/lib/utils'

/**
 * A profile on its way.
 *
 * A profile is three requests deep - the member, the permissions, the posts -
 * so "Loading profile…" on an empty page was what most people saw first when
 * they opened somebody. This holds the real shape: cover, the avatar hanging
 * off its bottom edge, the name and the buttons, then the posts.
 *
 * The measurements are the page's own (h-32/sm:h-44 cover, 112px avatar,
 * -mt-14), so nothing moves when the profile lands.
 */
export function ProfileSkeleton() {
  const { tok } = useAppTheme()
  const bar = cn('block animate-pulse rounded', tok.subtleBg)

  return (
    <div role="status" aria-label="Loading profile">
      <div className={cn('overflow-hidden rounded-[20px]', tok.card)}>
        <div className={cn('h-32 w-full animate-pulse sm:h-44', tok.subtleBg)} />
        <div className="px-5 pb-6 sm:px-7">
          <div className="-mt-14 mb-4 flex items-end justify-between gap-3">
            <span
              className={cn('block h-28 w-28 shrink-0 animate-pulse rounded-full border-4 border-[var(--cloud)]', tok.subtleBg)}
            />
            <span className={cn('h-10 w-32 rounded-full', bar)} />
          </div>
          <span className={cn('h-6 w-52 max-w-full', bar)} />
          <span className={cn('mt-2 h-3.5 w-36', bar)} />
          <div className="mt-4 flex gap-5">
            {[72, 88, 64].map((width) => (
              <span key={width} className={cn('h-3.5', bar)} style={{ width }} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <PostSkeletonList count={2} />
      </div>
    </div>
  )
}

/** The rail beside it: About, and the relationship card under it. */
export function ProfileAsideSkeleton() {
  const { tok } = useAppTheme()
  const bar = cn('block animate-pulse rounded', tok.subtleBg)

  return (
    <div className="space-y-4" aria-hidden="true">
      {[3, 2].map((rows, card) => (
        <section key={card} className={cn('rounded-[20px] p-5', tok.card)}>
          <span className={cn('h-3 w-24', bar)} />
          <div className="mt-4 space-y-3">
            {Array.from({ length: rows }, (_, row) => (
              <span key={row} className={cn('h-3', bar)} style={{ width: `${88 - row * 14}%` }} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
