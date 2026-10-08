import { useEffect, useRef, useState } from 'react'
import { Heart, Lightbulb, PartyPopper, ThumbsUp, HandHeart } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAppTheme } from '@/components/appdemo/theme'
import { kaluta, type ReactionSummary } from '@/lib/api'
import { cn } from '@/lib/utils'

/** Must match REACTION_KINDS in social-service. */
export const REACTIONS: Array<{ id: string; label: string; icon: LucideIcon; tint: string }> = [
  { id: 'like', label: 'Like', icon: ThumbsUp, tint: 'text-sky' },
  { id: 'celebrate', label: 'Celebrate', icon: PartyPopper, tint: 'text-gold-soft' },
  { id: 'support', label: 'Support', icon: HandHeart, tint: 'text-emerald-400' },
  { id: 'insightful', label: 'Insightful', icon: Lightbulb, tint: 'text-amber-300' },
  { id: 'love', label: 'Love', icon: Heart, tint: 'text-rose-400' },
]

const BY_ID = new Map(REACTIONS.map((r) => [r.id, r]))

/**
 * A reaction control: one button that shows your current choice, and a picker
 * on hover or focus.
 *
 * One reaction per member per post, so choosing a second replaces the first and
 * tapping the current one clears it. Counts come with the post, so the row
 * renders without a request per card.
 */
export default function Reactions({
  postId,
  summary,
  onChange,
}: {
  postId: string
  summary: ReactionSummary
  onChange: (next: ReactionSummary) => void
}) {
  const { tok } = useAppTheme()
  const [open, setOpen] = useState(false)
  // Leaving the trigger should not snatch the picker away mid-reach: the pointer
  // has to travel, and a stray pixel between the two used to cancel the whole
  // interaction. A short grace period makes the gesture forgiving.
  const closeTimer = useRef<number | undefined>(undefined)
  const show = () => {
    window.clearTimeout(closeTimer.current)
    setOpen(true)
  }
  const hide = () => {
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => setOpen(false), 260)
  }
  useEffect(() => () => window.clearTimeout(closeTimer.current), [])
  const [busy, setBusy] = useState(false)

  const mine = summary.mine ? BY_ID.get(summary.mine) : null
  const Icon = mine?.icon ?? ThumbsUp

  const react = async (kind: string) => {
    if (busy) return
    setBusy(true)
    setOpen(false)
    // Optimistic: reflect the tap now, reconcile with the server's counts after.
    const optimistic: ReactionSummary = {
      counts: { ...summary.counts },
      total: summary.total,
      mine: summary.mine === kind ? null : kind,
    }
    if (summary.mine) optimistic.counts[summary.mine] = Math.max(0, (optimistic.counts[summary.mine] ?? 1) - 1)
    if (optimistic.mine) optimistic.counts[kind] = (optimistic.counts[kind] ?? 0) + 1
    optimistic.total = Object.values(optimistic.counts).reduce((a, b) => a + b, 0)
    onChange(optimistic)

    try {
      const result = await kaluta.posts.react(postId, kind)
      onChange(result.reactions)
    } catch {
      onChange(summary) // roll back
    } finally {
      setBusy(false)
    }
  }

  // The kinds actually used on this post, biggest first — a summary, not a tally.
  const present = Object.entries(summary.counts)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)

  const breakdown = present.map(([kind]) => `${BY_ID.get(kind)?.label ?? kind}: ${summary.counts[kind]}`).join(' · ')

  return (
    <div className="flex items-center gap-1.5">
      <div
        className="relative"
        onMouseEnter={show}
        onMouseLeave={hide}
      >
        <button
          type="button"
          onClick={() => react(summary.mine ?? 'like')}
          onFocus={show}
          title={breakdown || undefined}
          aria-pressed={Boolean(summary.mine)}
          aria-label={
            mine
              ? `Your reaction: ${mine.label}. ${summary.total} in all. Change or remove it.`
              : `React. ${summary.total} so far.`
          }
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold',
            mine ? mine.tint : cn(tok.mid, tok.hoverBg),
          )}
        >
          <Icon size={14} fill={summary.mine ? 'currentColor' : 'none'} aria-hidden="true" />
          {/* The number, not the word: the icon already says which reaction is yours. */}
          <span className="tabular-nums">{summary.total}</span>
        </button>

        {open && (
          /* pb-2 on the positioner, not mb-1 on the panel: the padding is part
             of the hover target, so the pointer never crosses dead space. */
          <div className="absolute bottom-full start-0 z-20 pb-2">
            <div className={cn('flex gap-0.5 rounded-full p-1 shadow-cloud', tok.cardSolid)}>
            {REACTIONS.map((reaction) => (
              <button
                key={reaction.id}
                type="button"
                onClick={() => react(reaction.id)}
                title={reaction.label}
                aria-label={reaction.label}
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full',
                  reaction.tint,
                  summary.mine === reaction.id && 'bg-white/10',
                )}
              >
                <reaction.icon size={16} fill={summary.mine === reaction.id ? 'currentColor' : 'none'} />
              </button>
            ))}
            </div>
          </div>
        )}
      </div>

      {/* The second display: which kinds of reaction the post got, beside the
          button that carries the total. Once you have reacted, your own icon is
          already on the button, so a second one beside it would only repeat it. */}
      {!summary.mine && present.length > 0 && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-text-hi/[0.06] px-2 py-1"
          title={breakdown}
        >
          {present.map(([kind]) => {
            const meta = BY_ID.get(kind)
            if (!meta) return null
            return <meta.icon key={kind} size={13} fill="currentColor" className={meta.tint} aria-hidden="true" />
          })}
        </span>
      )}
    </div>
  )
}
