import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { BellRing, CalendarDays, Flame, Landmark, ShieldCheck, Smartphone, Users } from 'lucide-react'
import { ArcButton, CandleFlowerWidget } from '@/components/ui-kit'
import LightMotes from '@/components/memorials/LightMotes'
import MemorialAnatomy from '@/components/memorials/MemorialAnatomy'
import VerificationPipeline from '@/components/memorials/VerificationPipeline'
import QRScanDemo from '@/components/memorials/QRScanDemo'
import LightCandleModal from '@/components/memorials/LightCandleModal'
import RemembranceGatherings from '@/components/memorials/RemembranceGatherings'
import WordRise from '@/components/family/WordRise'
import { cn } from '@/lib/utils'

const cloudEase = [0.22, 1, 0.36, 1] as [number, number, number, number]
const lineEase = [0.65, 0, 0.35, 1] as [number, number, number, number]

/** Small calendar glyph with three reminder rings drawing in sequence (10d / 3d / 6h). */
function ReminderCalendar() {
  const reduced = useReducedMotion()
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 96 96" className="h-24 w-24" role="img" aria-label="Calendar with three reminder rings: 10 days, 3 days, 6 hours before an anniversary">
        <rect x="18" y="22" width="60" height="56" rx="10" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
        <line x1="18" y1="38" x2="78" y2="38" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
        <line x1="32" y1="16" x2="32" y2="26" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" />
        <line x1="64" y1="16" x2="64" y2="26" stroke="rgba(255,255,255,0.2)" strokeWidth="2" strokeLinecap="round" />
        {[
          { r: 16, d: 0, label: '10d' },
          { r: 11, d: 0.5, label: '3d' },
          { r: 6, d: 1, label: '6h' },
        ].map((ring) => (
          <motion.circle
            key={ring.label}
            cx="48"
            cy="58"
            r={ring.r}
            fill="none"
            stroke="#D9A648"
            strokeWidth="2"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ duration: reduced ? 0 : 0.8, delay: reduced ? 0 : ring.d, ease: lineEase }}
          />
        ))}
        <circle cx="48" cy="58" r="2.4" fill="#F0C878" />
      </svg>
      <ul className="space-y-1.5 mono-data text-[0.7rem] text-text-mid">
        <li><span className="text-gold-soft">10 days</span> before</li>
        <li><span className="text-gold-soft">3 days</span> before</li>
        <li><span className="text-gold-soft">6 hours</span> before</li>
      </ul>
    </div>
  )
}

/** Three interlocking administrator rings, rotating slowly (24s). */
function StewardshipRings() {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className="relative h-24 w-24"
      animate={reduced ? undefined : { rotate: 360 }}
      transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
      role="img"
      aria-label="Three interlocking rings representing up to three memorial administrators with named succession"
    >
      {[
        { x: 48, y: 30 },
        { x: 32, y: 62 },
        { x: 64, y: 62 },
      ].map((c, i) => (
        <span
          key={i}
          className="absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-gold/60"
          style={{ left: c.x, top: c.y, boxShadow: '0 0 12px rgba(217,166,72,0.2)' }}
        />
      ))}
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-gold-soft">
        <Users size={16} />
      </span>
    </motion.div>
  )
}

/** Six gold petals drifting gently (14s loops) over the AR phone silhouette. */
function DriftingPetals() {
  const reduced = useReducedMotion()
  if (reduced) return null
  return (
    <>
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.span
          key={i}
          aria-hidden="true"
          className="absolute block h-2.5 w-1.5 rounded-full bg-gold-soft/70"
          style={{ left: `${18 + i * 12}%`, top: '20%', filter: 'blur(0.4px)' }}
          animate={{
            y: [0, 90, 150],
            x: [0, i % 2 ? 14 : -12, i % 2 ? -6 : 8],
            rotate: [0, i % 2 ? 140 : -120, i % 2 ? 260 : -240],
            opacity: [0, 0.9, 0],
          }}
          transition={{ duration: 14, repeat: Infinity, delay: i * 2.2, ease: 'easeInOut' }}
        />
      ))}
    </>
  )
}

/**
 * /memorials — Digital Graveyard 2.0 (memorials.md).
 * Blue-hour variant: deep indigo #0E1226 softened with candle-gold,
 * serif-forward, deliberately calm motion.
 */
export default function Memorials() {
  const reduced = useReducedMotion()
  const [modalOpen, setModalOpen] = useState(false)
  const [lit, setLit] = useState<{ id: number; name: string }[]>([])

  const lightCandle = (name: string) => {
    setLit((l) => [...l, { id: Date.now(), name }])
  }

  // The Digital Graveyard is a deliberately dark page: every section paints its
  // own near-black in hardcoded hex, in both themes. force-dark keeps the text
  // on the dark palette so light mode cannot put paper ink on it.
  return (
    <div className="force-dark bg-[#0E1226] text-text-hi">
      {/* ── Section 1 — Page hero (blue hour) ─────────────────────────── */}
      <section className="relative -mt-[72px] flex min-h-[88vh] items-center justify-center overflow-hidden px-6 pt-[72px]">
        {/* background plate at 45% + indigo veil */}
        <motion.img
          src="/memorial-hero.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-45"
          initial={reduced ? { opacity: 0.45 } : { opacity: 0 }}
          animate={{ opacity: 0.45 }}
          transition={{ duration: 1.6, ease: 'easeOut' }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(14,18,38,0.75) 0%, rgba(14,18,38,0.45) 45%, #0E1226 100%), radial-gradient(ellipse at 50% 70%, rgba(217,166,72,0.12), transparent 55%)',
          }}
        />
        <LightMotes />

        <div className="relative z-10 mx-auto max-w-3xl py-20 text-center">
          <motion.p
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 1 }}
            className="eyebrow text-gold"
            style={{ letterSpacing: '0.28em' }}
          >
            Module I — Digital Graveyard
          </motion.p>
          <WordRise
            as="h1"
            text="Memory, kept with dignity."
            className="display-lg mt-5 block text-white"
            rise={28}
            stagger={0.12}
            delay={0.5}
          />
          <motion.p
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.1, duration: 0.9, ease: cloudEase }}
            className="body-lg mx-auto mt-6 max-w-xl text-[#D8D3C8]"
          >
            A permanent, verified place of remembrance — biographies, voices, candles
            and flowers, visited from anywhere on Earth.
          </motion.p>
          {/* candle ignites at 1.2s */}
          <motion.div
            initial={reduced ? false : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.8, ease: cloudEase }}
            className="mt-4 inline-block origin-bottom"
          >
            <CandleFlowerWidget kind="candle" tier="premium" />
          </motion.div>
        </div>
      </section>

      {/* ── Section 2 — A memorial, complete ──────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-container">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="eyebrow text-gold">Anatomy</p>
            <h2 className="h2 mt-3 font-display text-white">A memorial, complete.</h2>
            <p className="body-lg mt-4 text-[#D8D3C8]">
              Every memorial is a whole life, carefully kept. Hover each element to see
              where it lives.
            </p>
          </div>
          <MemorialAnatomy />
        </div>
      </section>

      {/* ── Section 3 — Verification states ───────────────────────────── */}
      <section className="border-y border-white/8 bg-[#0B0F22] px-6 py-24">
        <div className="mx-auto max-w-container">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="eyebrow text-gold">Trust pipeline</p>
            <h2 className="h2 mt-3 font-display text-white">Verified, gently and thoroughly.</h2>
          </div>
          <VerificationPipeline />
        </div>
      </section>

      {/* ── Section 4 — QR memorial codes ─────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-container items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow text-gold">At the resting place</p>
            <h2 className="h3 mt-3 font-display text-2xl text-white">A code on the stone. A world of memory behind it.</h2>
            <p className="body-lg mt-5 text-[#D8D3C8]">
              Engraved QR plaques open the memorial instantly — for visitors at the
              grave, and for generations who never knew them in person.
            </p>
            <p className="caption mt-4 !text-text-mid">
              Grave coordinates are captured on-site and verified. They are never
              estimated, never fabricated.
            </p>
          </div>
          <div className="lg:col-span-7">
            <QRScanDemo />
          </div>
        </div>
      </section>

      {/* ── Section 5 — Remembrance rhythm ────────────────────────────── */}
      <section className="border-y border-white/8 bg-[#0B0F22] px-6 py-24">
        <div className="mx-auto max-w-container">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="eyebrow text-gold">Remembrance rhythm</p>
            <h2 className="h2 mt-3 font-display text-white">Never abandoned. Never vandalized. Never lost.</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: BellRing,
                title: 'Anniversary reminders',
                body: 'Gentle notifications at 10 days, 3 days, and 6 hours before — opt-in, per memorial, never insistent.',
                visual: <ReminderCalendar />,
              },
              {
                icon: Users,
                title: 'Stewardship & succession',
                body: 'Up to 3 administrators per memorial, with named succession — so care outlives any one person.',
                visual: <StewardshipRings />,
              },
              {
                icon: ShieldCheck,
                title: 'Content moderation',
                body: 'Every guest contribution enters pending approval before it appears. The space stays sacred.',
                visual: (
                  <div className="flex h-24 items-center gap-4">
                    <ShieldCheck size={44} className="text-gold/80" />
                    <div className="space-y-2">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-gold-soft/70" />
                          <span className="h-1.5 w-20 rounded-full bg-white/15" style={{ width: `${72 - i * 14}px` }} />
                        </div>
                      ))}
                      <p className="mono-data text-[0.58rem] tracking-widest text-text-low">3 MESSAGES AWAITING APPROVAL</p>
                    </div>
                  </div>
                ),
              },
            ].map((c, i) => (
              <motion.article
                key={c.title}
                initial={reduced ? false : { opacity: 0, y: 32 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ delay: i * 0.14, duration: 0.8, ease: cloudEase }}
                className="rounded-card-lg border border-white/10 bg-white/[0.04] p-7"
              >
                <div className="flex h-28 items-center">{c.visual}</div>
                <h3 className="mt-5 flex items-center gap-2 font-display text-xl text-white">
                  <c.icon size={17} className="text-gold-soft" />
                  {c.title}
                </h3>
                <p className="mt-2 text-[0.95rem] leading-relaxed text-[#D8D3C8]">{c.body}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 5b — Remembrance gatherings (cross-link to Family) ── */}
      <RemembranceGatherings />

      {/* ── Section 6 — Legacy & tomorrow (twilight panel) ────────────── */}
      <section className="twilight-field noise-overlay px-6 py-24">
        <div className="mx-auto grid max-w-container gap-12 lg:grid-cols-2">
          <motion.div
            initial={reduced ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 1, ease: cloudEase }}
          >
            <p className="eyebrow text-gold">Digital legacy contacts</p>
            <h3 className="mt-3 font-display text-2xl text-white">Your wishes, honored after you.</h3>
            <p className="body-lg mt-4 text-text-mid">
              Designate who manages your account and memorial wishes after you’re gone.
              Wishes are stored and honored — including faith-style preferences, exactly
              as you documented them.
            </p>
            <div className="mt-6 flex items-center gap-3 rounded-card-md border border-white/10 bg-white/[0.04] p-4">
              <Landmark size={18} className="shrink-0 text-gold-soft" />
              <p className="caption !text-text-mid">
                Legacy contact: <strong className="text-text-hi">Zawadi M.</strong> · wishes
                document on file · faith style: as documented, never inferred
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={reduced ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 1, delay: 0.15, ease: cloudEase }}
            className="relative overflow-hidden rounded-card-xl border border-white/10 bg-white/[0.03] p-7"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-sky/40 bg-sky/10 px-3 py-1 mono-data text-[0.62rem] tracking-[0.2em] text-sky">
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-sky"
                animate={reduced ? undefined : { opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              />
              ON THE HORIZON
            </span>
            <h3 className="mt-4 flex items-center gap-2 font-display text-2xl text-white">
              <Smartphone size={20} className="text-gold-soft" />
              Future: AR memorials
            </h3>
            <p className="body-lg mt-3 text-text-mid">
              Point a phone at the resting place and see flowers, candles and stories
              gathered in augmented space.
            </p>
            {/* soft-focus phone silhouette with drifting petals */}
            <div className="relative mx-auto mt-6 h-44 w-24">
              <div className="absolute inset-0 rounded-[1.4rem] border border-white/15 bg-[#0E1226]/80 shadow-[0_20px_50px_-16px_rgba(0,0,0,0.8)]" style={{ filter: 'blur(0.6px)' }}>
                <div className="absolute inset-3 rounded-card-sm bg-gradient-to-b from-[#1A1F3B]/60 to-transparent" />
                <span className="absolute left-1/2 top-6 -translate-x-1/2 text-gold-soft/80">
                  <Flame size={18} />
                </span>
                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-gold-soft/60">
                  <CalendarDays size={14} />
                </span>
              </div>
              <DriftingPetals />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Section 7 — CTA (quiet) ───────────────────────────────────── */}
      <section className="px-6 py-28 text-center">
        <motion.h2
          initial={reduced ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 1.2 }}
          className="font-display text-[clamp(1.8rem,4vw,2.8rem)] italic text-gold-grad"
        >
          “To be remembered is to remain.”
        </motion.h2>

        <div className="relative mx-auto mt-10 flex w-fit flex-wrap items-center justify-center gap-4">
          {/* Assistant orb docked beside the memorial action bar (64px offset left) */}
          <div className="absolute -left-16 top-1/2 hidden -translate-y-1/2 items-center gap-2 md:flex" style={{ width: 0 }}>
            <span
              aria-hidden="true"
              className="block h-12 w-12 shrink-0 rounded-full animate-orb-breathe"
              style={{ background: 'var(--grad-orb)', animationDuration: '6s', filter: 'blur(0.5px)' }}
            />
          </div>
          <ArcButton size="lg" className="hover:brightness-105">
            Create a memorial
          </ArcButton>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className={cn(
              'inline-flex items-center gap-2 rounded-full border border-white/20 px-8 py-4 font-semibold text-[#D8D3C8]',
              'transition-colors duration-300 ease-cloud-ease hover:border-gold/50 hover:text-gold-soft',
            )}
          >
            <Flame size={16} />
            Light a candle for someone →
          </button>
        </div>
        <p className="caption mx-auto mt-4 max-w-sm !text-text-mid">
          Ask me about memorials — I’m here to help, gently.
        </p>

        {/* recently lit row */}
        {lit.length > 0 && (
          <div className="mx-auto mt-10 flex max-w-lg flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {lit.slice(-8).map((c) => (
              <motion.span
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: cloudEase }}
                className="inline-flex items-center gap-1.5 text-sm text-[#D8D3C8]"
              >
                <Flame size={12} className="text-gold-soft" /> {c.name}
              </motion.span>
            ))}
          </div>
        )}
      </section>

      <LightCandleModal open={modalOpen} onClose={() => setModalOpen(false)} lit={lit} onLight={lightCandle} />
    </div>
  )
}
