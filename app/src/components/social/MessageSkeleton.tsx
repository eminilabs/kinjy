import { useAppTheme } from '@/components/appdemo/theme'
import { cn } from '@/lib/utils'

/**
 * Placeholders for messaging, shaped like the things they stand in for.
 *
 * "Loading…" tells you the app is awake. These tell you what is coming and
 * hold its space, so neither the conversation list nor the thread jumps when
 * the data lands - which in a thread matters more than anywhere else, because
 * a list that shifts while you are reaching for a conversation opens the
 * wrong one.
 *
 * The theme's own subtle surface, not a grey: a skeleton drawn in a fixed
 * colour is invisible on one of the three themes, and bg-current with an
 * opacity modifier is transparent on all of them.
 */

/** One row of the conversation list: avatar, name, preview. */
export function ConversationSkeleton({ count = 4 }: { count?: number }) {
  const { tok } = useAppTheme()
  const bar = cn('block animate-pulse rounded', tok.subtleBg)
  // Three name lengths and three preview lengths, so a column of these reads
  // as conversations rather than as one row stamped out four times.
  const widths = [
    ['38%', '72%'],
    ['52%', '58%'],
    ['44%', '80%'],
    ['60%', '66%'],
  ]

  return (
    <ul className="space-y-1" role="status" aria-label="Loading conversations">
      {Array.from({ length: count }, (_, index) => {
        const [name, preview] = widths[index % widths.length]
        return (
          <li key={index} className="flex items-center gap-3 rounded-2xl p-2.5">
            {/* 52px, the size the real avatar is, so the row is the height it
                will be. */}
            <span className={cn('h-[52px] w-[52px] shrink-0 animate-pulse rounded-full', tok.subtleBg)} />
            <span className="min-w-0 flex-1">
              <span className={cn('h-3.5', bar)} style={{ width: name }} />
              <span className={cn('mt-2 h-3', bar)} style={{ width: preview }} />
            </span>
          </li>
        )
      })}
    </ul>
  )
}

/**
 * A thread's worth of bubbles.
 *
 * Alternating sides and varying widths, because a conversation is a
 * back-and-forth: a column of same-sided blocks reads as a list, not a thread.
 * Anchored to the bottom like the real messages, so the skeleton sits where
 * the conversation will.
 */
export function ThreadSkeleton({ count = 6 }: { count?: number }) {
  const { tok } = useAppTheme()
  // Widths in pixels rather than percentages: a bubble is sized by its text,
  // not by the column, and percentage bubbles all ending at the same place
  // look like a table.
  const rows = [
    { mine: false, width: 190 },
    { mine: false, width: 128 },
    { mine: true, width: 164 },
    { mine: false, width: 232 },
    { mine: true, width: 104 },
    { mine: true, width: 198 },
  ]

  return (
    <div className="mt-auto space-y-2" role="status" aria-label="Loading messages">
      {rows.slice(0, count).map((row, index) => (
        <div key={index} className={cn('flex items-end gap-2', row.mine && 'justify-end')}>
          {!row.mine && (
            <span className={cn('h-7 w-7 shrink-0 animate-pulse rounded-full', tok.subtleBg)} />
          )}
          {/* 18px of radius and a height of two lines: the shape of a bubble,
              so the thread does not reflow when the real ones arrive. */}
          <span
            className={cn('block h-9 animate-pulse rounded-[18px]', tok.subtleBg)}
            style={{ width: row.width }}
          />
        </div>
      ))}
    </div>
  )
}
