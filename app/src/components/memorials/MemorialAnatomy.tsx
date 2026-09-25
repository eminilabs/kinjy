import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { BookOpen, Flower2, Image, MapPin, Mic2, ShieldCheck, Volume2 } from 'lucide-react'
import { CandleFlowerWidget, ProvenanceTag, VerifiedBadge } from '@/components/ui-kit'
import { cn } from '@/lib/utils'

const cloudEase = [0.22, 1, 0.36, 1] as [number, number, number, number]

type Region = 'bio' | 'media' | 'guestbook' | 'tributes' | 'location' | 'faith'

const CALLOUTS: { id: Region; title: string; body: string; icon: typeof BookOpen }[] = [
  { id: 'bio', title: 'Biography & timeline', body: 'Life story told in dated chapters.', icon: BookOpen },
  { id: 'media', title: 'Photos, videos & voice', body: 'Memorial audio with autoplay ON/OFF always visible — respect first.', icon: Image },
  { id: 'guestbook', title: 'Guest book & condolences', body: 'Every message is moderated before it appears.', icon: ShieldCheck },
  { id: 'tributes', title: 'Digital flowers & candles', body: 'Free and paid tributes; paid support memorial upkeep.', icon: Flower2 },
  { id: 'location', title: 'Grave location', body: 'Latitude/longitude captured on-site. Verified — never fabricated.', icon: MapPin },
  { id: 'faith', title: 'Faith style', body: 'Chosen only from documented wishes or by administrators. Never inferred by AI.', icon: Mic2 },
]

function CalloutChip({
  callout,
  active,
  onHover,
  index,
  side,
}: {
  callout: (typeof CALLOUTS)[number]
  active: boolean
  onHover: (id: Region | null) => void
  index: number
  side: 'left' | 'right'
}) {
  const reduced = useReducedMotion()
  const Icon = callout.icon
  return (
    <motion.button
      type="button"
      onMouseEnter={() => onHover(callout.id)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(callout.id)}
      onBlur={() => onHover(null)}
      initial={reduced ? false : { opacity: 0, scale: 0.85 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.6 }}
      transition={{ delay: index * 0.15, duration: 0.5, ease: cloudEase }}
      className={cn(
        'group relative flex items-start gap-3 rounded-card-md border p-3.5 text-left transition-colors duration-300',
        active ? 'border-gold/60 bg-gold/10' : 'border-white/10 bg-white/[0.04] hover:border-gold/30',
      )}
      aria-label={`${callout.title}: ${callout.body}`}
    >
      {/* connector line drawing toward the card */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute top-1/2 hidden h-px w-8 bg-gradient-to-r from-gold/70 to-transparent lg:block',
          side === 'left' ? '-right-8 rotate-180' : '-left-8',
          'origin-left scale-x-0 transition-transform duration-500 ease-line-ease group-hover:scale-x-100',
        )}
      />
      <span className={cn('mt-0.5 shrink-0 transition-colors', active ? 'text-gold-soft' : 'text-gold/70')}>
        <Icon size={17} />
      </span>
      <span>
        <span className={cn('block text-sm font-bold transition-colors', active ? 'text-gold-soft' : 'text-text-hi')}>
          {callout.title}
        </span>
        <span className="caption mt-0.5 block !text-text-mid">{callout.body}</span>
      </span>
    </motion.button>
  )
}

const regionRing = (region: Region, active: Region | null) =>
  cn(
    'rounded-card-md transition-all duration-500 ease-cloud-ease',
    active === region && 'ring-2 ring-gold/70 shadow-[0_0_24px_rgba(217,166,72,0.25)]',
  )

/**
 * A memorial, complete (memorials.md §2): annotated memorial card mock with
 * 6 callout chips; hovering a chip highlights its region on the card.
 */
export default function MemorialAnatomy() {
  const [active, setActive] = useState<Region | null>(null)
  const [autoplay, setAutoplay] = useState(false)
  const reduced = useReducedMotion()

  const left = CALLOUTS.slice(0, 3)
  const right = CALLOUTS.slice(3)

  return (
    <div className="grid items-center gap-4 lg:grid-cols-[1fr_auto_1fr] lg:gap-8">
      {/* left callouts */}
      <div className="order-2 space-y-3 lg:order-1">
        {left.map((c, i) => (
          <CalloutChip key={c.id} callout={c} active={active === c.id} onHover={setActive} index={i} side="left" />
        ))}
      </div>

      {/* the memorial card */}
      <motion.article
        initial={reduced ? false : { opacity: 0, y: 48 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.65 }}
        transition={{ duration: 0.9, ease: cloudEase }}
        className="relative order-1 w-full max-w-lg overflow-hidden rounded-card-xl border border-gold/25 bg-[#141830] shadow-[0_40px_90px_-30px_rgba(0,0,0,0.8)] lg:order-2"
      >
        {/* dark stone texture at 8% */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: 'url(/cloud-grain.svg)', backgroundSize: '256px 256px' }}
        />

        {/* header */}
        <header className="relative flex items-center gap-4 border-b border-white/8 p-6">
          <img
            src="/family-archive-1.jpg"
            alt="Portrait of Mama Agnes Neema Mushi with her family"
            className="h-16 w-16 rounded-full border border-gold/40 object-cover object-top"
          />
          <div>
            <p className="flex items-center gap-2 font-display text-xl text-text-hi">
              Mama Agnes Neema Mushi
              <VerifiedBadge size={18} />
            </p>
            <p className="mono-data mt-1 text-[0.72rem] tracking-wider text-gold-soft">1947 — 2024 · DAR ES SALAAM</p>
          </div>
          <span className="ml-auto rounded-full border border-success/40 bg-success/10 px-2.5 py-1 mono-data text-[0.62rem] tracking-widest text-success">
            VERIFIED MEMORIAL
          </span>
        </header>

        <div className="relative space-y-4 p-6">
          {/* 1 biography & timeline */}
          <section className={cn('p-3', regionRing('bio', active))}>
            <p className="mono-data text-[0.62rem] tracking-[0.2em] text-gold/80">BIOGRAPHY & TIMELINE</p>
            <p className="mt-2 text-[0.92rem] leading-relaxed text-text-mid">
              A teacher of forty years, a mother of five, a grandmother of eleven.
              Her classroom was a second home to half the neighborhood.
            </p>
            <div className="mt-2 flex gap-4 mono-data text-[0.66rem] text-text-low">
              <span>1947 · Born in Tabora</span>
              <span>1971 · First classroom</span>
              <span>2024 · Rest</span>
            </div>
          </section>

          {/* 2 media + memorial audio with autoplay toggle */}
          <section className={cn('p-3', regionRing('media', active))}>
            <div className="flex items-center justify-between">
              <p className="mono-data text-[0.62rem] tracking-[0.2em] text-gold/80">PHOTOS · VIDEOS · VOICE</p>
              <button
                type="button"
                role="switch"
                aria-checked={autoplay}
                onClick={() => setAutoplay((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-white/15 px-2.5 py-1 text-[0.68rem] font-semibold text-text-mid transition-colors hover:border-gold/40"
              >
                <Volume2 size={12} className={autoplay ? 'text-gold-soft' : 'text-text-low'} />
                Autoplay {autoplay ? 'ON' : 'OFF'}
                <span className={cn('relative h-3.5 w-6 rounded-full transition-colors', autoplay ? 'bg-gold/70' : 'bg-white/15')}>
                  <span
                    className={cn(
                      'absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white transition-all duration-300 ease-cloud-ease',
                      autoplay ? 'left-3' : 'left-0.5',
                    )}
                  />
                </span>
              </button>
            </div>
            <div className="mt-2 flex items-center gap-2">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-12 w-16 rounded-card-sm bg-white/[0.06] ring-1 ring-white/10" />
              ))}
              <span className="flex h-12 flex-1 items-center justify-center gap-1 rounded-card-sm bg-white/[0.06] ring-1 ring-white/10">
                {[0.5, 1, 0.7, 0.9, 0.4].map((h, i) => (
                  <span
                    key={i}
                    className={cn('w-0.5 rounded-full bg-gold-soft/70', autoplay && 'animate-wave-bar')}
                    style={{ height: `${h * 22}px`, animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </span>
            </div>
            <p className="caption mt-1.5 !text-text-low">Her voice, reading a poem · 1:42 · <ProvenanceTag kind="original" className="ml-1 align-middle" /></p>
          </section>

          {/* 3 guest book */}
          <section className={cn('p-3', regionRing('guestbook', active))}>
            <p className="mono-data text-[0.62rem] tracking-[0.2em] text-gold/80">GUEST BOOK</p>
            <blockquote className="mt-2 border-l-2 border-gold/40 pl-3 font-display text-[0.95rem] italic text-text-hi">
              “You taught my mother, and then you taught me. Asante, Mwalimu.”
            </blockquote>
            <p className="caption mt-1.5 !text-text-low">— Neema K. · approved by an administrator before appearing</p>
          </section>

          {/* 4 tributes */}
          <section className={cn('flex items-center justify-between p-3', regionRing('tributes', active))}>
            <div>
              <p className="mono-data text-[0.62rem] tracking-[0.2em] text-gold/80">TRIBUTES</p>
              <p className="caption mt-1 !text-text-mid">214 candles · 96 flowers · free & premium</p>
            </div>
            <div className="flex items-end -space-x-2">
              <CandleFlowerWidget kind="candle" tier="free" className="scale-[0.55]" />
              <CandleFlowerWidget kind="flower" tier="premium" className="scale-[0.55]" />
            </div>
          </section>

          {/* 5 grave location */}
          <section className={cn('p-3', regionRing('location', active))}>
            <p className="mono-data text-[0.62rem] tracking-[0.2em] text-gold/80">GRAVE LOCATION</p>
            <p className="mono-data mt-1.5 flex flex-wrap items-center gap-2 text-[0.72rem] text-text-mid">
              <MapPin size={12} className="text-gold-soft" />
              −6.7924° S, 39.2083° E · Kinondoni Cemetery
              <span className="rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[0.6rem] tracking-widest text-success">
                CAPTURED ON-SITE · VERIFIED
              </span>
            </p>
          </section>

          {/* 6 faith style */}
          <section className={cn('p-3', regionRing('faith', active))}>
            <p className="mono-data text-[0.62rem] tracking-[0.2em] text-gold/80">FAITH STYLE</p>
            <p className="caption mt-1.5 !text-text-mid">
              Chosen from her <strong className="text-text-hi">documented wishes</strong>, confirmed by
              the memorial’s administrators. AI plays no part in this choice.
            </p>
          </section>
        </div>
      </motion.article>

      {/* right callouts */}
      <div className="order-3 space-y-3">
        {right.map((c, i) => (
          <CalloutChip key={c.id} callout={c} active={active === c.id} onHover={setActive} index={i + 3} side="right" />
        ))}
      </div>
    </div>
  )
}
