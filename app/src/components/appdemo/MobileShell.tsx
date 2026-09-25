import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Compass, Home, MessageCircle, Plus, User, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { avatarStyle, useAppTheme } from './theme'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
type Tab = 'home' | 'explore' | 'create' | 'messages' | 'profile'

function MiniFeed() {
  const { tok } = useAppTheme()
  const items = [
    ['Amara Jelani', 'Three generations, one veranda…', 1],
    ['Kito Beats', 'New track — Kiswahili dub inside', 5],
    ['Urban Farming KE', 'Sack gardens: dry season results', 8],
  ]
  return (
    <div className="space-y-2.5 p-3">
      <div className={cn('flex items-center gap-2.5 rounded-card-md p-2.5', tok.card)}>
        <span className="h-8 w-8 rounded-full bg-cover ring-1 ring-gold/30" style={avatarStyle(0)} aria-hidden="true" />
        <span className={cn('flex-1 rounded-full px-3 py-1.5 text-[0.7rem]', tok.input, tok.low)}>Share with your world…</span>
      </div>
      {items.map(([author, text, av]) => (
        <div key={author as string} className={cn('rounded-card-md p-3', tok.card)}>
          <div className="flex items-center gap-2">
            <span className="h-7 w-7 rounded-full bg-cover ring-1 ring-gold/30" style={avatarStyle(av as number)} aria-hidden="true" />
            <span className={cn('text-[0.72rem] font-bold', tok.text)}>{author}</span>
          </div>
          <p className={cn('mt-1.5 text-[0.72rem] leading-relaxed', tok.mid)}>{text}</p>
          <div className="mt-2 h-20 rounded-card-sm bg-cover bg-center" style={{ backgroundImage: 'url(/family-archive-1.jpg)' }} />
        </div>
      ))}
    </div>
  )
}

function MiniExplore() {
  const tiles = ['/family-archive-2.jpg', '/marketplace-hero.jpg', '/memorial-hero.jpg', '/creator-formats.jpg', '/ads-engine.jpg', '/family-archive-3.jpg']
  return (
    <div className="grid grid-cols-3 gap-1.5 p-3">
      {tiles.map((src) => (
        <div key={src} className="aspect-square rounded-sm bg-cover bg-center" style={{ backgroundImage: `url(${src})` }} />
      ))}
    </div>
  )
}

function MiniMessages() {
  const { tok } = useAppTheme()
  const chats = [['Mama Naliaka', 3, 2], ['Kito', 5, 0], ['Wekesa Clan', 1, 5], ['Zawadi Ceramics', 10, 1]] as const
  return (
    <div className="space-y-2 p-3">
      {chats.map(([name, av, unread]) => (
        <div key={name} className={cn('flex items-center gap-2.5 rounded-card-md p-2.5', tok.card)}>
          <span className="h-8 w-8 rounded-full bg-cover ring-1 ring-gold/30" style={avatarStyle(av)} aria-hidden="true" />
          <span className={cn('flex-1 text-[0.72rem] font-bold', tok.text)}>{name}</span>
          {unread > 0 && <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[0.55rem] font-bold text-white">{unread}</span>}
        </div>
      ))}
    </div>
  )
}

function MiniProfile() {
  const { tok } = useAppTheme()
  return (
    <div className="p-3 text-center">
      <span className="mx-auto mt-4 block h-20 w-20 rounded-full bg-cover ring-2 ring-gold/50" style={avatarStyle(0)} aria-hidden="true" />
      <p className={cn('mt-2 text-sm font-bold', tok.text)}>Baraka Otieno</p>
      <p className={cn('text-[0.7rem]', tok.low)}>@baraka.o · 12 members sponsored</p>
      <div className="mt-4 grid grid-cols-3 gap-2">
        {[['Posts', '148'], ['Family', '24'], ['Earnings', '$559']].map(([l, v]) => (
          <div key={l} className={cn('rounded-card-md p-2.5', tok.card)}>
            <p className="mono-data text-sm font-semibold text-gold-soft">{v}</p>
            <p className={cn('text-[0.6rem]', tok.low)}>{l}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Section 6 — phone frame with the mandated bottom bar and raised gold FAB. */
export default function MobileShell() {
  const { tok } = useAppTheme()
  const [tab, setTab] = useState<Tab>('home')
  const [sheetOpen, setSheetOpen] = useState(false)

  const pick = (t: Tab) => {
    if (t === 'create') {
      setSheetOpen(true)
      return
    }
    setSheetOpen(false)
    setTab(t)
  }

  const BAR: { id: Tab; icon: typeof Home; label: string }[] = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'explore', icon: Compass, label: 'Explore' },
    { id: 'create', icon: Plus, label: 'Create' },
    { id: 'messages', icon: MessageCircle, label: 'Messages' },
    { id: 'profile', icon: User, label: 'Profile' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, rotateY: 12, y: 40 }}
      whileInView={{ opacity: 1, rotateY: 0, y: 0 }}
      viewport={{ once: true, margin: '-15%' }}
      transition={{ duration: 0.8, ease: EASE }}
      className="relative mx-auto h-[760px] w-[390px] max-w-full overflow-hidden rounded-card-xl ring-1 ring-gold/40 shadow-cloud-hover"
      style={{ background: 'radial-gradient(ellipse at 30% 20%, #2E2A6E 0%, #0B0E1D 65%)', perspective: '1200px' }}
    >
      {/* top mini-bar */}
      <div className={cn('flex h-12 items-center gap-2 border-b px-3.5', tok.card, 'rounded-none border-x-0 border-t-0')}>
        <img src="/logo.svg" alt="" className="h-6 w-6" />
        <span className={cn('flex-1 rounded-full px-3 py-1.5 text-[0.68rem]', tok.input, tok.low)}>
          Search Kinjy…
        </span>
        <span className="h-6 w-6 rounded-full bg-cover ring-1 ring-gold/40" style={avatarStyle(0)} aria-hidden="true" />
      </div>

      {/* content */}
      <div className="h-[calc(100%-48px-72px)] overflow-y-auto overscroll-contain">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {tab === 'home' && <MiniFeed />}
            {tab === 'explore' && <MiniExplore />}
            {tab === 'messages' && <MiniMessages />}
            {tab === 'profile' && <MiniProfile />}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* assistant edge tab */}
      <span
        aria-hidden="true"
        className="absolute end-0 top-1/2 h-12 w-2.5 -translate-y-1/2 rounded-s-full"
        style={{ background: 'var(--grad-orb)' }}
        title="Assistant edge tab"
      />

      {/* composer sheet */}
      <AnimatePresence>
        {sheetOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-ink/50"
              onClick={() => setSheetOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className={cn('absolute inset-x-0 bottom-0 rounded-t-r-xl p-4', tok.cardSolid)}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/20" />
              <div className="flex items-center gap-2.5">
                <span className="h-9 w-9 rounded-full bg-cover ring-1 ring-gold/30" style={avatarStyle(0)} aria-hidden="true" />
                <span className={cn('flex-1 rounded-full px-3.5 py-2 text-[0.72rem]', tok.input, tok.low)}>
                  Share with Close Friends…
                </span>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  aria-label="Close composer"
                  className={cn('flex h-8 w-8 items-center justify-center rounded-full', tok.subtleBg, tok.mid)}
                >
                  <X size={14} />
                </button>
              </div>
              <div className="mt-3 flex gap-2">
                {['Photo', 'Video', 'Audio', 'Article', 'Live'].map((f) => (
                  <span key={f} className={cn('rounded-full px-3 py-1.5 text-[0.65rem] font-semibold', tok.subtleBg, tok.mid)}>{f}</span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                className="mt-3 w-full rounded-full bg-gradient-to-br from-gold-soft to-gold py-2.5 text-xs font-bold text-ink"
              >
                Post
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* mandated bottom bar with raised gold center FAB */}
      <nav
        className={cn('absolute inset-x-0 bottom-0 flex h-[72px] items-end justify-around border-t px-2 pb-2.5', tok.card, 'rounded-none border-x-0 border-b-0')}
        aria-label="Mobile navigation"
      >
        {BAR.map((b) => {
          const active = tab === b.id && b.id !== 'create'
          if (b.id === 'create') {
            return (
              <motion.button
                key={b.id}
                type="button"
                onClick={() => pick(b.id)}
                whileTap={{ scale: 0.92 }}
                aria-label="Create"
                className="relative -top-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-gold-soft to-gold text-ink shadow-[0_10px_24px_-6px_rgba(217,166,72,0.55),inset_0_1px_0_rgba(255,255,255,0.35)]"
              >
                <Plus size={22} strokeWidth={2.6} />
              </motion.button>
            )
          }
          return (
            <button
              key={b.id}
              type="button"
              onClick={() => pick(b.id)}
              aria-label={b.label}
              aria-current={active ? 'page' : undefined}
              className="flex flex-col items-center gap-1 px-3 py-1"
            >
              <b.icon size={19} className={active ? 'text-gold-soft' : 'text-text-low'} aria-hidden="true" />
              {active && (
                <motion.span
                  layoutId="mobile-bar-dot"
                  className="h-1 w-1 rounded-full bg-gold"
                  transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                />
              )}
            </button>
          )
        })}
      </nav>
    </motion.div>
  )
}
