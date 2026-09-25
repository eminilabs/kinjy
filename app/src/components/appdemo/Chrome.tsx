import { useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell, Coins, Globe, Home, Landmark, MessagesSquare, Pin, Plus, Radio,
  Search, Store, TreePine, Users, UsersRound,
  Compass, CircleUserRound, Flame, Cloudy, Sun, Moon, MonitorSmartphone,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { avatarStyle, useAppTheme, NAV_MODULES } from './theme'
import type { ChromeKey, DisplayMode, AppLang } from './theme'

export const MODULE_ICONS: Partial<Record<ChromeKey, LucideIcon>> = {
  home: Home, following: Users, forYou: Flame, public: Globe, forums: MessagesSquare,
  circles: CircleUserRound, communities: UsersRound, messages: MessagesSquare, live: Radio,
  familyTree: TreePine, graveyard: Landmark, explore: Compass, marketplace: Store,
  create: Plus, earnings: Coins, profile: CircleUserRound,
}

const LANG_LABELS: Record<AppLang, string> = { en: 'English', sw: 'Kiswahili', fr: 'Français', ar: 'العربية', zh: '中文' }
const MODE_ICONS: Record<DisplayMode, LucideIcon> = { cloud: Cloudy, light: Sun, dark: Moon, system: MonitorSmartphone }
const MODE_LABELS: Record<DisplayMode, string> = { cloud: 'Cloud', light: 'Light', dark: 'Dark', system: 'System' }

/* ---------------------------------- Top bar ---------------------------------- */

export function TopBar() {
  const { t, tok, lang, setLang, mode, setMode, rtl } = useAppTheme()
  const [langOpen, setLangOpen] = useState(false)

  return (
    <div className={cn('flex h-[64px] items-center gap-3 border-b px-4', tok.card, 'rounded-t-[inherit] border-x-0 border-t-0')}>
      {/* logo-mini → back to marketing home */}
      <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="Back to Kinjy home">
        <img src="/logo.svg" alt="" className="h-7 w-7" />
        <span className={cn('hidden font-display text-base font-medium lg:block', tok.text)}>Kinjy</span>
      </Link>

      <label className={cn('relative mx-1 flex min-w-0 flex-1 items-center rounded-full px-3.5 py-2', tok.input)}>
        <Search size={15} className={cn('shrink-0', tok.low)} aria-hidden="true" />
        <input
          type="search"
          placeholder={t('search')}
          className={cn('min-w-0 flex-1 bg-transparent px-2.5 text-sm outline-none placeholder:opacity-70', tok.text)}
        />
        <kbd className={cn('hidden shrink-0 rounded-md border border-current px-1.5 py-0.5 font-mono text-[0.62rem] opacity-60 sm:block', tok.low)}>
          ⌘K
        </kbd>
      </label>

      {/* language */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setLangOpen((v) => !v)}
          aria-expanded={langOpen}
          aria-label="Change app language"
          className={cn('flex h-9 w-9 items-center justify-center rounded-full transition-colors', tok.hoverBg, tok.mid)}
        >
          <Globe size={16} />
        </button>
        <AnimatePresence>
          {langOpen && (
            <motion.ul
              initial={{ opacity: 0, y: 6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className={cn('absolute end-0 top-11 z-50 w-40 rounded-card-md p-1.5 shadow-cloud', tok.cardSolid)}
            >
              {(Object.keys(LANG_LABELS) as AppLang[]).map((l) => (
                <li key={l}>
                  <button
                    type="button"
                    onClick={() => { setLang(l); setLangOpen(false) }}
                    className={cn(
                      'w-full rounded-card-sm px-3 py-1.5 text-start text-sm transition-colors',
                      lang === l ? 'bg-gold/15 text-gold-soft' : cn(tok.mid, tok.hoverBg),
                    )}
                  >
                    {LANG_LABELS[l]}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      {/* display mode 4-way segmented */}
      <div className={cn('hidden items-center rounded-full p-0.5 md:flex', tok.input)} role="radiogroup" aria-label="Display mode">
        {(Object.keys(MODE_ICONS) as DisplayMode[]).map((m) => {
          const Icon = MODE_ICONS[m]
          const active = mode === m
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={active}
              title={MODE_LABELS[m]}
              onClick={() => setMode(m)}
              className={cn(
                'flex h-7 w-7 items-center justify-center rounded-full transition-all duration-200',
                active ? 'bg-gradient-to-br from-gold-soft to-gold text-ink' : cn(tok.low, tok.hoverBg),
              )}
            >
              <Icon size={13} />
            </button>
          )
        })}
      </div>

      {/* notifications */}
      <button
        type="button"
        aria-label="Notifications, 3 unread"
        className={cn('relative flex h-9 w-9 items-center justify-center rounded-full transition-colors', tok.hoverBg, tok.mid)}
      >
        <Bell size={16} />
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.9, duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
          className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[0.58rem] font-bold text-white"
        >
          3
        </motion.span>
      </button>

      {/* avatar */}
      <button type="button" aria-label="Your profile" className="h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-gold/50">
        <span className="block h-full w-full bg-cover" style={avatarStyle(rtl ? 3 : 0)} />
      </button>
    </div>
  )
}

/* ---------------------------------- Chip bar ---------------------------------- */

interface ChipBarProps {
  active: ChromeKey
  pinned: ChromeKey[]
  onSelect: (m: ChromeKey) => void
  onTogglePin: (m: ChromeKey) => void
}

export function ChipBar({ active, pinned, onSelect, onTogglePin }: ChipBarProps) {
  const { t, tok } = useAppTheme()
  const ordered = [...pinned, ...NAV_MODULES.filter((m) => !pinned.includes(m))]

  return (
    <div
      className={cn('flex items-center gap-1.5 overflow-x-auto border-b px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', tok.card, 'border-x-0 border-t-0')}
      role="tablist"
      aria-label="Universal navigation"
    >
      <AnimatePresence initial={false}>
        {ordered.map((m) => {
          const Icon = MODULE_ICONS[m] ?? Home
          const isActive = active === m
          const isPinned = pinned.includes(m)
          return (
            <motion.div
              key={m}
              layout="position"
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="group relative shrink-0"
            >
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onSelect(m)}
                className={cn(
                  'relative flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[0.8rem] font-semibold transition-colors duration-200',
                  isActive
                    ? 'bg-gradient-to-br from-gold-soft to-gold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]'
                    : cn(tok.mid, tok.hoverBg, tok.subtleBg),
                )}
              >
                <Icon size={13} aria-hidden="true" />
                {t(m)}
                {isPinned && !isActive && (
                  <span className="absolute -top-0.5 end-1 h-1.5 w-1.5 rounded-full bg-gold" aria-label="Pinned" />
                )}
              </button>
              {/* pin affordance on hover */}
              <button
                type="button"
                onClick={() => onTogglePin(m)}
                aria-label={isPinned ? `Unpin ${t(m)}` : `Pin ${t(m)}`}
                className={cn(
                  'absolute -top-2 end-0 z-10 hidden h-[18px] w-[18px] items-center justify-center rounded-full border text-[0.5rem] shadow-sm transition-opacity group-hover:flex',
                  isPinned ? 'border-gold/50 bg-gold text-ink' : cn(tok.cardSolid, tok.mid),
                )}
              >
                <Pin size={9} aria-hidden="true" />
              </button>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
