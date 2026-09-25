import { memo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Bookmark, Ear, Languages, MessagesSquare, Radio, Users } from 'lucide-react'
import { CLOUD_EASE, OrbDot, SNAP_EASE } from './shared'

/* ── live translated captions ticker ───────────────────────────────────── */

const CAPTIONS: { lang: string; text: string; tone: 'source' | 'translation' }[] = [
  { lang: 'FR', text: '« …le prix reste le même pour tous les créateurs cette année… »', tone: 'source' },
  { lang: 'EN', text: '“…the price stays the same for every creator this year…”', tone: 'translation' },
  { lang: 'SW', text: '“…bei hubaki vilevile kwa kila muundaji mwaka huu…”', tone: 'translation' },
  { lang: 'FR', text: '« …la caisse des leaders sera versée le premier du mois… »', tone: 'source' },
  { lang: 'EN', text: '“…Kinjy Leaders pays out on the first of the month…”', tone: 'translation' },
  { lang: 'SW', text: '“…mfuko wa viongozi utalipwa tarehe moja ya mwezi…”', tone: 'translation' },
]

/** Seamless marquee of live translated captions (24s loop, pauses on hover). */
const CaptionsTicker = memo(function CaptionsTicker() {
  const items = [...CAPTIONS, ...CAPTIONS]
  return (
    <div className="group relative overflow-hidden rounded-card-md border border-white/10 bg-white/[0.03] py-3" aria-label="Live translated captions">
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-ink-2 to-transparent" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-ink-2 to-transparent" aria-hidden="true" />
      <div className="flex w-max shrink-0 items-center gap-4 pe-4 animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none motion-reduce:flex-wrap motion-reduce:w-full">
        {items.map((c, i) => (
          <span key={i} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5">
            <span
              className={`mono-data rounded-full px-1.5 py-0.5 text-[0.58rem] tracking-widest ${
                c.tone === 'source' ? 'bg-gold/15 text-gold-soft' : 'bg-sky/15 text-sky'
              }`}
            >
              {c.lang}
            </span>
            <span className="text-[0.8rem] text-text-mid">{c.text}</span>
          </span>
        ))}
      </div>
      <p className="caption mt-2 px-4 !text-text-low">
        <Languages size={11} className="mr-1 inline text-sky" />
        Speaker in French — captioned live in English &amp; Kiswahili
      </p>
    </div>
  )
})

/* ── audience question clusters ────────────────────────────────────────── */

const CLUSTERS = [
  { topic: 'pricing & the new tiers', count: 34 },
  { topic: 'the mobile app launch', count: 21 },
  { topic: 'payout timing', count: 12 },
]

function QuestionClusters() {
  const reduced = useReducedMotion()
  return (
    <div className="space-y-3">
      {CLUSTERS.map((c, i) => (
        <motion.div
          key={c.topic}
          initial={reduced ? false : { opacity: 0, y: 30, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ delay: 0.15 + i * 0.14, duration: 0.5, ease: SNAP_EASE }}
          className="cloud-card flex items-center gap-3.5 p-4"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo/25 text-sky">
            <MessagesSquare size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.9rem] font-semibold text-text-hi">
              <span className="mono-data text-gold-soft">{c.count}</span> asked about {c.topic}
            </p>
            <p className="caption !text-text-low">Clustered live from {c.count + 7} chat messages</p>
          </div>
          <span className="rounded-full border border-sky/30 bg-sky/10 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-widest text-sky">
            Cluster
          </span>
        </motion.div>
      ))}
      <p className="caption !text-text-low">
        Duplicates merged, tone preserved — the host sees the room, not the noise.
      </p>
    </div>
  )
}

/* ── host whisper bubble ───────────────────────────────────────────────── */

function WhisperBubble() {
  const reduced = useReducedMotion()
  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ delay: 0.5, duration: 0.5, ease: CLOUD_EASE }}
      className="flex items-start gap-3 rounded-card-md border border-indigo/40 bg-indigo/15 p-4"
    >
      <OrbDot size={26} className="mt-0.5 shrink-0" />
      <div>
        <p className="flex items-center gap-1.5 text-[0.68rem] font-bold uppercase tracking-widest text-sky">
          <Ear size={12} />
          Whisper — host only
        </p>
        <p className="mt-1.5 text-[0.9rem] leading-relaxed text-text-hi">
          34 pricing questions clustered. Answer after the demo — it’s slide 6. The room
          also wants the payout date repeated.
        </p>
      </div>
    </motion.div>
  )
}

/* ── live highlight marking on the stream timeline ─────────────────────── */

const HIGHLIGHTS = [
  { at: '18%', t: '12:40', label: 'Tier announcement' },
  { at: '52%', t: '28:05', label: 'Kinjy Leaders reveal' },
  { at: '81%', t: '41:52', label: 'Pricing Q&A begins' },
]

function StreamTimeline() {
  const reduced = useReducedMotion()
  return (
    <div>
      <div className="relative h-2 rounded-full bg-white/10" role="img" aria-label="Stream timeline with three live-marked highlights">
        {/* elapsed progress */}
        <motion.span
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-gold-soft to-gold"
          initial={reduced ? { width: '86%' } : { width: 0 }}
          whileInView={{ width: '86%' }}
          viewport={{ once: true, amount: 0.8 }}
          transition={{ duration: 1.1, ease: [0.65, 0, 0.35, 1] }}
        />
        {/* playhead */}
        <span className="absolute left-[86%] top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-gold-soft shadow-[0_0_10px_rgba(240,200,120,0.6)]" />
        {/* highlight markers */}
        {HIGHLIGHTS.map((h, i) => (
          <motion.span
            key={h.t}
            className="absolute top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-sky/20 text-sky ring-1 ring-sky/50"
            style={{ left: h.at }}
            initial={reduced ? false : { scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ delay: 0.4 + i * 0.18, duration: 0.45, ease: SNAP_EASE }}
          >
            <Bookmark size={11} />
          </motion.span>
        ))}
      </div>
      <div className="relative mt-2 h-9">
        {HIGHLIGHTS.map((h) => (
          <p key={h.t} className="absolute -translate-x-1/2 text-center" style={{ left: h.at }}>
            <span className="mono-data block text-[0.62rem] text-sky">{h.t}</span>
            <span className="block text-[0.62rem] leading-tight text-text-low">{h.label}</span>
          </p>
        ))}
        <p className="absolute right-0 text-right">
          <span className="mono-data block text-[0.62rem] text-gold-soft">42:18</span>
          <span className="block text-[0.62rem] leading-tight text-text-low">live now</span>
        </p>
      </div>
      <p className="caption !text-text-low">
        Highlights marked live by the agent — one tap later clips the moment.
      </p>
    </div>
  )
}

/* ── section ───────────────────────────────────────────────────────────── */

/**
 * LiveIntelligence — real-time intelligence layer for live rooms: translated
 * captions ticker, audience question clustering, host whisper assistant and
 * live highlight marking on the stream timeline.
 */
export default function LiveIntelligence() {
  const reduced = useReducedMotion()
  return (
    <section className="px-6 py-24 md:py-32" aria-label="Live intelligence layer">
      <div className="mx-auto max-w-container">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow text-sky">Live Intelligence Layer</p>
          <h2 className="h2 mt-4">Live rooms that understand themselves.</h2>
          <p className="body-lg mt-4 text-text-mid">
            While the host speaks, the agent translates, clusters the audience’s
            questions, whispers what matters — and bookmarks the moments worth keeping.
          </p>
        </div>

        {/* mock live room */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6, ease: CLOUD_EASE }}
          className="cloud-card mt-14 p-6 md:p-8"
        >
          {/* room header */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-coral/15 px-3 py-1 text-[0.66rem] font-bold uppercase tracking-widest text-coral">
                <motion.span
                  className="h-1.5 w-1.5 rounded-full bg-coral"
                  animate={reduced ? undefined : { opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
                Live
              </span>
              <p className="flex items-center gap-2 font-semibold text-text-hi">
                <Radio size={16} className="text-gold-soft" />
                Creator Town Hall — Amadou hosting
              </p>
            </div>
            <p className="mono-data flex items-center gap-1.5 text-[0.72rem] text-text-mid">
              <Users size={13} className="text-sky" />
              12,482 watching
            </p>
          </div>

          {/* captions ticker */}
          <div className="mt-6">
            <CaptionsTicker />
          </div>

          {/* clusters + whisper */}
          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-[0.72rem] font-bold uppercase tracking-widest text-text-low">
                The audience, clustered
              </p>
              <QuestionClusters />
            </div>
            <div className="flex flex-col gap-6">
              <div>
                <p className="mb-3 text-[0.72rem] font-bold uppercase tracking-widest text-text-low">
                  The host, assisted
                </p>
                <WhisperBubble />
              </div>
              <div>
                <p className="mb-3 text-[0.72rem] font-bold uppercase tracking-widest text-text-low">
                  The stream, bookmarked
                </p>
                <StreamTimeline />
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
