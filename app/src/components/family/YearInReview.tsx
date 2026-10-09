import { memo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  Archive,
  CalendarCheck,
  Crown,
  Film,
  Flame,
  Heart,
  MapPin,
  Mic,
  Play,
  Users,
  Vote,
} from 'lucide-react'

const cloudEase = [0.22, 1, 0.36, 1] as [number, number, number, number]
const snapEase = [0.34, 1.56, 0.64, 1] as [number, number, number, number]

/* ── (a) Year-in-review storyboard ─────────────────────────────────────── */

const FRAMES = [
  { icon: Users, stat: '+12', label: 'new members joined the tree', tone: 'bg-[#D9A648]/15' },
  { icon: Archive, stat: '214', label: 'photos, letters & tapes archived', tone: 'bg-[var(--kl-paper)]' },
  { icon: Mic, stat: '3', label: 'elder interviews recorded', tone: 'bg-[#D9A648]/15' },
  { icon: Heart, stat: '1', label: 'wedding — two members of the family, March', tone: 'bg-[var(--kl-paper)]' },
  { icon: Flame, stat: '89', label: 'candles lit for Baba Elias', tone: 'bg-[#D9A648]/15' },
]

/** Storyboard strip of the auto-generated annual documentary. */
function StoryboardStrip() {
  const reduced = useReducedMotion()
  return (
    <div className="relative">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
        {FRAMES.map((f, i) => (
          <motion.div
            key={f.label}
            initial={reduced ? false : { opacity: 0, y: 18, scale: 0.96 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ delay: i * 0.1, duration: 0.5, ease: cloudEase }}
            className={`flex aspect-[4/5] flex-col justify-between rounded-[12px] border border-[var(--kl-paper-2)] ${f.tone} p-3`}
          >
            <f.icon size={16} className="text-[var(--kl-gold-deep)]" />
            <div>
              <p className="kl-serif text-2xl text-[var(--kl-ink)]">{f.stat}</p>
              <p className="mt-0.5 text-[0.68rem] leading-snug text-[var(--kl-mid)]">{f.label}</p>
              <p className="kl-mono mt-1.5 text-[0.56rem] tracking-widest text-[var(--kl-gold-deep)]">
                SCENE {String(i + 1).padStart(2, '0')}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* play control */}
      <motion.button
        type="button"
        aria-label="Play your 2026 family story"
        initial={reduced ? false : { scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ delay: 0.55, duration: 0.5, ease: snapEase }}
        whileTap={{ scale: 1.06 }}
        className="absolute -bottom-12 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full kl-sheen shadow-[0_16px_36px_-10px_rgba(154,107,31,0.55),inset_0_1px_0_rgba(255,255,255,0.4)] transition hover:brightness-110"
      >
        <Play size={20} className="ml-0.5" />
      </motion.button>
    </div>
  )
}

/* ── (b) Reunion planner ───────────────────────────────────────────────── */

const POLL = [
  { date: 'Sat 15 Aug', votes: { elders: 6, parents: 9, young: 11 }, total: 26, winner: true },
  { date: 'Sat 22 Aug', votes: { elders: 4, parents: 7, young: 8 }, total: 19, winner: false },
  { date: 'Sat 29 Aug', votes: { elders: 2, parents: 5, young: 6 }, total: 13, winner: false },
]

/** Stacked generational vote bar: elders / parents / young. */
function VoteBar({ votes, winner }: { votes: { elders: number; parents: number; young: number }; winner: boolean }) {
  const reduced = useReducedMotion()
  const total = votes.elders + votes.parents + votes.young
  const seg = (n: number) => `${(n / total) * 100}%`
  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[var(--kl-paper-2)]" role="img" aria-label={`${total} votes across generations`}>
      {[
        { w: seg(votes.elders), c: '#9A6B1F', d: 0 },
        { w: seg(votes.parents), c: '#D9A648', d: 0.15 },
        { w: seg(votes.young), c: '#F0C878', d: 0.3 },
      ].map((s, i) => (
        <motion.span
          key={i}
          className="block h-full"
          style={{ backgroundColor: s.c }}
          initial={reduced ? { width: s.w } : { width: 0 }}
          whileInView={{ width: s.w }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 0.7, delay: s.d, ease: cloudEase }}
        />
      ))}
      {winner && <span className="sr-only">winning date</span>}
    </div>
  )
}

/** Mini map: family member dots with the golden centroid pin. */
const CentroidMap = memo(function CentroidMap() {
  const reduced = useReducedMotion()
  const dots = [
    { x: 22, y: 30 }, { x: 68, y: 24 }, { x: 82, y: 52 }, { x: 30, y: 66 },
    { x: 55, y: 74 }, { x: 14, y: 50 }, { x: 74, y: 78 }, { x: 44, y: 18 },
  ]
  return (
    <div className="relative h-36 overflow-hidden rounded-[12px] border border-[var(--kl-paper-2)] bg-[var(--kl-stage-b)]">
      {/* faint road arcs */}
      <svg viewBox="0 0 200 90" className="absolute inset-0 h-full w-full text-[var(--kl-ink)]" aria-hidden="true">
        <path d="M0 62 Q 70 40 200 58" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1.4" />
        <path d="M40 0 Q 60 46 30 90" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1.2" />
        <path d="M120 0 Q 110 50 150 90" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="1.2" />
      </svg>
      {dots.map((d, i) => (
        <motion.span
          key={i}
          className="absolute h-2 w-2 rounded-full bg-[#9A6B1F]/55"
          style={{ left: `${d.x}%`, top: `${d.y}%` }}
          initial={reduced ? false : { scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ delay: 0.1 + i * 0.06, duration: 0.4, ease: snapEase }}
        />
      ))}
      {/* centroid pin */}
      <motion.span
        className="absolute left-[48%] top-[44%] flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full kl-sheen shadow-[0_8px_20px_-6px_rgba(154,107,31,0.6)]"
        initial={reduced ? false : { scale: 0, y: -8 }}
        whileInView={{ scale: 1, y: 0 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ delay: 0.65, duration: 0.5, ease: snapEase }}
      >
        <MapPin size={15} />
      </motion.span>
    </div>
  )
})

/**
 * YearInReview — (a) auto-generated "Your 2026 Family Story" documentary card with
 * storyboard strip + premium one-off chip, and (b) the AI reunion planner with
 * generational date polling, centroid venue suggestion and memorial-date awareness.
 */
export default function YearInReview() {
  const reduced = useReducedMotion()
  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:items-start">
      {/* ── (a) Your 2026 Family Story ── */}
      <motion.article
        initial={reduced ? false : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.55, ease: cloudEase }}
        className="flex flex-col rounded-[20px] border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] p-6 pb-10 shadow-[0_24px_48px_-34px_var(--kl-shadow)] lg:p-8 lg:pb-12"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="kl-mono text-xs uppercase tracking-[.14em] text-[var(--kl-gold-deep)]">Year in review</p>
            <h3 className="kl-serif text-[24px] font-semibold leading-tight mt-2 flex items-center gap-2 text-[var(--kl-ink)]">
              <Film size={18} className="text-[var(--kl-gold-deep)]" />
              Your 2026 Family Story
            </h3>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full kl-sheen px-3 py-1.5 text-[0.68rem] font-bold uppercase tracking-wider">
            <Crown size={12} />
            One-off · $4.99
          </span>
        </div>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-[var(--kl-mid)]">
          Each December, the Year-in-Review Agent assembles the year your family lived —
          tree growth, archive uploads, milestones and candles — into a narrated short
          documentary. Generated only from what your family actually uploaded.
        </p>
        <div className="mt-7">
          <StoryboardStrip />
        </div>
        <p className="kl-mono mt-16 text-center text-[0.68rem] tracking-widest text-[var(--kl-gold-deep)]">
          3:42 · NARRATED IN KISWAHILI &amp; ENGLISH · YOURS TO KEEP FOREVER
        </p>
      </motion.article>

      {/* ── (b) Reunion planner ── */}
      <motion.article
        id="reunion-planner"
        initial={reduced ? false : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ delay: 0.12, duration: 0.55, ease: cloudEase }}
        className="flex scroll-mt-24 flex-col rounded-[20px] border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] p-6 shadow-[0_24px_48px_-34px_var(--kl-shadow)] lg:p-8"
      >
        <p className="kl-mono text-xs uppercase tracking-[.14em] text-[var(--kl-gold-deep)]">Reunion Agent</p>
        <h3 className="kl-serif text-[24px] font-semibold leading-tight mt-2 flex items-center gap-2 text-[var(--kl-ink)]">
          <CalendarCheck size={18} className="text-[var(--kl-gold-deep)]" />
          It finds the date everyone can make.
        </h3>
        <p className="mt-3 text-[0.95rem] leading-relaxed text-[var(--kl-mid)]">
          The Reunion Agent polls every generation, suggests a venue near the middle of
          your family map — and quietly steers around remembrance days.
        </p>

        {/* date polling */}
        <div className="mt-6 space-y-3">
          <p className="flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-widest text-[var(--kl-mid)]">
            <Vote size={13} className="text-[var(--kl-gold-deep)]" />
            Date poll · all generations
          </p>
          {POLL.map((p) => (
            <div key={p.date} className="rounded-[12px] border border-[var(--kl-paper-2)] bg-[var(--kl-paper)] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[var(--kl-ink)]">
                  {p.date}
                  {p.winner && (
                    <span className="ml-2 rounded-full bg-[#D9A648]/15 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-[var(--kl-gold-deep)]">
                      Leading
                    </span>
                  )}
                </p>
                <p className="kl-mono text-[0.7rem] text-[var(--kl-mid)]">{p.total} votes</p>
              </div>
              <div className="mt-2">
                <VoteBar votes={p.votes} winner={p.winner} />
              </div>
              <p className="mt-1.5 text-[0.64rem] tracking-wide text-[var(--kl-mid)]">
                <span className="font-semibold text-[var(--kl-gold-deep)]">■</span> elders {p.votes.elders} ·{' '}
                <span className="font-semibold text-[#D9A648]">■</span> parents {p.votes.parents} ·{' '}
                <span className="font-semibold text-[#C79A3A]">■</span> young {p.votes.young}
              </p>
            </div>
          ))}
        </div>

        {/* venue near centroid */}
        <div className="mt-5">
          <CentroidMap />
          <p className="text-[13px] leading-relaxed mt-2 text-[var(--kl-mid)]">
            Suggested venue: <strong className="text-[var(--kl-ink)]">Uhuru Gardens, Nairobi</strong> —{' '}
            2.1 km from your family-map centroid, fair for everyone.
          </p>
        </div>

        {/* memorial-date awareness */}
        <div className="mt-5 flex items-start gap-3 rounded-[12px] border border-[#D9A648]/40 bg-[#D9A648]/8 p-3.5">
          <Flame size={16} className="mt-0.5 shrink-0 text-[var(--kl-gold-deep)]" />
          <p className="text-[0.85rem] leading-relaxed text-[var(--kl-mid)]">
            <strong className="text-[var(--kl-ink)]">Remembrance-aware:</strong> it skipped 12 Aug —
            Baba Elias’s memorial day. Candles first, celebration after.
          </p>
        </div>
      </motion.article>
    </div>
  )
}
