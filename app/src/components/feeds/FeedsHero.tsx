import { memo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Heart, MessageCircle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, KineticWords } from '@/components/platform/shared'
import { ALGORITHMS, FEED_MODES, POSTS } from './data'
import { Provenance, Seal } from './kit'
import { Eyebrow } from '@/components/landing/PageKit'

/** A phone on the stage, its feed scrolling on a 12s loop that pauses on touch. */
const PhoneFeed = memo(function PhoneFeed() {
  const reduced = useReducedMotion()
  const [paused, setPaused] = useState(false)
  const items = [...POSTS.slice(0, 5), ...POSTS.slice(0, 5)] // seamless duplicate

  return (
    <div
      className="kl-card-shadow relative mx-auto w-full max-w-[330px] overflow-hidden rounded-[38px] border-[6px] border-[var(--kl-surface)] bg-[var(--kl-paper)]"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
    >
      <div className="flex items-center justify-between bg-[var(--kl-surface)] px-5 pb-3 pt-4">
        <span className="kl-serif text-lg font-semibold">For You</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--kl-paper)] px-2.5 py-1 text-[11px] font-semibold text-[var(--kl-gold-deep)]">
          <Sparkles size={11} /> Friends First
        </span>
      </div>

      <div className="relative h-[440px] overflow-hidden">
        <motion.div
          className="absolute inset-x-0 top-0 space-y-2.5 p-2.5"
          animate={reduced || paused ? undefined : { y: ['0%', '-50%'] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
        >
          {items.map((p, i) => (
            <div key={`${p.id}-${i}`} className="rounded-2xl bg-[var(--kl-surface)] p-3">
              <div className="flex items-center gap-2.5">
                <Avatar index={p.avatar} size={30} name={p.author} className="!border-transparent" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1 truncate text-[13px] font-semibold">
                    {p.author} {p.verified && <Seal size={13} />}
                  </p>
                  <p className="kl-mono text-[10px] text-[var(--kl-low)]">
                    {p.time} · {p.location}
                  </p>
                </div>
              </div>
              <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-[var(--kl-mid)]">{p.text}</p>
              <div className={cn('mt-2 flex h-20 items-end rounded-xl bg-gradient-to-br p-1.5', p.media)}>
                <Provenance kind={p.provenance} className="scale-90 origin-bottom-left" />
              </div>
              <div className="mt-2 flex items-center gap-4 text-[11px] text-[var(--kl-low)]">
                <span className="flex items-center gap-1"><Heart size={12} /> {p.engagement.toLocaleString()}</span>
                <span className="flex items-center gap-1"><MessageCircle size={12} /> {Math.round(p.engagement / 14)}</span>
              </div>
            </div>
          ))}
        </motion.div>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[var(--kl-paper)] to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[var(--kl-paper)] to-transparent" />
      </div>
    </div>
  )
})

/** Section 1 — the landing's split: the promise on the left, a live phone feed on the right. */
export default function FeedsHero() {
  const reduced = useReducedMotion()
  const rise = (delay: number) =>
    reduced ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay } }

  const stats = [
    { n: String(FEED_MODES.length), label: 'feed modes' },
    { n: String(ALGORITHMS.length), label: 'algorithms' },
    { n: '0', label: 'black boxes' },
  ]

  return (
    <header className="kl-split kl-pad-x gap-[clamp(40px,6vw,96px)] pb-24 pt-14">
      <div className="min-w-0">
        <motion.div {...rise(0.1)}>
          <Eyebrow>Your feed · Your rules</Eyebrow>
        </motion.div>
        <KineticWords
          as="h1"
          text="Your feed. Your rules. Really."
          className="kl-serif mt-6 block text-[clamp(44px,6.6vw,96px)] font-semibold leading-[0.96] tracking-[-0.02em]"
          delay={0.2}
        />
        <motion.p className="mt-8 max-w-[480px] text-[19px] leading-[1.55] text-[var(--kl-mid)]" {...rise(0.45)}>
          No single black-box algorithm. Ten feed modes, fifteen switchable algorithms, and an
          explanation attached to every recommended post.
        </motion.p>
        <motion.div className="mt-10 flex flex-wrap items-center gap-4" {...rise(0.6)}>
          <a
            href="#feed-modes-demo"
            className="kl-sheen inline-flex items-center gap-[18px] rounded-[20px] py-[7px] pe-[7px] ps-[30px] text-[17px] font-semibold shadow-[0_14px_30px_-12px_rgba(169,118,28,.55)] transition-transform hover:-translate-y-0.5"
          >
            Try the modes
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-xl text-[var(--kl-night)]" aria-hidden="true">↓</span>
          </a>
          <a
            href="#algorithm-marketplace"
            className="rounded-[20px] border border-[var(--kl-paper-2)] px-6 py-4 font-semibold transition-colors hover:border-[var(--kl-gold)] hover:text-[var(--kl-gold-deep)]"
          >
            Browse algorithms
          </a>
        </motion.div>
        <motion.dl className="mt-14 flex max-w-[480px] divide-x divide-[var(--kl-paper-2)] border-t border-[var(--kl-paper-2)] pt-6" {...rise(0.75)}>
          {stats.map((s) => (
            <div key={s.label} className="flex-1 px-4 first:ps-0">
              <dt className="sr-only">{s.label}</dt>
              <dd className="kl-serif text-[44px] font-semibold leading-none">{s.n}</dd>
              <dd className="kl-mono mt-2 text-[11px] uppercase tracking-[.12em] text-[var(--kl-low)]">{s.label}</dd>
            </div>
          ))}
        </motion.dl>
      </div>

      {/* The phone, with two notes floating beside it */}
      <motion.div
        className="relative min-w-0 py-6"
        initial={reduced ? false : { opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.35 }}
      >
        <div aria-hidden="true" className="absolute right-0 top-0 h-[300px] w-[300px] rounded-full bg-[var(--kl-sky)] opacity-30 blur-[90px]" />
        <div aria-hidden="true" className="kl-sheen absolute bottom-0 left-0 h-[240px] w-[240px] rounded-full opacity-25 blur-[90px]" />
        <PhoneFeed />
        <div className="kl-glass kl-float absolute left-0 top-[18%] hidden max-w-[210px] rounded-2xl p-3.5 shadow-[0_20px_40px_-24px_var(--kl-shadow)] sm:block" style={{ ['--kl-dur' as string]: '7s' }}>
          <p className="kl-mono text-[10px] uppercase tracking-[.12em] text-[var(--kl-gold-deep)]">Why this post?</p>
          <p className="mt-1.5 text-[13px] leading-snug">Popular within 20 km of you · you follow Demo K.</p>
        </div>
        <div className="kl-glass kl-floatb absolute bottom-[14%] right-0 hidden items-center gap-2 rounded-full py-2 pe-4 ps-2 text-[13px] font-semibold shadow-[0_20px_40px_-24px_var(--kl-shadow)] sm:flex">
          <span className="kl-sheen grid h-7 w-7 place-items-center rounded-full text-xs">✓</span>
          Chronological is one tap away
        </div>
      </motion.div>
    </header>
  )
}
