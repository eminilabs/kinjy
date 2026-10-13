import { useAppTheme } from '@/components/appdemo/theme'
import { cn } from '@/lib/utils'

/**
 * The charts on the statistics page, drawn as inline SVG.
 *
 * No charting library. One would be 40-60 kB gzipped for three shapes, on a
 * page most members open occasionally - and the entry bundle has just had
 * 100 kB taken out of it for exactly this kind of reason. Bars and arcs are
 * arithmetic.
 *
 * Everything is drawn with `currentColor` or theme tokens, so the charts work
 * on all three themes without a palette of their own.
 */

const NUMBER = new Intl.NumberFormat()

/** Thirty days of activity, one bar a day. */
export function ActivityChart({
  daily,
}: {
  daily: Array<{ date: string; posts: number; reactions: number }>
}) {
  const { tok } = useAppTheme()
  // Both series share a scale, because two scales on one chart is a way of
  // making a small number look like a big one.
  const peak = Math.max(1, ...daily.map((d) => Math.max(d.posts, d.reactions)))
  const width = 100
  const height = 34
  const step = width / Math.max(1, daily.length)
  // A hair under the step, so the bars are separated by the gap rather than by
  // a stroke that would double every bar's apparent width at this size.
  const barWidth = step * 0.62

  return (
    <figure className={cn('rounded-[20px] p-4', tok.card)}>
      <figcaption className={cn('mb-3 flex flex-wrap items-center gap-x-4 gap-y-1', tok.low)}>
        <span className={cn('text-[0.95rem] font-semibold', tok.text)}>Last 30 days</span>
        <span className="inline-flex items-center gap-1.5 text-[0.72rem]">
          <span className="h-2 w-2 rounded-full bg-gold" aria-hidden="true" />
          Posts
        </span>
        <span className="inline-flex items-center gap-1.5 text-[0.72rem]">
          <span className="h-2 w-2 rounded-full bg-sky" aria-hidden="true" />
          Reactions received
        </span>
      </figcaption>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-28 w-full"
        role="img"
        aria-label={`Posts and reactions a day for the last 30 days. Busiest day: ${NUMBER.format(peak)}.`}
      >
        {daily.map((day, index) => {
          const x = index * step
          const posts = (day.posts / peak) * (height - 2)
          const reactions = (day.reactions / peak) * (height - 2)
          return (
            <g key={day.date}>
              {/* The day's own faint ground, so an empty day still reads as a
                  day rather than as a gap in the data. */}
              <rect
                x={x + (step - barWidth) / 2}
                y={height - 1.2}
                width={barWidth}
                height={1.2}
                className="fill-text-hi/15"
              />
              {reactions > 0 && (
                <rect
                  x={x + (step - barWidth) / 2}
                  y={height - reactions}
                  width={barWidth}
                  height={reactions}
                  rx={0.6}
                  className="fill-sky/70"
                />
              )}
              {posts > 0 && (
                <rect
                  x={x + (step - barWidth) / 2 + barWidth * 0.22}
                  y={height - posts}
                  width={barWidth * 0.56}
                  height={posts}
                  rx={0.6}
                  className="fill-gold"
                />
              )}
            </g>
          )
        })}
      </svg>

      <p className={cn('mt-2 flex justify-between text-[0.68rem]', tok.low)}>
        {/* Only when there is a first day to name. The fallback was
            `Date.now()`, which reads the clock during render - an impure call
            that gives a different answer every time React happens to
            re-render, for a label that means nothing on an empty chart. */}
        <span>
          {daily[0]
            ? new Date(daily[0].date).toLocaleDateString(undefined, {
                day: 'numeric',
                month: 'short',
              })
            : ''}
        </span>
        <span>Today</span>
      </p>
    </figure>
  )
}

/** What people did with the posts, as a share of all of it. */
export function EngagementChart({
  parts,
}: {
  parts: Array<{ label: string; value: number; className: string }>
}) {
  const { tok } = useAppTheme()
  const total = parts.reduce((sum, p) => sum + p.value, 0)

  return (
    <figure className={cn('rounded-[20px] p-4', tok.card)}>
      <figcaption className={cn('mb-3 text-[0.95rem] font-semibold', tok.text)}>
        What people did
      </figcaption>

      {total === 0 ? (
        <p className={cn('py-6 text-center text-sm', tok.low)}>Nothing yet.</p>
      ) : (
        <ul className="space-y-2.5">
          {parts.map((part) => {
            // Against the largest bar rather than the total: three shares of a
            // total are three slivers, and the question here is "which of
            // these happens most", not "what fraction is each".
            const peak = Math.max(...parts.map((p) => p.value), 1)
            return (
              <li key={part.label}>
                <div className={cn('mb-1 flex items-baseline justify-between text-[0.78rem]', tok.low)}>
                  <span>{part.label}</span>
                  <span className={cn('font-semibold', tok.text)}>{NUMBER.format(part.value)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-text-hi/[0.07]">
                  <div
                    className={cn('h-full rounded-full', part.className)}
                    style={{ width: `${Math.max(part.value > 0 ? 3 : 0, (part.value / peak) * 100)}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </figure>
  )
}

/** How many of the people you brought in have verified. */
export function VerifiedRing({ total, verified }: { total: number; verified: number }) {
  const { tok } = useAppTheme()
  const share = total === 0 ? 0 : verified / total
  // A circle of circumference 100 makes the dash array the percentage, which
  // keeps the arithmetic readable.
  const radius = 100 / (2 * Math.PI)

  return (
    <div className={cn('flex items-center gap-4 rounded-[20px] p-4', tok.card)}>
      <svg
        viewBox="0 0 40 40"
        className="h-20 w-20 shrink-0 -rotate-90"
        role="img"
        aria-label={`${verified} of ${total} verified`}
      >
        <circle cx="20" cy="20" r={radius} fill="none" strokeWidth="4" className="stroke-text-hi/[0.09]" />
        <circle
          cx="20"
          cy="20"
          r={radius}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${share * 100} 100`}
          className="stroke-emerald-400"
        />
      </svg>
      <div className="min-w-0">
        <p className={cn('text-[1.7rem] font-bold leading-none tracking-[-0.03em]', tok.text)}>
          {NUMBER.format(verified)}
          <span className={cn('ms-1 text-[0.9rem] font-medium', tok.low)}>of {NUMBER.format(total)}</span>
        </p>
        <p className={cn('mt-1.5 text-[0.78rem]', tok.low)}>
          {/* Said plainly rather than as a percentage: "67%" of three people
              is a statistic pretending to be a trend. */}
          have verified their identity, which is what unlocks payouts.
        </p>
      </div>
    </div>
  )
}
