import { useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Home, Users, Sparkles, Globe, MessageSquare, MessagesSquare, Users2, Radio, Flame,
  Store, Plus, Coins, Pin, Search, Bell, Compass, MoreHorizontal,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, CLOUD_EASE } from './shared'

const DESTINATIONS = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'following', label: 'Following', icon: Users },
  { key: 'foryou', label: 'For You', icon: Sparkles },
  { key: 'public', label: 'Public', icon: Globe },
  { key: 'forums', label: 'Forums', icon: MessageSquare },
  { key: 'circles', label: 'Circles', icon: Users2 },
  { key: 'communities', label: 'Communities', icon: Users },
  { key: 'messages', label: 'Messages', icon: MessagesSquare },
  { key: 'live', label: 'Live', icon: Radio },
  { key: 'family', label: 'Family Tree', icon: Users2 },
  { key: 'graveyard', label: 'Graveyard', icon: Flame },
  { key: 'explore', label: 'Explore', icon: Compass },
  { key: 'marketplace', label: 'Marketplace', icon: Store },
  { key: 'create', label: 'Create', icon: Plus },
  { key: 'earnings', label: 'Earnings', icon: Coins },
]

const BULLETS = [
  { title: 'Pin your favorite modules', body: 'Hover any chip and pin it — pinned destinations travel with you.' },
  { title: 'Overflow into “More”', body: 'Every module stays one tap away, even on the narrowest screen.' },
  { title: 'Persistent everywhere', body: 'The same navigation across web, PWA and native shells.' },
  { title: 'Keyboard-navigable', body: 'Full arrow-key map across chips, pins and overflow.' },
]

/** Desktop app-shell bar replica: 15 scrollable destination chips with pins. */
function AppShellBar() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [pinned, setPinned] = useState<Set<string>>(new Set(['home', 'messages', 'create']))

  const togglePin = (key: string) =>
    setPinned((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  return (
    <div className="cloud-card overflow-hidden rounded-card-xl">
      {/* Primary bar */}
      <div className="flex items-center gap-3 border-b border-white/10 bg-ink-2/70 px-4 py-3">
        <img src="/logo.svg" alt="" className="h-6 w-6" />
        <span className="font-display text-sm font-medium">Kinjy</span>
        <div className="ml-auto flex items-center gap-2 text-text-mid">
          <Search size={15} />
          <Bell size={15} />
          <Avatar index={4} size={24} name="You" />
        </div>
      </div>
      {/* Chip bar — horizontally scrollable with drag inertia */}
      <div
        ref={scrollRef}
        className="flex items-center gap-1.5 overflow-x-auto px-3 py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <motion.div drag="x" dragConstraints={scrollRef} dragElastic={0.08} className="flex cursor-grab items-center gap-1.5 active:cursor-grabbing">
          {DESTINATIONS.map((d) => {
            const isPinned = pinned.has(d.key)
            return (
              <div
                key={d.key}
                className={cn(
                  'group relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                  d.key === 'create'
                    ? 'bg-gradient-to-br from-gold-soft to-gold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]'
                    : 'bg-white/5 text-text-mid hover:bg-white/10 hover:text-text-hi',
                )}
              >
                <d.icon size={13} />
                {d.label}
                {isPinned && <span className="absolute -top-0.5 right-2 h-1.5 w-1.5 rounded-full bg-gold shadow-[0_0_6px_rgba(217,166,72,0.9)]" aria-label="Pinned" />}
                <button
                  type="button"
                  onClick={() => togglePin(d.key)}
                  aria-label={`${isPinned ? 'Unpin' : 'Pin'} ${d.label}`}
                  className={cn(
                    'ml-0.5 rounded-full p-0.5 transition-all duration-200',
                    isPinned ? 'text-gold-soft opacity-100' : 'text-text-low opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 hover:text-gold-soft',
                  )}
                >
                  <Pin size={11} fill={isPinned ? 'currentColor' : 'none'} />
                </button>
              </div>
            )
          })}
          <div className="flex shrink-0 items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 text-xs font-semibold text-text-mid">
            <MoreHorizontal size={13} /> More
          </div>
        </motion.div>
      </div>
    </div>
  )
}

/** Phone frame with the mobile bottom bar (raised gold Create FAB). */
function PhoneFrame() {
  return (
    <div className="relative mx-auto w-[260px]">
      <div className="cloud-card overflow-hidden rounded-[2rem] border-white/20 bg-ink-2/80 shadow-cloud-hover">
        {/* Screen */}
        <div className="space-y-2.5 p-4 pb-20">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="" className="h-5 w-5" />
            <span className="font-display text-xs font-medium">Kinjy</span>
          </div>
          {[2, 8].map((a) => (
            <div key={a} className="rounded-card-sm border border-white/10 bg-white/5 p-3">
              <div className="flex items-center gap-2">
                <Avatar index={a} size={26} />
                <div className="h-2 w-20 rounded-full bg-white/15" />
              </div>
              <div className="mt-2.5 h-2 w-full rounded-full bg-white/10" />
              <div className="mt-1.5 h-2 w-3/4 rounded-full bg-white/10" />
              <div className="mt-2.5 h-16 rounded-card-sm bg-gradient-to-br from-indigo/30 to-gold/15" />
            </div>
          ))}
        </div>
        {/* Bottom bar */}
        <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-ink-2/95 px-6 pb-4 pt-2.5 backdrop-blur-xl">
          <div className="relative flex items-center justify-between text-text-mid">
            <Home size={19} className="text-gold-soft" />
            <Compass size={19} />
            <span className="w-12" />
            <MessagesSquare size={19} />
            <Avatar index={4} size={22} name="Profile" />
            {/* Raised gold Create FAB, center-docked */}
            <span className="absolute -top-8 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full bg-gradient-to-br from-gold-soft to-gold text-ink shadow-[0_10px_24px_-6px_rgba(217,166,72,0.6),inset_0_1px_0_rgba(255,255,255,0.4)]">
              <Plus size={22} strokeWidth={2.6} />
            </span>
          </div>
        </div>
      </div>
      {/* Notch hint */}
      <div className="absolute left-1/2 top-2.5 h-4 w-20 -translate-x-1/2 rounded-full bg-ink/90" />
    </div>
  )
}

/** Section 4 — Universal navigation. */
export default function UniversalNav() {
  const reduced = useReducedMotion()
  return (
    <section className="px-6 py-24 md:py-32" aria-label="Universal navigation">
      <div className="mx-auto max-w-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-gold">Universal Navigation</p>
          <h2 className="h2 mt-4">One navigation. Everywhere.</h2>
          <p className="body-lg mt-4 text-text-mid">
            Fifteen destinations, one scrollable bar — identical on web, PWA and native. Pin what
            you love; everything else waits politely in “More”.
          </p>
        </div>

        <div className="mt-14 grid items-center gap-12 lg:grid-cols-12">
          {/* Desktop bar replica */}
          <motion.div
            className="lg:col-span-7"
            initial={reduced ? false : { opacity: 0, y: -40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.65 }}
            transition={{ duration: 0.6, ease: CLOUD_EASE }}
          >
            <AppShellBar />
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {BULLETS.map((b, i) => (
                <motion.li
                  key={b.title}
                  className="cloud-glass rounded-card-md p-4"
                  initial={reduced ? false : { opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.45, ease: CLOUD_EASE, delay: 0.15 + i * 0.08 }}
                >
                  <p className="text-sm font-bold text-text-hi">{b.title}</p>
                  <p className="caption mt-1">{b.body}</p>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Phone frame */}
          <motion.div
            className="lg:col-span-5"
            initial={reduced ? false : { opacity: 0, rotateY: 12 }}
            whileInView={{ opacity: 1, rotateY: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.6, ease: CLOUD_EASE }}
            style={{ transformPerspective: 900 }}
          >
            <PhoneFrame />
            <p className="caption mt-6 text-center">Mobile bottom bar · raised gold Create, center-docked</p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
