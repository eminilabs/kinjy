import { motion } from 'framer-motion'
import { BadgeCheck, Eye, MessageSquare, Radio, ShoppingBag, TrendingUp, UsersRound } from 'lucide-react'
import { cn } from '@/lib/utils'
import { avatarStyle, useAppTheme } from './theme'
import type { ChromeKey } from './theme'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

function Rows({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="space-y-3"
    >
      {children}
    </motion.div>
  )
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  const { tok } = useAppTheme()
  return <div className={cn('rounded-card-lg p-4', tok.card, className)}>{children}</div>
}

function ForumsView() {
  const { tok } = useAppTheme()
  const threads = [
    ['Sack gardens on balconies — dry season results', 'f/urbanfarming', '214'],
    ['Best matatu routes after the new expressway?', 'f/nairobi-life', '98'],
    ['Grandmother recipes: the fermentation thread', 'f/heritage-kitchen', '342'],
  ]
  return (
    <Rows>
      {threads.map(([title, forum, replies]) => (
        <Card key={title}>
          <p className={cn('flex items-center gap-2 text-sm font-bold', tok.text)}>
            <MessageSquare size={14} className="text-sky" aria-hidden="true" /> {title}
          </p>
          <p className={cn('mt-1 text-xs', tok.low)}>{forum} · {replies} replies · AI summary available</p>
        </Card>
      ))}
    </Rows>
  )
}

function CirclesView() {
  const { tok } = useAppTheme()
  const circles = [
    ['Family', '24 members', 'border-gold/40'],
    ['Close Friends', '9 members', 'border-coral/40'],
    ['Business', '57 members', 'border-sky/40'],
    ['Smart Circle · “University”', '112 members · AI-curated', 'border-indigo/60'],
  ]
  return (
    <Rows>
      <div className="grid gap-3 sm:grid-cols-2">
        {circles.map(([name, meta, ring]) => (
          <Card key={name} className={cn('border', ring)}>
            <p className={cn('flex items-center gap-2 text-sm font-bold', tok.text)}>
              <UsersRound size={14} className="text-gold" aria-hidden="true" /> {name}
            </p>
            <p className={cn('mt-1 text-xs', tok.low)}>{meta}</p>
            <button type="button" className={cn('mt-3 rounded-full px-3.5 py-1.5 text-xs font-bold', tok.subtleBg, tok.mid, tok.hoverBg)}>
              Switch feed to this circle
            </button>
          </Card>
        ))}
      </div>
    </Rows>
  )
}

function CommunitiesView() {
  const { tok } = useAppTheme()
  const communities = [
    ['Sunset Poetry Nairobi', '12.4k members', 6],
    ['Kisii Makers Collective', '8.1k members', 10],
    ['Diaspora Homecoming', '31k members', 7],
  ]
  return (
    <Rows>
      {communities.map(([name, members, av]) => (
        <Card key={name} className="flex items-center gap-3">
          <span className="h-11 w-11 shrink-0 rounded-card-sm bg-cover ring-1 ring-gold/30" style={avatarStyle(av as number)} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className={cn('truncate text-sm font-bold', tok.text)}>{name}</p>
            <p className={cn('text-xs', tok.low)}>{members}</p>
          </div>
          <button type="button" className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-3.5 py-1.5 text-xs font-bold text-ink">
            Join
          </button>
        </Card>
      ))}
    </Rows>
  )
}

function MessagesView() {
  const { tok } = useAppTheme()
  const chats = [
    ['Mama Naliaka', 'The reunion photos are beautiful, my child', 3, 2],
    ['Kito', 'Sending the demo tonight, promise', 5, 0],
    ['Family — Wekesa Clan', 'Demo: see you all on Saturday!', 1, 5],
    ['Zawadi Ceramics', 'Your order has shipped · tracking inside', 10, 1],
  ] as const
  return (
    <Rows>
      {chats.map(([name, preview, av, unread]) => (
        <Card key={name} className="flex items-center gap-3">
          <span className="h-10 w-10 shrink-0 rounded-full bg-cover ring-1 ring-gold/30" style={avatarStyle(av)} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className={cn('truncate text-sm font-bold', tok.text)}>{name}</p>
            <p className={cn('truncate text-xs', tok.low)}>{preview}</p>
          </div>
          {unread > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1.5 text-[0.62rem] font-bold text-white">
              {unread}
            </span>
          )}
        </Card>
      ))}
    </Rows>
  )
}

function LiveView() {
  const { tok } = useAppTheme()
  const streams = [
    ['Kito Beats — rooftop session', '2.1k watching', '/creator-studio.jpg'],
    ['Market day live from Kisii', '864 watching', '/marketplace-hero.jpg'],
  ]
  return (
    <Rows>
      {streams.map(([title, viewers, img]) => (
        <Card key={title} className="relative overflow-hidden p-0">
          <img src={img} alt="" className="aspect-video w-full object-cover" loading="lazy" />
          <span className="absolute start-3 top-3 flex items-center gap-1 rounded-full bg-coral px-2.5 py-1 text-[0.65rem] font-bold text-white">
            <Radio size={10} aria-hidden="true" /> LIVE
          </span>
          <div className="p-3.5">
            <p className={cn('text-sm font-bold', tok.text)}>{title}</p>
            <p className={cn('flex items-center gap-1 text-xs', tok.low)}>
              <Eye size={11} aria-hidden="true" /> {viewers}
            </p>
          </div>
        </Card>
      ))}
    </Rows>
  )
}

function ExploreView() {
  const tiles = [
    ['/family-archive-2.jpg', 'Heritage archives'],
    ['/marketplace-hero.jpg', 'Makers near you'],
    ['/memorial-hero.jpg', 'Quiet places'],
    ['/creator-formats.jpg', 'New formats'],
    ['/ads-engine.jpg', 'City pulse'],
    ['/family-archive-3.jpg', 'Restored memories'],
  ]
  return (
    <Rows>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map(([img, label]) => (
          <div key={label} className="group relative overflow-hidden rounded-card-md">
            <img src={img} alt={label} className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/80 to-transparent p-2.5 pt-6 text-[0.68rem] font-bold text-text-hi">
              {label}
            </span>
          </div>
        ))}
      </div>
    </Rows>
  )
}

function MarketplaceView() {
  const { tok } = useAppTheme()
  const products = [
    ['Hand-thrown sufuriya set', '$35.00', 'Zawadi Ceramics · 3.2 km'],
    ['Woven kiondo basket', '$18.50', 'Mumbua Weavers · 5.1 km'],
    ['Single-origin chai blend', '$12.00', 'Kericho Leaf Co. · ships worldwide'],
  ]
  return (
    <Rows>
      {products.map(([name, price, meta]) => (
        <Card key={name} className="flex items-center gap-3.5">
          <img src="/marketplace-hero.jpg" alt="" className="h-16 w-16 shrink-0 rounded-card-sm object-cover" loading="lazy" />
          <div className="min-w-0 flex-1">
            <p className={cn('flex items-center gap-1.5 text-sm font-bold', tok.text)}>
              <ShoppingBag size={13} className="text-gold" aria-hidden="true" /> {name}
            </p>
            <p className={cn('text-xs', tok.low)}>{meta}</p>
          </div>
          <span className="mono-data text-sm font-semibold text-gold-soft">{price}</span>
        </Card>
      ))}
    </Rows>
  )
}

function EarningsView() {
  const { tok } = useAppTheme()
  const rows = [
    ['Creator revenue · Nov', '$412.80', true],
    ['Direct commission', '$96.20', true],
    ['Kinjy Leaders share', '$31.44', true],
    ['AI licensing (agents read your recipes)', '$18.90', true],
  ] as const
  return (
    <Rows>
      <Card>
        <p className={cn('flex items-center gap-2 text-[0.68rem] font-bold uppercase tracking-wider', tok.low)}>
          <TrendingUp size={12} className="text-gold" aria-hidden="true" /> This month
        </p>
        <p className="mono-data mt-1.5 text-3xl font-semibold text-gold-grad">$559.34</p>
        <p className={cn('mt-1 text-xs', tok.low)}>40% you · your sponsor takes 20% of what Kinjy keeps</p>
      </Card>
      {rows.map(([label, amount, ok]) => (
        <Card key={label} className="flex items-center justify-between py-3">
          <span className={cn('text-xs font-semibold', tok.mid)}>{label}</span>
          <span className="flex items-center gap-2">
            <span className="mono-data text-sm text-gold-soft">{amount}</span>
            {ok && <BadgeCheck size={14} className="text-success" aria-label="Reconciled" />}
          </span>
        </Card>
      ))}
    </Rows>
  )
}

const VIEWS: Partial<Record<ChromeKey, () => React.JSX.Element>> = {
  forums: ForumsView,
  circles: CirclesView,
  communities: CommunitiesView,
  messages: MessagesView,
  live: LiveView,
  explore: ExploreView,
  marketplace: MarketplaceView,
  earnings: EarningsView,
}

/** Compact live peek views for non-feed nav modules. */
export default function ModulePeek({ module }: { module: ChromeKey }) {
  const View = VIEWS[module]
  if (!View) return null
  return (
    <div className="pb-16">
      <View />
    </div>
  )
}
