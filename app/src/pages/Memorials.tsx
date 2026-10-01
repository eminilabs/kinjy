import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { BellRing, CalendarDays, Flame, Landmark, ShieldCheck, Smartphone, Users } from 'lucide-react'
import { CandleFlowerWidget } from '@/components/ui-kit'
import PublicShell from '@/components/landing/PublicShell'
import LightMotes from '@/components/memorials/LightMotes'
import MemorialAnatomy from '@/components/memorials/MemorialAnatomy'
import VerificationPipeline from '@/components/memorials/VerificationPipeline'
import QRScanDemo from '@/components/memorials/QRScanDemo'
import LightCandleModal from '@/components/memorials/LightCandleModal'
import RemembranceGatherings from '@/components/memorials/RemembranceGatherings'
import WordRise from '@/components/family/WordRise'
import { FEATURES } from '@/lib/features'

const cloudEase = [0.22, 1, 0.36, 1] as [number, number, number, number]
const lineEase = [0.65, 0, 0.35, 1] as [number, number, number, number]

/** Small calendar glyph with three reminder rings drawing in sequence (10d / 3d / 6h). */
function ReminderCalendar() {
  const reduced = useReducedMotion()
  return (
    <div className="flex items-center gap-5">
      <svg viewBox="0 0 96 96" className="h-24 w-24 text-[var(--kl-dash)]" role="img" aria-label="Calendar with three reminder rings: 10 days, 3 days, 6 hours before an anniversary">
        <rect x="18" y="22" width="60" height="56" rx="10" fill="none" stroke="currentColor" strokeWidth="2" />
        <line x1="18" y1="38" x2="78" y2="38" stroke="currentColor" strokeWidth="2" />
        <line x1="32" y1="16" x2="32" y2="26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="64" y1="16" x2="64" y2="26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
        <circle cx="48" cy="58" r="2.4" fill="#D9A648" />
      </svg>
      <ul className="mono-data space-y-1.5 text-[0.7rem] text-[var(--kl-mid)]">
        <li><span className="text-[var(--kl-gold-deep)]">10 days</span> before</li>
        <li><span className="text-[var(--kl-gold-deep)]">3 days</span> before</li>
        <li><span className="text-[var(--kl-gold-deep)]">6 hours</span> before</li>
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
          className="absolute h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[var(--kl-gold)]"
          style={{ left: c.x, top: c.y }}
        />
      ))}
      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[var(--kl-gold-deep)]">
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
          className="absolute block h-2.5 w-1.5 rounded-full bg-[#F0C878]/70"
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

/** A section heading in the landing design: small gold label, big serif line, optional lead. */
function Heading({ eyebrow, title, lead, center = false }: { eyebrow: string; title: string; lead?: string; center?: boolean }) {
  return (
    <div className={center ? 'mx-auto mb-14 max-w-2xl text-center' : 'mb-10'}>
      <p className="kl-mono text-xs tracking-[.14em] text-[var(--kl-gold-deep)]">{eyebrow.toUpperCase()}</p>
      <h2 className="kl-h2 mt-4">{title}</h2>
      {lead && <p className={`kl-lead mt-5 ${center ? 'mx-auto' : ''}`}>{lead}</p>}
    </div>
  )
}

/**
 * /memorials — Digital Graveyard 2.0 (memorials.md), on the "Kinjy Landing"
 * design: paper or night following the visitor's theme, calm motion, the
 * memorial card and the phone kept night as the objects they are.
 */
export default function Memorials() {
  const reduced = useReducedMotion()
  const [modalOpen, setModalOpen] = useState(false)
  const [lit, setLit] = useState<{ id: number; name: string }[]>([])

  const lightCandle = (name: string) => {
    setLit((l) => [...l, { id: Date.now(), name }])
  }

  return (
    <PublicShell>
      <div className="mx-auto max-w-[1320px] px-4">
        {/* ── Section 1 — Page hero ─────────────────────────────────────── */}
        <header className="kl-split kl-pad-x gap-[clamp(40px,6vw,96px)] pb-24 pt-14">
          <div>
            <motion.p
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="kl-mono text-xs tracking-[.14em] text-[var(--kl-gold-deep)]"
            >
              MODULE I — DIGITAL GRAVEYARD
            </motion.p>
            <WordRise
              as="h1"
              text="Memory, kept with dignity."
              className="kl-serif mt-6 block text-[clamp(52px,7vw,96px)] font-semibold leading-[0.98] tracking-[-0.02em]"
              rise={28}
              stagger={0.12}
              delay={0.3}
            />
            <motion.p
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 0.9, ease: cloudEase }}
              className="mt-8 max-w-[460px] text-[19px] leading-[1.55] text-[var(--kl-mid)]"
            >
              A permanent, verified place of remembrance — biographies, voices, candles
              and flowers, visited from anywhere on Earth.
            </motion.p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                type="button"
                className="kl-sheen inline-flex items-center gap-[18px] rounded-[20px] py-[7px] pe-[7px] ps-[30px] text-[17px] font-semibold shadow-[0_14px_30px_-12px_rgba(169,118,28,.55)] transition-transform hover:-translate-y-0.5"
              >
                Create a memorial
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-xl text-[var(--kl-night)]" aria-hidden="true">
                  →
                </span>
              </button>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-2 rounded-[20px] border border-[var(--kl-paper-2)] px-6 py-4 font-semibold transition-colors hover:border-[var(--kl-gold)] hover:text-[var(--kl-gold-deep)]"
              >
                <Flame size={16} />
                Light a candle for someone
              </button>
            </div>
          </div>

          {/* The photograph as a card, the candle resting on it in glass. */}
          <div className="relative w-full max-w-[600px] justify-self-end">
            <div className="kl-card-shadow relative overflow-hidden rounded-[20px] bg-[var(--kl-night)]" style={{ aspectRatio: '1 / 1.05' }}>
              <motion.img
                src="/memorial-hero.jpg"
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover"
                initial={reduced ? false : { opacity: 0 }}
                animate={{ opacity: 0.85 }}
                transition={{ duration: 1.4, ease: 'easeOut' }}
              />
              <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(11,14,29,.75) 100%)' }} />
              <LightMotes />
              <div className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 text-[var(--kl-night-text)]">
                <div>
                  <p className="kl-mono text-[11px] tracking-[.12em] text-[#F0C878]">MEMORIAL</p>
                  <p className="kl-serif mt-1 text-2xl font-semibold">Mama Agnes Neema Mushi</p>
                  <p className="text-sm text-[var(--kl-night-mid)]">1947 – 2024 · 214 candles</p>
                </div>
              </div>
            </div>
            <motion.div
              initial={reduced ? false : { scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1, duration: 0.8, ease: cloudEase }}
              className="kl-glass kl-card-shadow absolute -left-6 top-10 rounded-2xl"
            >
              <CandleFlowerWidget kind="candle" tier="premium" />
            </motion.div>
          </div>
        </header>

        {/* ── Section 2 — A memorial, complete ──────────────────────────── */}
        <section className="kl-pad-x border-t border-[var(--kl-paper-2)] py-[120px]">
          <Heading
            center
            eyebrow="Anatomy"
            title="A memorial, complete."
            lead="Every memorial is a whole life, carefully kept. Hover each element to see where it lives."
          />
          <MemorialAnatomy />
        </section>
      </div>

      {/* ── Section 3 — Verification states ───────────────────────────── */}
      <section className="mx-[clamp(12px,2vw,24px)] rounded-[20px] bg-[var(--kl-paper)] px-[clamp(20px,5vw,64px)] py-[120px]">
        <div className="mx-auto max-w-[1180px]">
          <Heading center eyebrow="Trust pipeline" title="Verified, gently and thoroughly." />
          <VerificationPipeline />
        </div>
      </section>

      <div className="mx-auto max-w-[1320px] px-4">
        {/* ── Section 4 — QR memorial codes ─────────────────────────────── */}
        <section className="kl-split kl-pad-x gap-16 py-[120px]">
          <div>
            <Heading eyebrow="At the resting place" title="A code on the stone. A world of memory behind it." />
            <p className="kl-lead -mt-4">
              Engraved QR plaques open the memorial instantly — for visitors at the
              grave, and for generations who never knew them in person.
            </p>
            <p className="mt-5 max-w-[460px] text-sm leading-relaxed text-[var(--kl-low)]">
              Grave coordinates are captured on-site and verified. They are never
              estimated, never fabricated.
            </p>
          </div>
          <QRScanDemo />
        </section>

        {/* ── Section 5 — Remembrance rhythm ────────────────────────────── */}
        <section className="kl-pad-x border-t border-[var(--kl-paper-2)] py-[120px]">
          <Heading center eyebrow="Remembrance rhythm" title="Never abandoned. Never vandalized. Never lost." />
          <div className="grid gap-4 md:grid-cols-3">
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
                    <ShieldCheck size={44} className="text-[var(--kl-gold)]" />
                    <div className="space-y-2">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-[var(--kl-gold)]" />
                          <span className="h-1.5 rounded-full bg-[var(--kl-paper-2)]" style={{ width: `${72 - i * 14}px` }} />
                        </div>
                      ))}
                      <p className="mono-data text-[0.58rem] tracking-widest text-[var(--kl-low)]">3 MESSAGES AWAITING APPROVAL</p>
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
                className="rounded-2xl border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] p-8"
              >
                <div className="flex h-28 items-center">{c.visual}</div>
                <h3 className="kl-serif mt-6 flex items-center gap-2 text-[22px] font-semibold">
                  <c.icon size={17} className="text-[var(--kl-gold-deep)]" />
                  {c.title}
                </h3>
                <p className="mt-2 text-base leading-[1.55] text-[var(--kl-mid)]">{c.body}</p>
              </motion.article>
            ))}
          </div>
        </section>

        {/* ── Section 5b — Remembrance gatherings (cross-link to Family) ── */}
        {/* The Reunion Agent gathers the family around a remembrance date: it goes
            with the family tree (lib/features.ts). */}
        {FEATURES.familyTree && <RemembranceGatherings />}
      </div>

      {/* ── Section 6 — Legacy & tomorrow: a night panel, as the landing's assistant ── */}
      <section
        className="force-dark kl-night-section mx-[clamp(12px,2vw,24px)] mt-10 overflow-hidden rounded-[20px] px-[clamp(20px,5vw,64px)] py-[120px] text-[var(--kl-night-text)]"
        style={{ background: 'radial-gradient(120% 120% at 20% 0%, #242142 0%, #0B0E1D 65%)' }}
      >
        <div className="mx-auto grid max-w-[1180px] gap-12 lg:grid-cols-2">
          <motion.div
            initial={reduced ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 1, ease: cloudEase }}
          >
            <p className="kl-mono text-xs tracking-[.14em] text-[#F0C878]">DIGITAL LEGACY CONTACTS</p>
            <h3 className="kl-h2 mt-4 text-[var(--kl-night-text)]" style={{ fontSize: 'clamp(34px, 4vw, 52px)' }}>
              Your wishes, honored after you.
            </h3>
            <p className="mt-5 max-w-[460px] text-lg leading-[1.6] text-[var(--kl-night-mid)]">
              Designate who manages your account and memorial wishes after you’re gone.
              Wishes are stored and honored — including faith-style preferences, exactly
              as you documented them.
            </p>
            <div className="kl-night-glass mt-7 flex items-center gap-3 rounded-2xl p-4">
              <Landmark size={18} className="shrink-0 text-[#F0C878]" />
              <p className="text-sm text-[var(--kl-night-mid)]">
                Legacy contact: <strong className="text-[var(--kl-night-text)]">Zawadi M.</strong> · wishes
                document on file · faith style: as documented, never inferred
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={reduced ? false : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 1, delay: 0.15, ease: cloudEase }}
            className="kl-night-glass relative overflow-hidden rounded-[20px] p-8"
          >
            <span className="mono-data inline-flex items-center gap-2 rounded-full border border-[#8FB8E8]/40 bg-[#8FB8E8]/10 px-3 py-1 text-[0.62rem] tracking-[0.2em] text-[#8FB8E8]">
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-[#8FB8E8]"
                animate={reduced ? undefined : { opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 2.4, repeat: Infinity }}
              />
              ON THE HORIZON
            </span>
            <h3 className="kl-serif mt-5 flex items-center gap-2 text-[28px] font-semibold">
              <Smartphone size={20} className="text-[#F0C878]" />
              Future: AR memorials
            </h3>
            <p className="mt-3 text-lg leading-[1.6] text-[var(--kl-night-mid)]">
              Point a phone at the resting place and see flowers, candles and stories
              gathered in augmented space.
            </p>
            {/* soft-focus phone silhouette with drifting petals */}
            <div className="relative mx-auto mt-6 h-44 w-24">
              <div className="absolute inset-0 rounded-[1.4rem] border border-white/15 bg-[#0B0E1D]/80 shadow-[0_20px_50px_-16px_rgba(0,0,0,0.8)]" style={{ filter: 'blur(0.6px)' }}>
                <div className="absolute inset-3 rounded-card-sm bg-gradient-to-b from-[#1A1F3B]/60 to-transparent" />
                <span className="absolute left-1/2 top-6 -translate-x-1/2 text-[#F0C878]/80">
                  <Flame size={18} />
                </span>
                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[#F0C878]/60">
                  <CalendarDays size={14} />
                </span>
              </div>
              <DriftingPetals />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Section 7 — CTA (quiet) ───────────────────────────────────── */}
      <section className="px-6 py-[120px] text-center">
        <motion.h2
          initial={reduced ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 1.2 }}
          className="kl-serif mx-auto max-w-[900px] font-semibold italic text-[var(--kl-gold-deep)]"
          style={{ fontSize: 'clamp(36px, 5vw, 64px)', lineHeight: 1.1 }}
        >
          “To be remembered is to remain.”
        </motion.h2>

        <div className="mx-auto mt-10 flex w-fit flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            className="kl-sheen rounded-[20px] px-8 py-4 text-[17px] font-semibold shadow-[0_14px_30px_-12px_rgba(169,118,28,.55)] transition-transform hover:-translate-y-0.5"
          >
            Create a memorial
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-[20px] border border-[var(--kl-paper-2)] px-8 py-4 font-semibold transition-colors hover:border-[var(--kl-gold)] hover:text-[var(--kl-gold-deep)]"
          >
            <Flame size={16} />
            Light a candle for someone →
          </button>
        </div>
        <p className="mx-auto mt-5 max-w-sm text-sm text-[var(--kl-low)]">
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
                className="inline-flex items-center gap-1.5 text-sm text-[var(--kl-mid)]"
              >
                <Flame size={12} className="text-[var(--kl-gold)]" /> {c.name}
              </motion.span>
            ))}
          </div>
        )}
      </section>

      <LightCandleModal open={modalOpen} onClose={() => setModalOpen(false)} lit={lit} onLight={lightCandle} />
    </PublicShell>
  )
}
