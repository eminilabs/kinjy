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
        active ? 'border-[var(--kl-gold)] bg-[#D9A648]/10' : 'border-[var(--kl-paper-2)] bg-[var(--kl-surface)] hover:border-[var(--kl-gold)]',
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
      <span className={cn('mt-0.5 shrink-0 transition-colors', active ? 'text-[var(--kl-gold-deep)]' : 'text-[var(--kl-gold)]')}>
        <Icon size={17} />
      </span>
      <span>
        <span className={cn('block text-sm font-bold transition-colors', active ? 'text-[var(--kl-gold-deep)]' : 'text-[var(--kl-ink)]')}>
          {callout.title}
        </span>
        <span className="caption mt-0.5 block !text-[var(--kl-mid)]">{callout.body}</span>
      </span>
    </motion.button>
  )
}

const regionRing = (region: Region, active: Region | null) =>
  cn(
    'rounded-2xl transition-all duration-500 ease-cloud-ease',
    active === region && 'bg-[#D9A648]/[0.07] ring-2 ring-[var(--kl-gold)]',
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

      {/* the memorial card — a memorial page as a member would see it: a
          family photograph across the top, the portrait over it, then each
          part of the page on its own row. Follows the page's light/dark. */}
      <motion.article
        initial={reduced ? false : { opacity: 0, y: 48 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.65 }}
        transition={{ duration: 0.9, ease: cloudEase }}
        className="kl-card-shadow relative order-1 w-full max-w-lg overflow-hidden rounded-[20px] border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] lg:order-2"
      >
        {/* header: cover, portrait, name */}
        <header className="relative">
          <div className="relative h-32 overflow-hidden">
            <img
              src="/family-archive-1.jpg"
              alt=""
              aria-hidden="true"
              className="h-full w-full object-cover"
              style={{ objectPosition: '50% 38%' }}
            />
            <div aria-hidden="true" className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 30%, rgba(11,14,29,.55) 100%)' }} />
            <span className="mono-data absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[0.6rem] tracking-[0.16em] text-[#1F7A52] shadow-sm">
              <ShieldCheck size={11} aria-hidden="true" />
              VERIFIED MEMORIAL
            </span>
          </div>
          <div className="flex items-end gap-4 px-6">
            <span className="kl-orb-ring -mt-10 shrink-0 rounded-full p-[3px] shadow-[0_14px_28px_-14px_rgba(0,0,0,.5)]">
              <img
                src="/family-archive-1.jpg"
                alt="Portrait of Mama Agnes Neema Mushi with her family"
                className="h-[76px] w-[76px] rounded-full border-[3px] border-[var(--kl-cutout)] object-cover"
                style={{ objectPosition: '30% 25%' }}
              />
            </span>
            <div className="min-w-0 pb-1 pt-3">
              <p className="kl-serif flex items-center gap-2 text-[24px] font-semibold leading-tight">
                Mama Agnes Neema Mushi
                <VerifiedBadge size={18} />
              </p>
              <p className="kl-mono mt-1 text-[11px] tracking-[0.14em] text-[var(--kl-gold-deep)]">1947 — 2024 · DAR ES SALAAM</p>
            </div>
          </div>
        </header>

        <div className="relative mt-4 divide-y divide-[var(--kl-paper-2)] px-3 pb-3">
          {/* 1 biography & timeline */}
          <section className={cn('px-3 py-4', regionRing('bio', active))}>
            <p className="kl-mono text-[10.5px] tracking-[0.16em] text-[var(--kl-gold-deep)]">BIOGRAPHY & TIMELINE</p>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-[var(--kl-mid)]">
              A teacher of forty years, a mother of five, a grandmother of eleven.
              Her classroom was a second home to half the neighborhood.
            </p>
            <ol className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-[10.5px]">
              {['1947 · Born in Tabora', '1971 · First classroom', '2024 · Rest'].map((t, i) => (
                <li key={t} className="flex items-center gap-2">
                  {i > 0 && <span aria-hidden="true" className="h-px w-4 bg-[var(--kl-dash)]" />}
                  <span className="kl-mono whitespace-nowrap rounded-full bg-[var(--kl-paper)] px-2.5 py-1 text-[var(--kl-low)]">{t}</span>
                </li>
              ))}
            </ol>
          </section>

          {/* 2 media + memorial audio with autoplay toggle */}
          <section className={cn('px-3 py-4', regionRing('media', active))}>
            <div className="flex items-center justify-between gap-3">
              <p className="kl-mono text-[10.5px] tracking-[0.16em] text-[var(--kl-gold-deep)]">PHOTOS · VIDEOS · VOICE</p>
              <button
                type="button"
                role="switch"
                aria-checked={autoplay}
                onClick={() => setAutoplay((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-[var(--kl-paper-2)] px-2.5 py-1 text-[0.68rem] font-semibold text-[var(--kl-mid)] transition-colors hover:border-[var(--kl-gold)]"
              >
                <Volume2 size={12} className={autoplay ? 'text-[var(--kl-gold-deep)]' : 'text-[var(--kl-low)]'} />
                Autoplay {autoplay ? 'ON' : 'OFF'}
                <span className={cn('relative h-3.5 w-6 rounded-full transition-colors', autoplay ? 'bg-[var(--kl-gold)]' : 'bg-[var(--kl-paper-2)]')}>
                  <span
                    className={cn(
                      'absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-all duration-300 ease-cloud-ease',
                      autoplay ? 'left-3' : 'left-0.5',
                    )}
                  />
                </span>
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              {[
                { src: '/family-archive-1.jpg', pos: '50% 40%' },
                { src: '/family-archive-3.jpg', pos: '50% 45%' },
                { src: '/family-archive-2.jpg', pos: '60% 40%' },
              ].map((m) => (
                <img key={m.src} src={m.src} alt="" aria-hidden="true" className="h-14 w-16 rounded-[10px] object-cover" style={{ objectPosition: m.pos }} loading="lazy" />
              ))}
              <span className="flex h-14 flex-1 items-center justify-center gap-1 rounded-[10px] bg-[var(--kl-paper)]">
                {[0.5, 1, 0.7, 0.9, 0.4, 0.75, 0.55].map((h, i) => (
                  <span
                    key={i}
                    className={cn('w-[3px] rounded-full bg-[var(--kl-gold)]', autoplay && 'animate-wave-bar')}
                    style={{ height: `${h * 26}px`, animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </span>
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-1 text-[0.78rem] text-[var(--kl-low)]">
              Her voice, reading a poem · 1:42 · <ProvenanceTag kind="original" className="ml-1 align-middle" />
            </p>
          </section>

          {/* 3 guest book */}
          <section className={cn('px-3 py-4', regionRing('guestbook', active))}>
            <p className="kl-mono text-[10.5px] tracking-[0.16em] text-[var(--kl-gold-deep)]">GUEST BOOK</p>
            <blockquote className="kl-serif mt-2 border-l-2 border-[var(--kl-gold)] pl-3 text-[1.02rem] italic leading-snug">
              “You taught my mother, and then you taught me. Asante, Mwalimu.”
            </blockquote>
            <p className="mt-2 text-[0.78rem] text-[var(--kl-low)]">— Neema K. · approved by an administrator before appearing</p>
          </section>

          {/* 4 tributes */}
          <section className={cn('flex items-center justify-between gap-3 px-3 py-4', regionRing('tributes', active))}>
            <div>
              <p className="kl-mono text-[10.5px] tracking-[0.16em] text-[var(--kl-gold-deep)]">TRIBUTES</p>
              <p className="mt-1.5 text-[0.85rem] text-[var(--kl-mid)]">
                <strong className="kl-serif text-lg font-semibold text-[var(--kl-ink)]">214</strong> candles ·{' '}
                <strong className="kl-serif text-lg font-semibold text-[var(--kl-ink)]">96</strong> flowers
              </p>
              <p className="text-[0.75rem] text-[var(--kl-low)]">free & premium</p>
            </div>
            {/* A candle reads as light only against the dark: the tile stays night in both themes. */}
            <div className="force-dark flex items-end -space-x-3 rounded-2xl bg-[#12162B] px-2">
              <CandleFlowerWidget kind="candle" tier="free" className="scale-[0.55]" />
              <CandleFlowerWidget kind="flower" tier="premium" className="scale-[0.55]" />
            </div>
          </section>

          {/* 5 grave location */}
          <section className={cn('px-3 py-4', regionRing('location', active))}>
            <p className="kl-mono text-[10.5px] tracking-[0.16em] text-[var(--kl-gold-deep)]">GRAVE LOCATION</p>
            <div className="mt-2 flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px] bg-[var(--kl-paper)] text-[var(--kl-gold-deep)]">
                <MapPin size={16} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="kl-mono text-[0.75rem] text-[var(--kl-ink)]">−6.7924° S, 39.2083° E</p>
                <p className="text-[0.78rem] text-[var(--kl-low)]">Kinondoni Cemetery</p>
              </div>
              <span className="mono-data ms-auto shrink-0 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[0.58rem] tracking-widest text-success">
                CAPTURED ON-SITE · VERIFIED
              </span>
            </div>
          </section>

          {/* 6 faith style */}
          <section className={cn('px-3 py-4', regionRing('faith', active))}>
            <p className="kl-mono text-[10.5px] tracking-[0.16em] text-[var(--kl-gold-deep)]">FAITH STYLE</p>
            <p className="mt-2 text-[0.88rem] leading-relaxed text-[var(--kl-mid)]">
              Chosen from her <strong className="text-[var(--kl-ink)]">documented wishes</strong>, confirmed by
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
