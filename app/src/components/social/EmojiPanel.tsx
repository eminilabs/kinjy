import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Clock, Flag, Hand, Lightbulb, PawPrint, Plane, Search, Smile, Trophy, Utensils, Hash } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  EMOJI_FONT_STACK,
  EMOJI_GROUPS,
  loadEmoji,
  loadRecentEmoji,
  rememberRecentEmoji,
  searchEmoji,
  type EmojiItem,
} from '@/lib/emoji'
import { gridTarget } from '@/lib/gridNav'
import { cn } from '@/lib/utils'

/**
 * The Emojis section of the composer panel: Unicode characters, by category,
 * with local search and recents. Picking one hands the character to the
 * composer, which inserts it at the caret; nothing is sent, so several can be
 * added in a row and the member keeps writing around them.
 *
 * Only one category is drawn at a time (at most ~390 buttons) and search is
 * capped, so the 1,900-emoji list never lands in the page at once.
 *
 * Keyboard: arrows move across the grid and between categories, Enter or
 * Space picks, Escape closes (the panel's owner returns focus to its button).
 */

const RECENT = 'recent'

const ICONS: Record<string, LucideIcon> = {
  [RECENT]: Clock,
  'Smileys & Emotion': Smile,
  'People & Body': Hand,
  'Animals & Nature': PawPrint,
  'Food & Drink': Utensils,
  'Travel & Places': Plane,
  Activities: Trophy,
  Objects: Lightbulb,
  Symbols: Hash,
  Flags: Flag,
}

const LABELS: Record<string, string> = { [RECENT]: 'Recent', 'Smileys & Emotion': 'Smileys & emotion' }
const labelOf = (id: string) => LABELS[id] ?? id

export default function EmojiPanel({
  onPick,
  autoFocus = true,
}: {
  onPick: (char: string) => void
  /** Focus the first emoji once the list is ready. */
  autoFocus?: boolean
}) {
  const [items, setItems] = useState<EmojiItem[] | null>(null)
  const [failed, setFailed] = useState(false)
  // The order shown is fixed while the panel is open: picking an emoji must
  // not move the buttons under the finger.
  const [recentChars] = useState<string[]>(() => loadRecentEmoji())
  const [tab, setTab] = useState<string>(recentChars.length ? RECENT : EMOJI_GROUPS[0])
  const [query, setQuery] = useState('')
  const [announce, setAnnounce] = useState('')
  const grid = useRef<HTMLDivElement>(null)
  const focused = useRef(false)
  const ids = useId()

  useEffect(() => {
    let live = true
    loadEmoji().then(
      (list) => live && setItems(list),
      () => live && setFailed(true),
    )
    return () => {
      live = false
    }
  }, [])

  const byChar = useMemo(() => new Map((items ?? []).map((item) => [item.char, item])), [items])
  const groups = useMemo(() => {
    const present = new Set((items ?? []).map((item) => item.group))
    return EMOJI_GROUPS.filter((group) => present.has(group))
  }, [items])

  // A recents tab with nothing left to show (storage cleared, a character no longer known)
  // falls back to the first category instead of showing an empty grid.
  const recentShown = recentChars.some((char) => byChar.has(char))
  const activeTab = tab === RECENT && items && !recentShown ? EMOJI_GROUPS[0] : tab

  const searching = query.trim() !== ''
  const shown = useMemo(() => {
    if (!items) return []
    if (searching) return searchEmoji(items, query)
    if (activeTab === RECENT) return recentChars.flatMap((char) => (byChar.has(char) ? [byChar.get(char)!] : []))
    return items.filter((item) => item.group === activeTab)
  }, [items, searching, query, activeTab, recentChars, byChar])

  const buttons = () => [...(grid.current?.querySelectorAll<HTMLButtonElement>('button[data-emoji]') ?? [])]

  useEffect(() => {
    if (!autoFocus || !items || focused.current) return
    focused.current = true
    buttons()[0]?.focus()
  }, [autoFocus, items])

  const pick = (item: EmojiItem) => {
    rememberRecentEmoji(item.char)
    setAnnounce(`Inserted ${item.name}`)
    onPick(item.char)
  }

  const onGridKey = (event: React.KeyboardEvent) => {
    const all = buttons()
    const target = gridTarget(event.key, all, all.indexOf(document.activeElement as HTMLButtonElement))
    if (target === undefined) return
    event.preventDefault()
    if (target === 'up') document.getElementById(`${ids}-search`)?.focus()
    else all[target]?.focus()
  }

  const tabs = [...(recentChars.length > 0 && (recentShown || !items) ? [RECENT] : []), ...groups]
  const onTabKey = (event: React.KeyboardEvent) => {
    const at = tabs.indexOf(activeTab)
    const next =
      event.key === 'ArrowRight' ? at + 1 : event.key === 'ArrowLeft' ? at - 1 : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : null
    if (next === null) return
    event.preventDefault()
    const id = tabs[(next + tabs.length) % tabs.length]
    setTab(id)
    setQuery('')
    document.getElementById(`${ids}-tab-${id.replace(/\W/g, '')}`)?.focus()
  }

  if (failed) {
    return (
      <p role="alert" className="w-[min(21rem,calc(100vw-32px))] px-2 py-8 text-center text-sm text-text-low">
        Emojis could not be loaded. Close the panel and try again.
      </p>
    )
  }

  return (
    <div className="flex w-[min(21rem,calc(100vw-32px))] flex-col gap-1.5">
      <div className="relative">
        <Search size={14} aria-hidden="true" className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-text-low" />
        <input
          id={`${ids}-search`}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              buttons()[0]?.focus()
            } else if (event.key === 'Enter' && shown[0]) {
              // Enter here picks the first match; it never sends the message.
              event.preventDefault()
              pick(shown[0])
            }
          }}
          placeholder="Search emojis"
          aria-label="Search emojis"
          autoComplete="off"
          className="w-full rounded-full border border-white/10 bg-ink px-3 py-1.5 ps-8 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none"
        />
      </div>

      <p className="caption px-1" id={`${ids}-heading`}>
        {searching ? 'Search results' : labelOf(activeTab)}
      </p>

      <div
        ref={grid}
        onKeyDown={onGridKey}
        role="group"
        aria-labelledby={`${ids}-heading`}
        aria-busy={!items}
        className="grid max-h-[13.5rem] min-h-[7rem] grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] content-start overflow-y-auto overflow-x-hidden"
      >
        {shown.map((item) => (
          <button
            key={item.char}
            type="button"
            data-emoji={item.char}
            aria-label={item.name}
            title={item.name}
            onClick={() => pick(item)}
            className="flex aspect-square items-center justify-center rounded-card-sm text-2xl leading-none hover:bg-white/10 focus-visible:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/60"
          >
            <span aria-hidden="true" style={{ fontFamily: EMOJI_FONT_STACK }}>
              {item.char}
            </span>
          </button>
        ))}
        {!items && <p className="col-span-full px-2 py-6 text-center text-sm text-text-low">Loading emojis…</p>}
        {items && shown.length === 0 && (
          <p className="col-span-full px-2 py-6 text-center text-sm text-text-low">
            {searching ? 'No emoji matches that.' : 'No emojis here yet.'}
          </p>
        )}
      </div>
      <p className="sr-only" role="status" aria-live="polite">
        {announce || (searching && items ? `${shown.length} ${shown.length === 1 ? 'emoji' : 'emojis'} found` : '')}
      </p>

      <div role="tablist" aria-label="Emoji categories" onKeyDown={onTabKey} className="grid grid-cols-5 place-items-center gap-0.5 border-t border-white/8 pt-1.5">
        {tabs.map((id) => {
          const Icon = ICONS[id] ?? Smile
          const selected = !searching && id === activeTab
          return (
            <button
              key={id}
              id={`${ids}-tab-${id.replace(/\W/g, '')}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-label={labelOf(id)}
              title={labelOf(id)}
              tabIndex={id === activeTab ? 0 : -1}
              onClick={() => {
                setTab(id)
                setQuery('')
              }}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full text-text-mid hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/60',
                selected && 'bg-gold/20 text-text-hi',
              )}
            >
              <Icon size={16} aria-hidden="true" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
