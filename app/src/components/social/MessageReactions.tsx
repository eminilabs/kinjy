import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Reply, SmilePlus, X } from 'lucide-react'
import type { Reaction, Sticker } from '@/lib/api'
import { stickerUrl } from '@/lib/stickers'
import { cn } from '@/lib/utils'

/**
 * Sticker reactions under a message, the way WhatsApp shows them: a small
 * pill under the bubble with the stickers received and how many, a tap on it
 * to see who reacted, and a short row of stickers to pick from.
 *
 * Only ids from the server's catalogue are ever shown or sent; the picture is
 * built from the id (lib/stickers.ts), never from a URL a peer supplied.
 */

function StickerImage({ id, name, size }: { id: string; name: string; size: number }) {
  const url = stickerUrl(id)
  if (!url) return null
  return <img src={url} alt={name} width={size} height={size} draggable={false} className="shrink-0" />
}

const nameOfSticker = (catalogue: Sticker[], id: string) => catalogue.find((s) => s.id === id)?.name ?? 'Sticker'

/** The pill under a bubble. A press opens the list of who reacted. */
export function ReactionChips({
  reactions,
  myId,
  catalogue,
  onOpen,
}: {
  reactions: Reaction[]
  myId: string | undefined
  catalogue: Sticker[]
  onOpen: (anchor: DOMRect) => void
}) {
  if (!reactions.length) return null
  const counts = new Map<string, number>()
  for (const r of reactions) counts.set(r.sticker_id, (counts.get(r.sticker_id) ?? 0) + 1)
  const summary = [...counts.entries()]
    .map(([id, n]) => `${nameOfSticker(catalogue, id)}${n > 1 ? ` ×${n}` : ''}`)
    .join(', ')
  const mine = reactions.some((r) => r.user_id === myId)
  return (
    <button
      type="button"
      onClick={(e) => onOpen(e.currentTarget.getBoundingClientRect())}
      aria-label={`${reactions.length} ${reactions.length === 1 ? 'reaction' : 'reactions'}: ${summary}. Show who reacted`}
      className={cn(
        '-mt-1.5 mx-2 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs text-text-hi',
        mine ? 'border-gold/50 bg-gold/20' : 'border-white/12 bg-ink-2',
      )}
    >
      {[...counts.keys()].slice(0, 3).map((id) => (
        <StickerImage key={id} id={id} name="" size={16} />
      ))}
      {reactions.length > 1 && <span className="tabular-nums">{reactions.length}</span>}
    </button>
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

/**
 * A small floating panel, portalled to <body>: the thread sits inside a
 * backdrop-filtered card, where position:fixed would be relative to the card
 * and the panel would be clipped by the scrolling list.
 */
function Floating({
  anchor,
  label,
  onClose,
  children,
}: {
  anchor: DOMRect
  label: string
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const opener = useRef<Element | null>(document.activeElement)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const above = anchor.top - height - 8
    const top = above >= 8 ? above : Math.min(anchor.bottom + 8, window.innerHeight - height - 8)
    const left = Math.min(Math.max(8, anchor.left + anchor.width / 2 - width / 2), window.innerWidth - width - 8)
    setPos({ top, left })
  }, [anchor])

  useEffect(() => {
    const away = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    document.addEventListener('pointerdown', away, true)
    document.addEventListener('keydown', key, true)
    const previous = opener.current
    return () => {
      document.removeEventListener('pointerdown', away, true)
      document.removeEventListener('keydown', key, true)
      // Focus goes back to whatever opened the panel.
      if (previous instanceof HTMLElement && document.contains(previous)) previous.focus()
    }
  }, [onClose])

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={label}
      style={{ position: 'fixed', top: pos?.top ?? 0, left: pos?.left ?? 0, opacity: pos ? 1 : 0 }}
      className="z-50 max-w-[calc(100vw-16px)] rounded-card-md border border-white/12 bg-ink-2 p-1.5 shadow-lg"
    >
      {children}
    </div>,
    document.body,
  )
}

/**
 * Pick a sticker. Arrow keys move, Enter or Space picks, Escape closes and
 * focus returns to the button that opened it. When opened from a long press
 * it also offers Reply, so a phone has both without a second gesture.
 */
export function StickerPicker({
  anchor,
  stickers,
  current,
  onPick,
  onReply,
  onClose,
}: {
  anchor: DOMRect
  stickers: Sticker[]
  current: string | undefined
  onPick: (id: string) => void
  onReply?: () => void
  onClose: () => void
}) {
  const row = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const buttons = row.current?.querySelectorAll<HTMLButtonElement>('button[data-sticker]')
    const start = [...(buttons ?? [])].find((b) => b.dataset.sticker === current) ?? buttons?.[0]
    start?.focus()
  }, [current])

  const move = (e: React.KeyboardEvent) => {
    const buttons = [...(row.current?.querySelectorAll<HTMLButtonElement>('button[data-sticker]') ?? [])]
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (at < 0) return
    const next = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: buttons.length - 1 }[e.key]
    if (next === undefined) return
    e.preventDefault()
    buttons[(next + buttons.length) % buttons.length]?.focus()
  }

  return (
    <Floating anchor={anchor} label="Choose a sticker" onClose={onClose}>
      <div ref={row} onKeyDown={move} className="flex max-w-full flex-wrap justify-center gap-0.5">
        {stickers.map((s) => (
          <button
            key={s.id}
            type="button"
            data-sticker={s.id}
            aria-label={s.name}
            aria-pressed={s.id === current}
            title={s.name}
            onClick={() => {
              onPick(s.id)
              onClose()
            }}
            className={cn(
              'rounded-full p-1 hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/60',
              s.id === current && 'bg-gold/20',
            )}
          >
            <StickerImage id={s.id} name="" size={32} />
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
    </Floating>
  )
}

/** Who reacted with what. Your own row has a way to take the reaction back. */
export function ReactionList({
  anchor,
  reactions,
  catalogue,
  nameOf,
  myId,
  onRemove,
  onClose,
}: {
  anchor: DOMRect
  reactions: Reaction[]
  catalogue: Sticker[]
  nameOf: (userId: string) => string
  myId: string | undefined
  onRemove: () => void
  onClose: () => void
}) {
  return (
    <Floating anchor={anchor} label="Who reacted" onClose={onClose}>
      <ul className="min-w-[200px] max-w-[260px] py-1">
        {reactions.map((r) => (
          <li key={r.user_id} className="flex items-center gap-2 px-2 py-1">
            <StickerImage id={r.sticker_id} name="" size={22} />
            <span className="min-w-0 flex-1 truncate text-sm text-text-hi">{nameOf(r.user_id)}</span>
            <span className="sr-only">{nameOfSticker(catalogue, r.sticker_id)}</span>
            {r.user_id === myId && (
              <button
                type="button"
                onClick={() => {
                  onRemove()
                  onClose()
                }}
                aria-label="Remove my reaction"
                className="rounded-full p-1 text-text-mid hover:text-text-hi"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </Floating>
  )
}
