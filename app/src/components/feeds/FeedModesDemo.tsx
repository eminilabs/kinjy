import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import { Heart, MapPin, MessageCircle, Repeat2, Sparkles, Sprout, Users2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ModeChip, ProvenanceTag, VerifiedBadge } from '@/components/ui-kit'
import { Avatar, CLOUD_EASE, ModuleGlyph } from '@/components/platform/shared'
import { FEED_MODES, POST_BY_ID } from './data'
import type { Algorithm, FeedModeKey, FeedPost } from './data'
import { useToasts } from './Toast'

const GEO_CRUMB: Partial<Record<FeedModeKey, string>> = {
  local: 'Dar es Salaam · 20 km',
  country: 'Tanzania',
  global: 'Global',
}

/** Small gold "Why?" explainer popover for recommended posts. */
function WhyButton({ post, onChangeAlgorithm }: { post: FeedPost; onChangeAlgorithm: () => void }) {
  const [open, setOpen] = useState(false)
  const { push } = useToasts()
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Why am I seeing this post by ${post.author}?`}
        className="inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-gold-soft to-gold px-2.5 py-1 text-[0.68rem] font-bold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
      >
        <Sparkles size={11} /> Why?
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.24, ease: CLOUD_EASE }}
            className="absolute right-0 z-30 mt-2 w-64 rounded-card-md cloud-glass bg-ink-2/95 p-4 shadow-cloud"
            role="dialog"
          >
            <p className="eyebrow text-gold">Why you're seeing this</p>
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {['You engaged with similar posts', `Popular within 20 km of you`, 'Matched by your algorithm'].map((r) => (
                <li key={r} className="rounded-full border border-sky/30 bg-sky/10 px-2 py-1 text-[0.68rem] text-sky">
                  {r}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  push("Got it — we'll tune this down", { actions: [{ label: 'Undo', onClick: () => undefined }] })
                }}
                className="flex-1 rounded-full cloud-glass px-2 py-1.5 text-[0.68rem] font-semibold text-text-hi"
              >
                Show less like this
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onChangeAlgorithm()
                }}
                className="flex-1 rounded-full bg-indigo px-2 py-1.5 text-[0.68rem] font-semibold text-text-hi hover:bg-indigo-deep"
              >
                Change my algorithm
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function PostCard({
  post,
  mode,
  rank,
  onChangeAlgorithm,
}: {
  post: FeedPost
  mode: FeedModeKey
  rank?: number
  onChangeAlgorithm: () => void
}) {
  const reduced = useReducedMotion()
  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.5, ease: CLOUD_EASE }}
      className="cloud-card relative overflow-hidden p-4"
      aria-label={`Post by ${post.author}`}
    >
      {/* Circles watermark */}
      {mode === 'circles' && (
        <span aria-hidden="true" className="pointer-events-none absolute -right-5 -top-5 opacity-[0.07]">
          <ModuleGlyph id="mod-circles" size={110} />
        </span>
      )}

      {/* Trending rank numeral */}
      {mode === 'trending' && rank !== undefined && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-2 font-display text-5xl font-medium text-gold/25"
          initial={reduced ? false : { opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: CLOUD_EASE, delay: rank * 0.08 }}
        >
          #{rank}
        </motion.span>
      )}

      <div className="relative flex items-center gap-2.5">
        <Avatar index={post.avatar} size={38} name={post.author} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-bold text-text-hi">
            {post.author}
            {post.verified && <VerifiedBadge size={15} />}
          </p>
          <p className="flex items-center gap-1.5 text-[0.66rem] text-text-low">
            <motion.span
              className="mono-data"
              animate={mode === 'following' && !reduced ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
              transition={mode === 'following' ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : undefined}
            >
              {post.time}
            </motion.span>
            · {post.location}
            {(mode === 'local' || mode === 'country' || mode === 'global') && post.scope === 'local' && (
              <motion.span animate={reduced ? undefined : { scale: [1, 1.35, 1] }} transition={{ duration: 1.6, repeat: Infinity }} className="inline-flex">
                <MapPin size={10} className="text-gold" />
              </motion.span>
            )}
          </p>
        </div>
        {mode === 'foryou' && post.recommended && <WhyButton post={post} onChangeAlgorithm={onChangeAlgorithm} />}
        {mode === 'new' && post.newCreator && (
          <motion.span
            initial={reduced ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
            className="inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/15 px-2 py-1 text-[0.62rem] font-bold text-success"
          >
            <Sprout size={11} /> New Creator
          </motion.span>
        )}
        {mode === 'friends' && (
          <span className="inline-flex items-center gap-1 rounded-full border border-coral/40 bg-coral/10 px-2 py-1 text-[0.62rem] font-bold text-coral">
            <Users2 size={11} /> Friend
          </span>
        )}
      </div>

      {/* Topic chip (Topics mode) */}
      {mode === 'topics' && post.topic && (
        <motion.span
          initial={reduced ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: CLOUD_EASE }}
          className="mt-2.5 inline-block rounded-full border border-sky/35 bg-sky/10 px-2.5 py-0.5 text-[0.65rem] font-bold text-sky"
        >
          #{post.topic}
        </motion.span>
      )}

      <p className="relative mt-2.5 text-[0.86rem] leading-relaxed text-text-mid">{post.text}</p>
      <div className={cn('relative mt-3 flex h-28 items-end justify-end rounded-card-sm bg-gradient-to-br p-2', post.media)}>
        <ProvenanceTag kind={post.provenance} />
      </div>
      <div className="mt-2.5 flex items-center gap-5 text-text-low">
        <span className="flex items-center gap-1.5 text-xs"><Heart size={13} /> {post.engagement.toLocaleString()}</span>
        <span className="flex items-center gap-1.5 text-xs"><MessageCircle size={13} /> {Math.round(post.engagement / 14)}</span>
        <span className="flex items-center gap-1.5 text-xs"><Repeat2 size={13} /> {Math.round(post.engagement / 31)}</span>
      </div>
    </motion.article>
  )
}

/** Section 2 — The 10 Feed Modes interactive demo. */
export default function FeedModesDemo({
  preview,
  onUndoPreview,
  onGoMarketplace,
}: {
  preview: Algorithm | null
  onUndoPreview: () => void
  onGoMarketplace: (suggestId?: string) => void
}) {
  const reduced = useReducedMotion()
  const sectionRef = useRef<HTMLElement>(null)
  const inView = useInView(sectionRef, { amount: 0.3, once: true })
  const [mode, setMode] = useState<FeedModeKey>('following')
  const interacted = useRef(false)

  // First reorder auto-plays once when the section pins into view
  useEffect(() => {
    if (!inView || interacted.current || reduced) return
    const t = window.setTimeout(() => {
      if (!interacted.current) setMode('foryou')
    }, 1600)
    return () => window.clearTimeout(t)
  }, [inView, reduced])

  const modeDef = FEED_MODES.find((m) => m.key === mode)!
  const order = preview ? preview.order : modeDef.order
  const posts = useMemo(() => order.map((id) => POST_BY_ID.get(id)!).filter(Boolean), [order])
  const colA = posts.filter((_, i) => i % 2 === 0)
  const colB = posts.filter((_, i) => i % 2 === 1)
  const hiddenCount = 6 - posts.length

  const select = (key: FeedModeKey) => {
    interacted.current = true
    setMode(key)
  }

  return (
    <section ref={sectionRef} className="px-6 py-24 md:py-32" aria-label="The 10 feed modes" id="feed-modes-demo">
      <div className="mx-auto max-w-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-gold">Refinement 01 · Mandatory Blueprint Change</p>
          <h2 className="h2 mt-4">Ten feed modes. One tap apart.</h2>
          <p className="body-lg mt-4 text-text-mid">
            The newsfeed conflict is resolved by choice, not compromise — switch modes and watch the
            same six posts re-order themselves live.
          </p>
        </div>

        {/* Sticky mode chip row */}
        <div className="sticky top-[72px] z-30 mt-12 -mx-6 px-6 py-3">
          <div className="mx-auto max-w-container">
            <motion.div
              className="cloud-glass flex gap-2 overflow-x-auto rounded-full bg-ink/70 p-2 shadow-cloud [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              initial={reduced ? false : { opacity: 0, x: -32 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.7 }}
              transition={{ duration: 0.5, ease: CLOUD_EASE }}
              role="tablist"
              aria-label="Feed modes"
            >
              {FEED_MODES.map((m, i) => (
                <motion.span
                  key={m.key}
                  initial={reduced ? false : { opacity: 0, x: -18 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.7 }}
                  transition={{ duration: 0.4, ease: CLOUD_EASE, delay: i * 0.05 }}
                >
                  <ModeChip
                    label={m.label}
                    active={mode === m.key && !preview}
                    onClick={() => select(m.key)}
                  />
                </motion.span>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Caption / breadcrumb / preview banner */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <AnimatePresence mode="wait">
            {preview ? (
              <motion.div
                key={`preview-${preview.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: CLOUD_EASE }}
                className="flex items-center gap-3 rounded-full border border-gold/45 bg-gold/10 px-4 py-2"
              >
                <Sparkles size={14} className="text-gold-soft" />
                <p className="text-sm font-semibold text-gold-soft">
                  Previewing: <span className="font-bold">{preview.name}</span>
                </p>
                <button
                  type="button"
                  onClick={onUndoPreview}
                  className="flex items-center gap-1 rounded-full bg-white/8 px-2.5 py-1 text-xs font-semibold text-text-hi hover:bg-white/15"
                >
                  <X size={11} /> Undo
                </button>
              </motion.div>
            ) : (
              <motion.p
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: CLOUD_EASE }}
                className="caption rounded-full border border-white/12 bg-white/5 px-4 py-2"
              >
                {modeDef.caption}
              </motion.p>
            )}
          </AnimatePresence>
          {GEO_CRUMB[mode] && !preview && (
            <motion.span
              key={`geo-${mode}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: CLOUD_EASE }}
              className="flex items-center gap-1.5 rounded-full border border-gold/35 bg-gold/10 px-3.5 py-2 text-xs font-bold text-gold-soft"
            >
              <MapPin size={12} /> {GEO_CRUMB[mode]}
            </motion.span>
          )}
        </div>

        {/* Two-column FLIP feed */}
        <div className="mx-auto mt-8 grid max-w-4xl gap-5 sm:grid-cols-2">
          {[colA, colB].map((col, ci) => (
            <div key={ci} className="space-y-5">
              <AnimatePresence mode="popLayout">
                {col.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    mode={preview ? 'foryou' : mode}
                    rank={mode === 'trending' && !preview ? order.indexOf(post.id) + 1 : undefined}
                    onChangeAlgorithm={() => onGoMarketplace('friends-first')}
                  />
                ))}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {hiddenCount > 0 && (
          <motion.p layout className="caption mx-auto mt-6 w-fit rounded-full border border-white/12 bg-white/5 px-4 py-2">
            {hiddenCount} {hiddenCount === 1 ? 'post is' : 'posts are'} outside this mode — switch to{' '}
            <button type="button" onClick={() => select('following')} className="font-bold text-gold-soft hover:underline">
              Following
            </button>{' '}
            to see everything.
          </motion.p>
        )}
      </div>
    </section>
  )
}
