import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarCheck, Flame, MessageSquare, Play, ShoppingBag, Sparkles, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProvenanceTag, WhyAmISeeingThis } from '@/components/ui-kit'
import { avatarStyle, useAppTheme } from './theme'

export type FeedMode =
  | 'forYou' | 'latest' | 'following' | 'familyFirst' | 'local'
  | 'professional' | 'calm' | 'deepReads' | 'watch' | 'marketPicks'

export const FEED_MODES: { id: FeedMode; label: string }[] = [
  { id: 'forYou', label: 'For You' },
  { id: 'latest', label: 'Latest' },
  { id: 'following', label: 'Following' },
  { id: 'familyFirst', label: 'Family First' },
  { id: 'local', label: 'Local' },
  { id: 'professional', label: 'Professional' },
  { id: 'calm', label: 'Calm' },
  { id: 'deepReads', label: 'Deep Reads' },
  { id: 'watch', label: 'Watch' },
  { id: 'marketPicks', label: 'Market Picks' },
]

export type PostKind = 'photo' | 'video' | 'forum' | 'product' | 'memorial' | 'event' | 'user'

export interface Post {
  id: string
  author: string
  avatar: number
  handle: string
  time: string
  circle: string
  kind: PostKind
  recommended?: boolean
  reasons?: string[]
  suggestedMode?: FeedMode
  justNow?: boolean
  text?: string
  rank: Record<FeedMode, number>
}

export const SEED_POSTS: Post[] = [
  {
    id: 'p-photo', author: 'Amara Jelani', avatar: 1, handle: '@amara.j', time: '2h', circle: 'Family',
    kind: 'photo', recommended: true, suggestedMode: 'familyFirst',
    reasons: ['L2 family · your mother’s circle', 'You often react to family photos', 'Shared in Family circle'],
    rank: { forYou: 1, latest: 3, following: 2, familyFirst: 0, local: 4, professional: 5, calm: 1, deepReads: 5, watch: 5, marketPicks: 5 },
  },
  {
    id: 'p-video', author: 'Kito Beats', avatar: 5, handle: '@kitobeats', time: '4h', circle: 'Public',
    kind: 'video', recommended: true, suggestedMode: 'watch',
    reasons: ['Trending in Kiswahili audio', 'AI-dubbed into your language', '3 friends watched this'],
    rank: { forYou: 0, latest: 2, following: 5, familyFirst: 5, local: 1, professional: 4, calm: 5, deepReads: 4, watch: 0, marketPicks: 4 },
  },
  {
    id: 'p-forum', author: 'Urban Farming KE', avatar: 8, handle: 'f/urbanfarming', time: '6h', circle: 'Forums',
    kind: 'forum', recommended: true, suggestedMode: 'deepReads',
    reasons: ['You joined f/urbanfarming', 'Hot thread · 214 replies', 'Matches your Deep Reads mode'],
    rank: { forYou: 2, latest: 1, following: 1, familyFirst: 4, local: 0, professional: 1, calm: 2, deepReads: 0, watch: 4, marketPicks: 3 },
  },
  {
    id: 'p-product', author: 'Zawadi Ceramics', avatar: 10, handle: '@zawadi.clay', time: '8h', circle: 'Marketplace',
    kind: 'product', recommended: true, suggestedMode: 'marketPicks',
    reasons: ['Near you · 3.2 km', 'Similar to items you saved', 'Seller keeps 80%'],
    rank: { forYou: 3, latest: 4, following: 4, familyFirst: 3, local: 2, professional: 3, calm: 4, deepReads: 3, watch: 3, marketPicks: 0 },
  },
  {
    id: 'p-memorial', author: 'Naliaka Wekesa', avatar: 3, handle: '@naliaka', time: '12h', circle: 'Family',
    kind: 'memorial', recommended: false,
    rank: { forYou: 4, latest: 0, following: 0, familyFirst: 1, local: 5, professional: 2, calm: 0, deepReads: 2, watch: 2, marketPicks: 2 },
  },
  {
    id: 'p-event', author: 'Sunset Poetry Nairobi', avatar: 6, handle: 'e/sunsetpoetry', time: '1d', circle: 'Communities',
    kind: 'event', recommended: false,
    rank: { forYou: 5, latest: 5, following: 3, familyFirst: 2, local: 3, professional: 0, calm: 3, deepReads: 1, watch: 1, marketPicks: 1 },
  },
]

/* ------------------------------- Card chrome ------------------------------- */

function PostHeader({ post }: { post: Post }) {
  const { tok } = useAppTheme()
  return (
    <div className="flex items-center gap-3">
      <span className="h-10 w-10 shrink-0 rounded-full bg-cover ring-1 ring-gold/30" style={avatarStyle(post.avatar)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-bold', tok.text)}>{post.author}</p>
        <p className={cn('truncate text-xs', tok.low)}>
          {post.handle} · {post.justNow ? (
            <span className="font-bold text-gold-soft">Just now</span>
          ) : post.time} · {post.circle}
        </p>
      </div>
      {post.recommended && post.reasons && (
        <WhyAmISeeingThis
          reasons={post.reasons}
          onChangeAlgorithm={() => window.dispatchEvent(new CustomEvent('kaluta:change-algo', { detail: post.suggestedMode }))}
          onShowLess={() => window.dispatchEvent(new CustomEvent('kaluta:show-less', { detail: post.id }))}
        />
      )}
    </div>
  )
}

function ActionRow({ items }: { items: string[] }) {
  const { tok } = useAppTheme()
  return (
    <div className={cn('mt-3 flex gap-2 border-t pt-3', tok.divider.replace('divide-', 'border-'))}>
      {items.map((a) => (
        <span key={a} className={cn('rounded-full px-3 py-1 text-xs font-semibold', tok.subtleBg, tok.mid)}>
          {a}
        </span>
      ))}
    </div>
  )
}

/* ------------------------------ Kind renderers ------------------------------ */

function PhotoPost() {
  const { tok } = useAppTheme()
  return (
    <>
      <p className={cn('mt-3 text-sm leading-relaxed', tok.text)}>
        Three generations, one veranda. Grandma finally saw the restored album — she cried, then laughed, then made chai.
      </p>
      <div className="relative mt-3 overflow-hidden rounded-card-md">
        <img src="/family-archive-1.jpg" alt="Three generations of a family on a veranda at golden hour" className="aspect-[16/10] w-full object-cover" loading="lazy" />
        <span className="absolute start-3 top-3"><ProvenanceTag kind="original" /></span>
      </div>
      <ActionRow items={['Like · 214', 'Comment · 38', 'Share', 'Save']} />
    </>
  )
}

function VideoPost() {
  const { tok } = useAppTheme()
  const [showSw, setShowSw] = useState(false)
  return (
    <>
      <p className={cn('mt-3 text-sm leading-relaxed', tok.text)}>
        New track drop — recorded in Kigali, dubbed for the world. Tap translate to hear the Kiswahili dub.
      </p>
      <div className="relative mt-3 overflow-hidden rounded-card-md">
        <img src="/creator-studio.jpg" alt="Creator studio at dusk" className="aspect-video w-full object-cover" loading="lazy" />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-ink/60 backdrop-blur-sm">
            <Play size={22} className="ms-0.5 text-gold-soft" aria-hidden="true" />
          </span>
        </span>
        <span className="absolute start-3 top-3"><ProvenanceTag kind="ai-generated" /></span>
        <span className="absolute bottom-3 end-3 rounded-full bg-ink/70 px-2.5 py-1 font-mono text-[0.68rem] text-text-hi">3:42</span>
      </div>
      {/* side-by-side translation toggle */}
      <div className="mt-3">
        <button
          type="button"
          onClick={() => setShowSw((v) => !v)}
          aria-expanded={showSw}
          className="inline-flex items-center gap-1.5 rounded-full border border-sky/35 bg-sky/10 px-3 py-1.5 text-xs font-semibold text-sky transition-colors hover:bg-sky/20"
        >
          <Sparkles size={12} aria-hidden="true" />
          Translate · AI {showSw ? '(hide)' : '(EN ⇄ SW)'}
        </button>
        <AnimatePresence>
          {showSw && (
            <motion.div
              initial={{ opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 32 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="mt-2 grid grid-cols-2 gap-2"
            >
              <div className={cn('rounded-card-sm p-3 text-xs leading-relaxed', tok.subtleBg, tok.mid)}>
                <p className="mb-1 font-bold text-[0.65rem] uppercase tracking-wider text-sky">Original · EN</p>
                “We built this beat from street sounds — matatu horns, rain on tin roofs.”
              </div>
              <div className="rounded-card-sm border border-sky/25 bg-sky/10 p-3 text-xs leading-relaxed text-sky">
                <p className="mb-1 font-bold text-[0.65rem] uppercase tracking-wider">Dub · SW · AI Generated</p>
                “Tulitengeneza biti hii kutoka sauti za mitaani — honi za matatu, mvua kwenye mabati.”
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <ActionRow items={['18.2k plays', 'Like · 1.4k', 'Comment · 96', 'Rebeat']} />
    </>
  )
}

function ForumPost() {
  const { tok } = useAppTheme()
  return (
    <>
      <div className={cn('mt-3 rounded-card-md border border-indigo/30 bg-indigo/10 p-3.5')}>
        <p className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-sky">
          <MessageSquare size={13} aria-hidden="true" /> Cross-posted from f/urbanfarming
        </p>
        <p className={cn('text-sm font-bold', tok.text)}>Sack gardens on balconies: what actually survived the dry season?</p>
        <p className={cn('mt-1.5 text-xs leading-relaxed', tok.mid)}>
          214 replies · Top answer tested 11 crops across 3 months — sukuma and managu won by a mile.
        </p>
        <span className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-sky/35 bg-sky/10 px-2.5 py-1 text-[0.68rem] font-semibold text-sky">
          <Sparkles size={11} aria-hidden="true" /> AI summary · 4 min read
        </span>
      </div>
      <ActionRow items={['Open thread', 'Like · 89', 'Follow forum']} />
    </>
  )
}

function ProductPost() {
  const { tok } = useAppTheme()
  return (
    <>
      <div className={cn('mt-3 flex gap-3.5 rounded-card-md border border-gold/25 bg-gold/5 p-3.5')}>
        <img src="/marketplace-hero.jpg" alt="Hand-thrown ceramic set" className="h-24 w-24 shrink-0 rounded-card-sm object-cover" loading="lazy" />
        <div className="min-w-0 flex-1">
          <p className={cn('flex items-center gap-1.5 text-sm font-bold', tok.text)}>
            <ShoppingBag size={14} className="text-gold" aria-hidden="true" /> Hand-thrown sufuriya set
          </p>
          <p className={cn('mt-0.5 text-xs', tok.mid)}>Zawadi Ceramics · Kisii · ships in 2 days</p>
          <p className="mt-1.5 flex items-baseline gap-2">
            <span className="mono-data text-lg font-semibold text-gold-soft">$35.00</span>
            <span
              className={cn('cursor-help rounded-full px-2 py-0.5 text-[0.62rem] font-semibold', tok.subtleBg, tok.low)}
              title="Seller keeps 80% ($28) · platform margin 20% ($7) · no hidden fees"
            >
              <Tag size={9} className="me-0.5 inline" aria-hidden="true" /> 80/20 split ⓘ
            </span>
          </p>
        </div>
      </div>
      <ActionRow items={['Buy now', 'Make offer', 'Save', 'Share']} />
    </>
  )
}

function MemorialPost() {
  const { tok } = useAppTheme()
  const [candles, setCandles] = useState(47)
  const [bloom, setBloom] = useState(0)
  const light = () => {
    setCandles((c) => c + 1)
    setBloom((b) => b + 1)
  }
  return (
    <>
      <div className="relative mt-3 overflow-hidden rounded-card-md">
        <img src="/memorial-hero.jpg" alt="Candlelit memorial with white flowers" className="aspect-[16/8] w-full object-cover" loading="lazy" />
        {/* candle bloom glow */}
        <AnimatePresence>
          {bloom > 0 && (
            <motion.span
              key={bloom}
              initial={{ opacity: 0.9, scale: 0.2 }}
              animate={{ opacity: 0, scale: 2.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute inset-0 m-auto h-24 w-24 rounded-full"
              style={{ background: 'radial-gradient(circle, rgba(240,200,120,0.7), transparent 65%)' }}
              aria-hidden="true"
            />
          )}
        </AnimatePresence>
        <span className="absolute bottom-3 start-3 rounded-full bg-ink/70 px-3 py-1 text-xs text-gold-soft backdrop-blur-sm">
          In loving memory of Baba Musa Wekesa · 1948–2023
        </span>
      </div>
      <p className={cn('mt-3 text-sm leading-relaxed', tok.text)}>
        Two years today. The tree he planted is taller than the house now. Light a candle if he ever made you laugh.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <motion.button
          type="button"
          onClick={light}
          whileTap={{ scale: 1.06 }}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-xs font-bold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
        >
          <Flame size={13} aria-hidden="true" /> Light a candle
        </motion.button>
        <span className={cn('mono-data text-sm tabular-nums', tok.mid)} aria-live="polite">
          {candles} candles lit
        </span>
      </div>
    </>
  )
}

function EventPost() {
  const { tok } = useAppTheme()
  const [rsvp, setRsvp] = useState<'going' | 'maybe' | null>(null)
  return (
    <>
      <div className={cn('mt-3 flex items-center gap-3.5 rounded-card-md p-3.5', tok.subtleBg)}>
        <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-card-sm bg-gradient-to-br from-indigo to-indigo-deep text-text-hi">
          <span className="text-[0.6rem] font-bold uppercase">Sat</span>
          <span className="text-lg font-bold leading-none">14</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn('flex items-center gap-1.5 text-sm font-bold', tok.text)}>
            <CalendarCheck size={14} className="text-gold" aria-hidden="true" /> Sunset Poetry — Rooftop Edition
          </p>
          <p className={cn('text-xs', tok.mid)}>KICC rooftop · 6:00 PM · 128 going</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        {(['going', 'maybe'] as const).map((r) => (
          <motion.button
            key={r}
            type="button"
            onClick={() => setRsvp(rsvp === r ? null : r)}
            whileTap={{ scale: 0.96 }}
            aria-pressed={rsvp === r}
            className={cn(
              'rounded-full px-4 py-1.5 text-xs font-bold capitalize transition-colors',
              rsvp === r ? 'bg-gradient-to-br from-gold-soft to-gold text-ink' : cn(tok.subtleBg, tok.mid, tok.hoverBg),
            )}
          >
            {r === 'going' ? 'Going' : 'Maybe'}
          </motion.button>
        ))}
        {rsvp && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="self-center text-xs font-semibold text-success"
          >
            RSVP saved ✓
          </motion.span>
        )}
      </div>
    </>
  )
}

const KIND_BODY: Record<PostKind, () => React.JSX.Element | null> = {
  photo: PhotoPost,
  video: VideoPost,
  forum: ForumPost,
  product: ProductPost,
  memorial: MemorialPost,
  event: EventPost,
  user: () => null,
}

/** A single post card (layout-animated for FLIP reordering). */
export function PostCard({ post }: { post: Post }) {
  const { tok } = useAppTheme()
  const Body = KIND_BODY[post.kind]
  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn('rounded-card-lg p-4', tok.card)}
    >
      <PostHeader post={post} />
      {post.kind === 'user' ? (
        <p className={cn('mt-3 whitespace-pre-wrap text-sm leading-relaxed', tok.text)}>{post.text}</p>
      ) : (
        <Body />
      )}
    </motion.article>
  )
}
