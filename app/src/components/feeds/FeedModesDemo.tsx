import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import { Heart, MapPin, MessageCircle, Repeat2, Sparkles, Sprout, Users2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, CLOUD_EASE, ModuleGlyph } from '@/components/platform/shared'
import { FEED_MODES, POST_BY_ID } from './data'
import type { Algorithm, FeedModeKey, FeedPost } from './data'
import { useToasts } from './Toast'
import { Provenance, Seal } from './kit'
import { Eyebrow, Stage } from '@/components/landing/PageKit'

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
        className="kl-sheen inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold"
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
            className="kl-card-shadow absolute right-0 z-30 mt-2 w-64 rounded-2xl border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] p-4"
            role="dialog"
          >
            <Eyebrow className="text-[10px]">Why you're seeing this</Eyebrow>
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {['You engaged with similar posts', 'Popular within 20 km of you', 'Matched by your algorithm'].map((r) => (
                <li key={r} className="rounded-full bg-[var(--kl-paper)] px-2.5 py-1 text-[11px]">
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
                className="flex-1 rounded-full border border-[var(--kl-paper-2)] px-2 py-1.5 text-[11px] font-semibold hover:border-[var(--kl-gold)]"
              >
                Show less like this
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  onChangeAlgorithm()
                }}
                className="flex-1 rounded-full bg-[var(--kl-indigo)] px-2 py-1.5 text-[11px] font-semibold text-white hover:brightness-110"
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

function Badge({ className, children }: { className: string; children: React.ReactNode }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-bold', className)}>{children}</span>
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
      className="relative rounded-2xl bg-[var(--kl-surface)] p-4 shadow-[0_18px_36px_-26px_var(--kl-shadow)]"
      aria-label={`Post by ${post.author}`}
    >
      {/* Circles watermark */}
      {mode === 'circles' && (
        <span aria-hidden="true" className="pointer-events-none absolute right-2 top-2 overflow-hidden text-[var(--kl-gold)] opacity-20">
          <ModuleGlyph id="mod-circles" size={64} className="!text-current" />
        </span>
      )}

      {/* Trending rank numeral */}
      {mode === 'trending' && rank !== undefined && (
        <motion.span
          aria-hidden="true"
          className="kl-serif pointer-events-none absolute right-4 top-2 text-5xl font-semibold text-[var(--kl-gold)] opacity-40"
          initial={reduced ? false : { opacity: 0, y: -14 }}
          animate={{ opacity: 0.4, y: 0 }}
          transition={{ duration: 0.5, ease: CLOUD_EASE, delay: rank * 0.08 }}
        >
          {rank}
        </motion.span>
      )}

      <div className="relative flex items-center gap-2.5">
        <Avatar index={post.avatar} size={38} name={post.author} className="!border-transparent" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            {post.author}
            {post.verified && <Seal />}
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-[var(--kl-low)]">
            <motion.span
              className="kl-mono"
              animate={mode === 'following' && !reduced ? { opacity: [1, 0.35, 1] } : { opacity: 1 }}
              transition={mode === 'following' ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : undefined}
            >
              {post.time}
            </motion.span>
            · {post.location}
            {(mode === 'local' || mode === 'country' || mode === 'global') && post.scope === 'local' && (
              <motion.span animate={reduced ? undefined : { scale: [1, 1.35, 1] }} transition={{ duration: 1.6, repeat: Infinity }} className="inline-flex">
                <MapPin size={10} className="text-[var(--kl-gold-deep)]" />
              </motion.span>
            )}
          </p>
        </div>
        {mode === 'foryou' && post.recommended && <WhyButton post={post} onChangeAlgorithm={onChangeAlgorithm} />}
        {mode === 'new' && post.newCreator && (
          <motion.span initial={reduced ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}>
            <Badge className="bg-[#DDF0E5] text-[#2E7D57]">
              <Sprout size={11} /> New Creator
            </Badge>
          </motion.span>
        )}
        {mode === 'friends' && (
          <Badge className="bg-[#F7E1D8] text-[#C45531]">
            <Users2 size={11} /> Friend
          </Badge>
        )}
      </div>

      {/* Topic chip (Topics mode) */}
      {mode === 'topics' && post.topic && (
        <motion.span
          initial={reduced ? false : { opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: CLOUD_EASE }}
          className="mt-2.5 inline-block rounded-full bg-[#E3ECF7] px-2.5 py-0.5 text-[11px] font-bold text-[#2F6BA8]"
        >
          #{post.topic}
        </motion.span>
      )}

      <p className="relative mt-2.5 text-[14px] leading-relaxed text-[var(--kl-mid)]">{post.text}</p>
      <div className={cn('relative mt-3 flex h-28 items-end justify-end rounded-xl bg-gradient-to-br p-2', post.media)}>
        <Provenance kind={post.provenance} />
      </div>
      <div className="mt-3 flex items-center gap-5 text-xs text-[var(--kl-low)]">
        <span className="flex items-center gap-1.5"><Heart size={13} /> {post.engagement.toLocaleString()}</span>
        <span className="flex items-center gap-1.5"><MessageCircle size={13} /> {Math.round(post.engagement / 14)}</span>
        <span className="flex items-center gap-1.5"><Repeat2 size={13} /> {Math.round(post.engagement / 31)}</span>
      </div>
    </motion.article>
  )
}

/** Section 2 — the ten feed modes: a dial of modes beside the same six posts, re-ordering live. */
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

  // First reorder auto-plays once when the section comes into view
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
    <section
      ref={sectionRef}
      id="feed-modes-demo"
      className="kl-pad-x scroll-mt-24 border-t border-[var(--kl-paper-2)] py-[clamp(72px,9vw,120px)]"
      aria-label="The 10 feed modes"
    >
      <div className="max-w-[720px]">
        <Eyebrow>{FEED_MODES.length} modes</Eyebrow>
        <h2 className="kl-h2 mt-5">Ten feed modes. One tap apart.</h2>
        <p className="kl-lead mt-5 !max-w-[560px]">
          The newsfeed conflict is resolved by choice, not compromise — switch modes and watch the
          same six posts re-order themselves live.
        </p>
      </div>

      <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-12">
        {/* The dial: a scrolling row on phones, a numbered list beside the feed on desktop */}
        <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <div
            role="group"
            aria-label="Feed modes"
            className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
          >
            {FEED_MODES.map((m, i) => {
              const on = mode === m.key && !preview
              return (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => select(m.key)}
                  aria-pressed={on}
                  className={cn(
                    'group relative flex shrink-0 items-baseline gap-3 whitespace-nowrap rounded-full px-4 py-2 text-start text-sm font-semibold transition-colors',
                    'lg:whitespace-normal lg:rounded-none lg:border-b lg:border-[var(--kl-paper-2)] lg:px-0 lg:py-3.5',
                    on
                      ? 'bg-[image:var(--kl-gold-sheen)] text-[var(--kl-night)] lg:bg-none lg:text-[var(--kl-ink)]'
                      : 'bg-[var(--kl-paper)] text-[var(--kl-mid)] hover:text-[var(--kl-ink)] lg:bg-transparent',
                  )}
                >
                  <span className={cn('kl-mono hidden text-[11px] lg:inline', on ? 'text-[var(--kl-gold-deep)]' : 'text-[var(--kl-low)]')}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="lg:flex-1">
                    <span className="lg:text-[20px] lg:font-bold lg:tracking-[-0.02em]">{m.label}</span>
                    {on && (
                      <motion.span
                        initial={reduced ? false : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-1 hidden text-[13px] font-normal leading-snug text-[var(--kl-mid)] lg:block"
                      >
                        {m.caption}
                      </motion.span>
                    )}
                  </span>
                  {on && (
                    <motion.span
                      layoutId="mode-dial-mark"
                      aria-hidden="true"
                      className="kl-sheen absolute -left-4 top-3 hidden h-[calc(100%-24px)] w-1 rounded-full lg:block"
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* The feed, on its stage */}
        <Stage className="min-w-0 p-[clamp(14px,3vw,36px)]">
          <div className="flex min-h-[40px] flex-wrap items-center gap-2.5">
            <AnimatePresence mode="wait">
              {preview ? (
                <motion.div
                  key={`preview-${preview.id}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: CLOUD_EASE }}
                  className="flex items-center gap-3 rounded-full bg-[var(--kl-surface)] py-1.5 pe-1.5 ps-4 shadow-[0_10px_24px_-18px_var(--kl-shadow)]"
                >
                  <Sparkles size={14} className="text-[var(--kl-gold-deep)]" />
                  <p className="text-sm">
                    Previewing <span className="font-bold">{preview.name}</span>
                  </p>
                  <button
                    type="button"
                    onClick={onUndoPreview}
                    className="flex items-center gap-1 rounded-full bg-[var(--kl-paper)] px-3 py-1 text-xs font-semibold hover:bg-[var(--kl-paper-2)]"
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
                  className="rounded-full bg-[var(--kl-surface)] px-4 py-2 text-sm text-[var(--kl-mid)] lg:hidden"
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
                className="flex items-center gap-1.5 rounded-full bg-[var(--kl-surface)] px-3.5 py-2 text-xs font-bold text-[var(--kl-gold-deep)]"
              >
                <MapPin size={12} /> {GEO_CRUMB[mode]}
              </motion.span>
            )}
            <span className="kl-mono ms-auto hidden text-[11px] uppercase tracking-[.12em] text-[var(--kl-low)] sm:inline">
              {posts.length} of 6 posts
            </span>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            {[colA, colB].map((col, ci) => (
              <div key={ci} className="min-w-0 space-y-4">
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
            <motion.p layout className="mx-auto mt-6 w-fit rounded-full bg-[var(--kl-surface)] px-4 py-2 text-center text-sm text-[var(--kl-mid)]">
              {hiddenCount} {hiddenCount === 1 ? 'post is' : 'posts are'} outside this mode — switch to{' '}
              <button type="button" onClick={() => select('following')} className="font-bold text-[var(--kl-gold-deep)] hover:underline">
                Following
              </button>{' '}
              to see everything.
            </motion.p>
          )}
        </Stage>
      </div>
    </section>
  )
}
