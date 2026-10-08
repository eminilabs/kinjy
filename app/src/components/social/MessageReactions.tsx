import { MoreHorizontal, Pencil, Reply, SmilePlus, Trash2 } from 'lucide-react'
import FloatingPanel from '@/components/social/FloatingPanel'
import { MESSAGE_REACTIONS } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Emoji reactions under a message: a small pill per emoji with how many people
 * chose it, and the viewer's own highlighted. Counts, not names - naming
 * everyone who reacted turns a quiet acknowledgement into a scoreboard - and a
 * tap on a pill is the reaction itself: it takes yours back, or adds it.
 *
 * Only the emoji the server allows (MESSAGE_REACTIONS) are ever sent.
 */

/** The pills under a bubble. */
export function ReactionChips({
  counts,
  mine,
  onToggle,
}: {
  counts: Record<string, number>
  mine: string | null | undefined
  onToggle: (emoji: string) => void
}) {
  const entries = Object.entries(counts)
  if (!entries.length) return null
  return (
    <div className="-mt-1.5 mx-2 flex flex-wrap gap-1">
      {entries.map(([emoji, count]) => {
        const chosen = mine === emoji
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggle(emoji)}
            aria-pressed={chosen}
            aria-label={`${emoji} ${count}${chosen ? ', your reaction' : ''}`}
            className={cn(
              'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs text-text-hi',
              chosen ? 'border-gold/50 bg-gold/20' : 'border-white/12 bg-ink-2 hover:border-white/25',
            )}
          >
            <span aria-hidden="true">{emoji}</span>
            <span className="tabular-nums">{count}</span>
          </button>
        )
      })}
    </div>
  )
}

/** The button beside a bubble that opens the picker. Shown on hover or focus. */
export function ReactButton({ onOpen, label }: { onOpen: (anchor: DOMRect) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
      aria-label={label}
      aria-haspopup="dialog"
      title="React"
      className="hidden shrink-0 self-center rounded-full p-1.5 text-text-low opacity-0 hover:text-text-hi focus-visible:opacity-100 group-hover/bubble:opacity-100 [@media(pointer:fine)]:block"
    >
      <SmilePlus size={14} aria-hidden="true" />
    </button>
  )
}

/** The button beside your own bubble that opens its options. Same look and timing as the react button. */
export function OptionsButton({ onOpen, label }: { onOpen: (anchor: DOMRect) => void; label: string }) {
  return (
    <button
      type="button"
      onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
      aria-label={label}
      aria-haspopup="dialog"
      title="Edit or delete"
      className="hidden shrink-0 self-center rounded-full p-1.5 text-text-low opacity-0 hover:text-text-hi focus-visible:opacity-100 group-hover/bubble:opacity-100 [@media(pointer:fine)]:block"
    >
      <MoreHorizontal size={14} aria-hidden="true" />
    </button>
  )
}

/**
 * Pick a reaction: the eight emoji the server accepts, in a row. Opened from a
 * long press it also offers Reply, so a phone has both without a second gesture.
 * Choosing the emoji you already have takes it back (the server decides which).
 */
export function ReactionPicker({
  anchor,
  current,
  onPick,
  onReply,
  onClose,
}: {
  anchor: DOMRect
  current: string | null | undefined
  onPick: (emoji: string) => void
  onReply?: () => void
  onClose: () => void
}) {
  return (
    <FloatingPanel anchor={anchor} label="Choose a reaction" onClose={onClose}>
      <div role="group" aria-label="Reactions" className="flex gap-0.5">
        {MESSAGE_REACTIONS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              onPick(emoji)
              onClose()
            }}
            aria-label={`React ${emoji}`}
            aria-pressed={current === emoji}
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-full text-xl hover:scale-110 hover:bg-white/10 focus-visible:bg-white/10',
              current === emoji && 'bg-gold/20',
            )}
          >
            <span aria-hidden="true">{emoji}</span>
          </button>
        ))}
      </div>
      {onReply && (
        <button
          type="button"
          onClick={() => {
            onReply()
            onClose()
          }}
          className="mt-1 flex w-full items-center gap-2 rounded-card-sm px-2.5 py-2 text-sm text-text-hi hover:bg-white/10"
        >
          <Reply size={14} aria-hidden="true" />
          Reply
        </button>
      )}
    </FloatingPanel>
  )
}

/**
 * What you can do to a message you sent: change its words, or delete it. Edit is
 * offered only for text the server can read - not a sticker, which has nothing to
 * edit, and not an end-to-end encrypted message, which is ciphertext the server
 * cannot replace. The server refuses both anyway; the point is not to offer what
 * will fail.
 */
export function OwnMessageMenu({
  anchor,
  canEdit,
  onEdit,
  onDelete,
  onClose,
}: {
  anchor: DOMRect
  canEdit: boolean
  onEdit: () => void
  onDelete: () => void
  onClose: () => void
}) {
  const item = 'flex w-full items-center gap-2 rounded-card-sm px-2.5 py-2 text-sm hover:bg-white/10'
  return (
    <FloatingPanel anchor={anchor} label="Message options" onClose={onClose}>
      {canEdit && (
        <button
          type="button"
          onClick={() => {
            onEdit()
            onClose()
          }}
          className={cn(item, 'text-text-hi')}
        >
          <Pencil size={14} aria-hidden="true" />
          Edit
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          onDelete()
          onClose()
        }}
        className={cn(item, 'text-red-300')}
      >
        <Trash2 size={14} aria-hidden="true" />
        Delete
      </button>
    </FloatingPanel>
  )
}
