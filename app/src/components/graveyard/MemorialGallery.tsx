import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, EyeOff, Play, X } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { kaluta, type GalleryItem, type Memorial } from '@/lib/api'
import { cn } from '@/lib/utils'
import ProvenanceBadge from './ProvenanceBadge'

const card = 'rounded-card-md border border-text-low/25 bg-text-low/5 p-5'
const ghost =
  'inline-flex items-center gap-1.5 rounded-full border border-text-low/40 px-4 py-2 text-xs font-semibold text-text-mid hover:border-gold/40 hover:text-text-hi disabled:opacity-40'
// The viewer is black in every theme, so its controls are fixed white-on-dark.
const viewerButton =
  'inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white'

/** How many tiles show before "Show all": a gallery of sixty must not load sixty pictures on a phone. */
const FIRST_PAGE = 12

function Tile({
  item,
  label,
  revealed,
  failed,
  onOpen,
  onBroken,
}: {
  item: GalleryItem
  label: string
  revealed: boolean
  failed: boolean
  onOpen: (opener: HTMLButtonElement) => void
  onBroken: (at: number) => void
}) {
  const hidden = item.sensitive && !revealed
  return (
    <button
      type="button"
      onClick={(e) => onOpen(e.currentTarget)}
      aria-label={label}
      className="group relative aspect-square overflow-hidden rounded-card-sm bg-text-low/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold"
    >
      {failed ? (
        <span className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-text-mid">
          Could not load
        </span>
      ) : item.kind === 'image' ? (
        <img
          src={item.url}
          alt=""
          loading="lazy"
          decoding="async"
          onError={(e) => onBroken(e.timeStamp)}
          className={cn('h-full w-full object-cover', hidden && 'scale-110 blur-xl')}
        />
      ) : (
        // The first frame stands in for a poster: there is no server-side video tooling to make one.
        <video
          src={`${item.url}#t=0.1`}
          preload="metadata"
          muted
          playsInline
          onError={(e) => onBroken(e.timeStamp)}
          className={cn('h-full w-full object-cover', hidden && 'scale-110 blur-xl')}
        />
      )}
      {item.kind === 'video' && !failed && !hidden && (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white">
            <Play size={18} fill="currentColor" />
          </span>
        </span>
      )}
      {hidden && (
        <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 text-xs font-semibold text-white">
          <EyeOff size={18} aria-hidden="true" />
          Sensitive
        </span>
      )}
    </button>
  )
}

/**
 * The full-size viewer. A real dialog: Escape closes it, the arrow keys move
 * through the gallery, Tab stays inside it, focus goes back to the tile that
 * opened it, and the page behind does not scroll.
 */
function Viewer({
  items,
  index,
  revealed,
  failed,
  fullName,
  opener,
  onReveal,
  onMove,
  onClose,
  onBroken,
}: {
  items: GalleryItem[]
  index: number
  revealed: Set<string>
  failed: Set<string>
  fullName: string
  /** The tile that opened the viewer — Safari does not focus a button on click, so it is passed, not looked up. */
  opener: HTMLElement | null
  onReveal: (id: string) => void
  onMove: (to: number) => void
  onClose: () => void
  onBroken: (id: string, at: number) => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const item = items[index]
  const hidden = item.sensitive && !revealed.has(item.id)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    box.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    return () => {
      document.body.style.overflow = previous
      opener?.focus()
    }
  }, [opener])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // On a video, the arrow keys already mean "rewind" and "skip ahead".
      const onVideo = document.activeElement instanceof HTMLVideoElement
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && index > 0 && !onVideo) onMove(index - 1)
      else if (e.key === 'ArrowRight' && index < items.length - 1 && !onVideo) onMove(index + 1)
      else if (e.key === 'Tab' && box.current) {
        const focusable = [...box.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], video[controls]')]
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (!box.current.contains(document.activeElement)) {
          // Focus is on the page behind — after a click on the backdrop, say.
          // Tab from there would walk through content the viewer is covering.
          e.preventDefault()
          ;(e.shiftKey ? last : first).focus()
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, items.length, onClose, onMove])

  const label = item.caption ?? `${item.kind === 'video' ? 'Video' : 'Photo'} of ${fullName}`

  return (
    <div
      ref={box}
      role="dialog"
      aria-modal="true"
      aria-label={`Photos and videos of ${fullName}`}
      className="fixed inset-0 z-[90] flex flex-col bg-black text-white"
    >
      <div className="flex items-center justify-between gap-3 p-3">
        <p className="text-sm text-white/80" aria-live="polite">
          {index + 1} / {items.length}
        </p>
        <button type="button" onClick={onClose} aria-label="Close" data-autofocus className={viewerButton}>
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center gap-2 px-2 sm:px-4">
        <button
          type="button"
          onClick={() => onMove(index - 1)}
          disabled={index === 0}
          aria-label="Previous"
          className={cn(viewerButton, 'shrink-0 disabled:opacity-30')}
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>

        <div className="flex h-full min-w-0 flex-1 items-center justify-center">
          {failed.has(item.id) ? (
            <p className="text-sm text-white/80">This {item.kind === 'video' ? 'video' : 'photo'} could not be loaded.</p>
          ) : hidden ? (
            <div className="flex max-w-xs flex-col items-center gap-3 text-center">
              <EyeOff size={28} aria-hidden="true" />
              <p className="text-sm text-white">The family marked this as sensitive.</p>
              <button
                type="button"
                onClick={() => onReveal(item.id)}
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black hover:bg-white/90"
              >
                Show it
              </button>
            </div>
          ) : item.kind === 'image' ? (
            <img
              key={item.id}
              src={item.url}
              alt={label}
              onError={(e) => onBroken(item.id, e.timeStamp)}
              className="max-h-full max-w-full object-contain"
            />
          ) : (
            <div className="flex max-h-full w-full flex-col items-center gap-3">
              <video
                key={item.id}
                src={item.url}
                controls
                playsInline
                preload="metadata"
                aria-label={label}
                onError={(e) => onBroken(item.id, e.timeStamp)}
                className="max-h-[70dvh] max-w-full bg-black"
              />
              <a
                href={item.url}
                download
                className="inline-flex items-center gap-1.5 text-xs text-white/80 underline underline-offset-2 hover:text-white"
              >
                <Download size={12} aria-hidden="true" /> Cannot play it here? Download the video
              </a>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => onMove(index + 1)}
          disabled={index === items.length - 1}
          aria-label="Next"
          className={cn(viewerButton, 'shrink-0 disabled:opacity-30')}
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>

      <div className="flex min-h-[4.5rem] flex-col items-center gap-1.5 p-3 text-center">
        {item.caption && <p className="max-w-2xl text-sm text-white">{item.caption}</p>}
        <ProvenanceBadge value={item.provenance} onDark />
      </div>
    </div>
  )
}

/**
 * A memorial's photos and videos, as a visitor sees them: a grid, and a viewer.
 * Nothing renders when the family has added none.
 *
 * Every file is fetched with a ticket. A page left open past a ticket's life
 * meets an error on the next picture; the first error re-reads the gallery for
 * fresh tickets, and only a second one within ten seconds is believed.
 */
export default function MemorialGallery({ memorial }: { memorial: Memorial }) {
  const gallery = useApi(() => kaluta.memorials.gallery(memorial.id), [memorial.id])
  const [shown, setShown] = useState(FIRST_PAGE)
  const [open, setOpen] = useState<number | null>(null)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [failed, setFailed] = useState<Set<string>>(new Set())
  // When the gallery was last re-read, on the event clock (see `broken`).
  const lastReload = useRef(-Infinity)
  const [opener, setOpener] = useState<HTMLElement | null>(null)

  const items = gallery.data?.items ?? []
  if (items.length === 0) return null

  // `at` is the error event's own timestamp: the moment the browser met the
  // failure, which is the right clock for "was that a second one?".
  const broken = (id: string, at: number) => {
    if (at - lastReload.current > 10_000) {
      lastReload.current = at
      gallery.reload()
    } else {
      setFailed((prev) => new Set(prev).add(id))
    }
  }
  const reveal = (id: string) => setRevealed((prev) => new Set(prev).add(id))
  const visible = items.slice(0, shown)

  return (
    <section className={card} aria-label="Photos and videos">
      <h3 className="mb-3 text-sm font-semibold text-text-hi">
        Photos &amp; videos <span className="font-normal text-text-mid">· {items.length}</span>
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
        {visible.map((item, i) => (
          <Tile
            key={item.id}
            item={item}
            label={item.caption ?? `${item.kind === 'video' ? 'Video' : 'Photo'} ${i + 1} of ${items.length}`}
            revealed={revealed.has(item.id)}
            failed={failed.has(item.id)}
            onOpen={(el) => {
              setOpener(el)
              setOpen(i)
            }}
            onBroken={(at) => broken(item.id, at)}
          />
        ))}
      </div>
      {items.length > shown && (
        <button type="button" onClick={() => setShown(items.length)} className={cn(ghost, 'mt-3')}>
          Show all {items.length}
        </button>
      )}
      {open !== null && items[open] && (
        <Viewer
          items={items}
          index={open}
          revealed={revealed}
          failed={failed}
          fullName={memorial.full_name}
          opener={opener}
          onReveal={reveal}
          onMove={setOpen}
          onClose={() => setOpen(null)}
          onBroken={broken}
        />
      )}
    </section>
  )
}
