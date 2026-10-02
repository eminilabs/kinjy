import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Clock, Search, Smile } from 'lucide-react'
import FloatingPanel from '@/components/social/FloatingPanel'
import type { Sticker, StickerCatalogue } from '@/lib/api'
import { loadRecents, matchesQuery, rememberRecent, stickerUrl } from '@/lib/stickers'
import { cn } from '@/lib/utils'

/**
 * The sticker panel: one tab per pack, the stickers used lately, and a search
 * over the local catalogue. It has two jobs and one implementation - the
 * composer opens it to send a sticker, a message's reaction button opens it to
 * react - so both read the same catalogue and behave the same.
 *
 * The catalogue is the server's (GET /stickers); nothing here invents a
 * sticker, an id or a picture address. Keyboard: arrows move across the grid
 * and between tabs, Enter picks, Escape closes (and focus goes back to what
 * opened it). Every sticker has the name a screen reader announces.
 */

const RECENT = 'recent'

export default function StickerPanel({
  catalogue,
  current,
  onPick,
}: {
  catalogue: StickerCatalogue
  /** The sticker already chosen, when the panel is used for a reaction. */
  current?: string
  onPick: (id: string) => void
}) {
  const byId = useMemo(() => new Map(catalogue.items.map((s) => [s.id, s])), [catalogue])
  const [recents, setRecents] = useState<Sticker[]>(() =>
    loadRecents().flatMap((id) => (byId.has(id) ? [byId.get(id)!] : [])),
  )
  const [tab, setTab] = useState<string>(() => (recents.length ? RECENT : (catalogue.packs[0]?.id ?? RECENT)))
  const [query, setQuery] = useState('')
  const grid = useRef<HTMLDivElement>(null)
  const ids = useId()

  const searching = query.trim() !== ''
  const shown = useMemo(() => {
    if (searching) return catalogue.items.filter((s) => matchesQuery(s, query))
    if (tab === RECENT) return recents
    return catalogue.items.filter((s) => s.pack === tab)
  }, [catalogue, query, searching, tab, recents])

  const stickerButtons = () => [...(grid.current?.querySelectorAll<HTMLButtonElement>('button[data-sticker]') ?? [])]

  // Focus goes to the sticker already chosen, else the first one, so a
  // keyboard user can pick straight away; Shift+Tab reaches search and tabs.
  useEffect(() => {
    const buttons = stickerButtons()
    ;(buttons.find((b) => b.dataset.sticker === current) ?? buttons[0])?.focus()
    // Once, on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pick = (id: string) => {
    rememberRecent(id)
    setRecents(loadRecents().flatMap((r) => (byId.has(r) ? [byId.get(r)!] : [])))
    onPick(id)
  }

  const onGridKey = (e: React.KeyboardEvent) => {
    const buttons = stickerButtons()
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement)
    if (at < 0) return
    let next: number | undefined
    if (e.key === 'ArrowRight') next = at + 1
    else if (e.key === 'ArrowLeft') next = at - 1
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = buttons.length - 1
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      // Same column, next row: the nearest button below or above by position.
      const here = buttons[at].getBoundingClientRect()
      const wanted = e.key === 'ArrowDown'
      const candidates = buttons
        .map((b, i) => ({ i, r: b.getBoundingClientRect() }))
        .filter(({ r }) => (wanted ? r.top > here.top + 4 : r.top < here.top - 4))
      if (candidates.length) {
        const rowTop = wanted
          ? Math.min(...candidates.map(({ r }) => r.top))
          : Math.max(...candidates.map(({ r }) => r.top))
        next = candidates
          .filter(({ r }) => Math.abs(r.top - rowTop) < 4)
          .sort((a, b) => Math.abs(a.r.left - here.left) - Math.abs(b.r.left - here.left))[0]?.i
      } else if (!wanted) {
        document.getElementById(`${ids}-search`)?.focus()
        e.preventDefault()
        return
      }
    }
    if (next === undefined) return
    e.preventDefault()
    buttons[Math.min(Math.max(next, 0), buttons.length - 1)]?.focus()
  }

  const tabs = [
    ...(recents.length ? [{ id: RECENT, name: 'Recent', sample: null as Sticker | null }] : []),
    ...catalogue.packs.map((p) => ({ id: p.id, name: p.name, sample: catalogue.items.find((s) => s.pack === p.id) ?? null })),
  ]
  const onTabKey = (e: React.KeyboardEvent) => {
    const at = tabs.findIndex((t) => t.id === tab)
    const next = e.key === 'ArrowRight' ? at + 1 : e.key === 'ArrowLeft' ? at - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null
    if (next === null) return
    e.preventDefault()
    const target = tabs[(next + tabs.length) % tabs.length]
    setTab(target.id)
    setQuery('')
    document.getElementById(`${ids}-tab-${target.id}`)?.focus()
  }

  return (
    <div className="flex w-[min(21rem,calc(100vw-32px))] flex-col gap-1.5">
      <div className="relative">
        <Search size={14} aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-low" />
        <input
          id={`${ids}-search`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              stickerButtons()[0]?.focus()
            } else if (e.key === 'Enter' && shown[0]) {
              e.preventDefault()
              pick(shown[0].id)
            }
          }}
          placeholder="Search stickers"
          aria-label="Search stickers"
          autoComplete="off"
          className="w-full rounded-full border border-white/10 bg-ink px-3 py-1.5 ps-8 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none"
        />
      </div>

      <div
        ref={grid}
        onKeyDown={onGridKey}
        role="group"
        aria-label={searching ? 'Search results' : (tabs.find((t) => t.id === tab)?.name ?? 'Stickers')}
        className="grid max-h-[15rem] min-h-[7rem] grid-cols-[repeat(auto-fill,minmax(3.25rem,1fr))] content-start gap-1 overflow-y-auto overflow-x-hidden"
      >
        {shown.map((s) => {
          const url = stickerUrl(s.id)
          return (
            <button
              key={s.id}
              type="button"
              data-sticker={s.id}
              aria-label={s.name}
              aria-pressed={current === undefined ? undefined : s.id === current}
              title={s.name}
              onClick={() => pick(s.id)}
              className={cn(
                'flex aspect-square items-center justify-center rounded-card-sm p-1 hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/60',
                s.id === current && 'bg-gold/20',
              )}
            >
              {url && <img src={url} alt="" draggable={false} className="h-full w-full object-contain" />}
            </button>
          )
        })}
        {shown.length === 0 && (
          <p className="col-span-full px-2 py-6 text-center text-sm text-text-low">
            {searching ? 'No sticker matches that.' : 'No stickers here yet.'}
          </p>
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {searching ? `${shown.length} ${shown.length === 1 ? 'sticker' : 'stickers'} found` : ''}
      </p>

      <div role="tablist" aria-label="Sticker packs" onKeyDown={onTabKey} className="flex flex-wrap gap-1 border-t border-white/8 pt-1.5">
        {tabs.map((t) => {
          const selected = !searching && t.id === tab
          const sampleUrl = t.sample ? stickerUrl(t.sample.id) : null
          return (
            <button
              key={t.id}
              id={`${ids}-tab-${t.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={t.name}
              title={t.name}
              tabIndex={selected || (searching && t.id === tab) ? 0 : -1}
              onClick={() => {
                setTab(t.id)
                setQuery('')
              }}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full text-text-mid hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/60',
                selected && 'bg-gold/20 text-text-hi',
              )}
            >
              {t.id === RECENT ? (
                <Clock size={16} aria-hidden="true" />
              ) : sampleUrl ? (
                <img src={sampleUrl} alt="" draggable={false} className="h-6 w-6" />
              ) : (
                <Smile size={16} aria-hidden="true" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * The composer's sticker button: opens the panel above the message field and
 * sends the chosen sticker. Focus returns to the button when the panel closes.
 */
export function StickerButton({
  catalogue,
  onSend,
}: {
  catalogue: StickerCatalogue | null
  onSend: (stickerId: string) => void
}) {
  const [anchor, setAnchor] = useState<DOMRect | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  const close = () => {
    setAnchor(null)
    button.current?.focus()
  }
  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={(e) => (anchor ? close() : setAnchor(e.currentTarget.getBoundingClientRect()))}
        disabled={!catalogue}
        aria-label="Stickers"
        aria-haspopup="dialog"
        aria-expanded={Boolean(anchor)}
        title={catalogue ? 'Stickers' : 'Stickers are unavailable right now'}
        className="shrink-0 rounded-full border border-white/12 p-2.5 text-text-mid hover:border-gold/40 hover:text-gold-soft disabled:opacity-40"
      >
        <Smile size={15} aria-hidden="true" />
      </button>
      {anchor && catalogue && (
        <FloatingPanel anchor={anchor} label="Choose a sticker" onClose={close}>
          <StickerPanel
            catalogue={catalogue}
            onPick={(id) => {
              onSend(id)
              close()
            }}
          />
        </FloatingPanel>
      )}
    </>
  )
}
