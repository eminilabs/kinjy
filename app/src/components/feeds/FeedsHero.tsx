import { memo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Heart, MessageCircle, Repeat2, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ModeChip, ProvenanceTag, WhyAmISeeingThis } from '@/components/ui-kit'
import { Avatar, KineticWords } from '@/components/platform/shared'
import { POSTS } from './data'

/** Auto-scrolling mini-feed device (12s loop of 5 posts, pauses on interaction). */
const MiniFeed = memo(function MiniFeed() {
  const reduced = useReducedMotion()
  const [paused, setPaused] = useState(false)
  const items = [...POSTS.slice(0, 5), ...POSTS.slice(0, 5)] // seamless duplicate

  return (
    <div
      className="cloud-card relative mx-auto w-full max-w-md overflow-hidden rounded-card-xl"
      onPointerEnter={() => setPaused(true)}
      onPointerDown={() => setPaused(true)}
      onFocus={() => setPaused(true)}
    >
      {/* Device chrome */}
      <div className="flex items-center justify-between border-b border-white/10 bg-ink-2/80 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        </div>
        <span className="mono-data text-[0.68rem] text-text-low">kaluta.app/feed · For You</span>
        <Sparkles size={13} className="text-gold" />
      </div>

      <div className="relative h-[430px] overflow-hidden">
        <motion.div
          className="absolute inset-x-0 top-0 space-y-3 p-3"
          animate={reduced || paused ? undefined : { y: ['0%', '-50%'] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        >
          {items.map((p, i) => (
            <div key={`${p.id}-${i}`} className="rounded-card-md border border-white/10 bg-white/[0.045] p-3">
              <div className="flex items-center gap-2.5">
                <Avatar index={p.avatar} size={30} name={p.author} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-text-hi">{p.author}</p>
                  <p className="mono-data text-[0.62rem] text-text-low">
                    {p.time} · {p.location}
                  </p>
                </div>
                <ProvenanceTag kind={p.provenance} className="scale-[0.85]" />
              </div>
              <p className="mt-2 line-clamp-2 text-[0.8rem] leading-relaxed text-text-mid">{p.text}</p>
              <div className={cn('mt-2.5 h-20 rounded-card-sm bg-gradient-to-br', p.media)} />
              <div className="mt-2 flex items-center gap-4 text-text-low">
                <span className="flex items-center gap-1 text-[0.68rem]"><Heart size={12} /> {p.engagement.toLocaleString()}</span>
                <span className="flex items-center gap-1 text-[0.68rem]"><MessageCircle size={12} /> {Math.round(p.engagement / 14)}</span>
                <span className="flex items-center gap-1 text-[0.68rem]"><Repeat2 size={12} /> {Math.round(p.engagement / 31)}</span>
              </div>
            </div>
          ))}
        </motion.div>
        {/* Edge fades */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-ink-2 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-ink-2 to-transparent" />
      </div>

      <div className="border-t border-white/10 bg-ink-2/80 px-4 py-2.5">
        <WhyAmISeeingThis
          reasons={['You engaged with similar posts', 'Popular within 20 km of you']}
          onShowLess={() => undefined}
          onChangeAlgorithm={() => undefined}
        />
      </div>
    </div>
  )
})

/** Section 1 — Feeds hero: copy left, live mini-feed device right. */
export default function FeedsHero() {
  return (
    <section className="twilight-field noise-overlay relative overflow-hidden px-6 pb-20 pt-24 md:pb-28 md:pt-32">
      <div className="mx-auto grid max-w-container items-center gap-14 lg:grid-cols-2">
        <div>
          <motion.p
            className="eyebrow text-gold"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Refinement 01 — The Feed, Solved
          </motion.p>
          <KineticWords as="h1" text="Your feed. Your rules. Really." className="display-lg mt-5" delay={0.2} />
          <motion.p
            className="body-lg mt-6 max-w-lg text-text-mid"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            No single black-box algorithm. Ten feed modes, fifteen switchable algorithms, and an
            explanation attached to every recommended post.
          </motion.p>
          <motion.div
            className="mt-8 flex flex-wrap gap-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.75 }}
          >
            <ModeChip label="10 feed modes" active />
            <ModeChip label="15 algorithms" />
            <ModeChip label="0 black boxes" />
          </motion.div>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35 }}
        >
          <MiniFeed />
        </motion.div>
      </div>
    </section>
  )
}
