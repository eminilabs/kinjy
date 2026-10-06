import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { BookOpen, Check, Clock, Flower2, Image, MapPin, Mic2, Play, ShieldCheck, Volume2 } from 'lucide-react'
import { CandleFlowerWidget, ProvenanceTag, VerifiedBadge } from '@/components/ui-kit'
import { cn } from '@/lib/utils'

const cloudEase = [0.22, 1, 0.36, 1] as [number, number, number, number]
const STEP_MS = 5200

type Part = { title: string; body: string; icon: typeof BookOpen }

const PARTS: Part[] = [
  { title: 'Biography & timeline', body: 'Life story told in dated chapters.', icon: BookOpen },
  { title: 'Portrait, cover & voice', body: 'A portrait, a cover image and a voice recording. Autoplay is the family’s choice — ON or OFF.', icon: Image },
  { title: 'Guest book & condolences', body: 'By default, messages and photos wait for the family’s approval before they appear.', icon: ShieldCheck },
  { title: 'Digital flowers & candles', body: 'Anyone can light a candle or leave a flower, free.', icon: Flower2 },
  { title: 'Grave location', body: 'Latitude/longitude captured at the grave are marked confirmed; typed ones are marked not yet confirmed. Never fabricated.', icon: MapPin },
  { title: 'Faith style', body: 'Chosen only from documented wishes or by administrators. Never inferred by AI.', icon: Mic2 },
]

const label = 'kl-mono text-[10.5px] tracking-[0.16em] text-[var(--kl-gold-deep)]'

/* ── The six views of one memorial ─────────────────────────────────────── */

function Biography() {
  const events = [
    { year: '1947', text: 'Born in Tabora' },
    { year: '1971', text: 'First classroom' },
    { year: '2024', text: 'Rest' },
  ]
  return (
    <div>
      <p className={label}>BIOGRAPHY & TIMELINE</p>
      <p className="kl-serif mt-3 text-[1.35rem] leading-snug">
        A teacher of forty years, a mother of five, a grandmother of eleven.
        Her classroom was a second home to half the neighborhood.
      </p>
      <ol className="relative mt-6 space-y-4 ps-6">
        <span aria-hidden="true" className="absolute bottom-2 start-[5px] top-2 w-px bg-[var(--kl-dash)]" />
        {events.map((e) => (
          <li key={e.year} className="relative flex items-baseline gap-3">
            <span aria-hidden="true" className="absolute -start-6 top-1.5 h-[11px] w-[11px] rounded-full border-2 border-[var(--kl-gold)] bg-[var(--kl-surface)]" />
            <span className="kl-mono text-sm text-[var(--kl-gold-deep)]">{e.year}</span>
            <span className="text-[15px] text-[var(--kl-mid)]">{e.text}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Media({ autoplay, onToggle }: { autoplay: boolean; onToggle: () => void }) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <p className={label}>PHOTOS · VIDEOS · VOICE</p>
        <button
          type="button"
          role="switch"
          aria-checked={autoplay}
          onClick={onToggle}
          className="flex items-center gap-2 rounded-full border border-[var(--kl-paper-2)] px-2.5 py-1 text-[0.7rem] font-semibold text-[var(--kl-mid)] transition-colors hover:border-[var(--kl-gold)]"
        >
          <Volume2 size={12} className={autoplay ? 'text-[var(--kl-gold-deep)]' : 'text-[var(--kl-low)]'} />
          Autoplay {autoplay ? 'ON' : 'OFF'}
          <span className={cn('relative h-3.5 w-6 rounded-full transition-colors', autoplay ? 'bg-[var(--kl-gold)]' : 'bg-[var(--kl-paper-2)]')}>
            <span className={cn('absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white shadow-sm transition-all duration-300', autoplay ? 'left-3' : 'left-0.5')} />
          </span>
        </button>
      </div>
      <div className="mt-4 grid grid-cols-3 grid-rows-2 gap-2" style={{ height: 176 }}>
        <img src="/family-archive-1.jpg" alt="" className="col-span-2 row-span-2 h-full w-full rounded-2xl object-cover" style={{ objectPosition: '45% 40%' }} />
        <img src="/family-archive-3.jpg" alt="" className="h-full w-full rounded-2xl object-cover" style={{ objectPosition: '50% 45%' }} />
        <img src="/family-archive-2.jpg" alt="" className="h-full w-full rounded-2xl object-cover" style={{ objectPosition: '62% 40%' }} />
      </div>
      <div className="mt-3 flex items-center gap-3 rounded-2xl bg-[var(--kl-paper)] p-3">
        <span className="kl-sheen grid h-10 w-10 shrink-0 place-items-center rounded-full" aria-hidden="true">
          <Play size={15} className="ms-0.5" />
        </span>
        <span className="flex h-8 flex-1 items-center gap-[3px]" aria-hidden="true">
          {[0.35, 0.6, 0.9, 0.5, 0.75, 1, 0.55, 0.8, 0.4, 0.65, 0.95, 0.5, 0.7, 0.3, 0.6, 0.85, 0.45, 0.7].map((h, i) => (
            <span
              key={i}
              className={cn('w-[3px] rounded-full', i < 7 ? 'bg-[var(--kl-gold)]' : 'bg-[var(--kl-dash)]', autoplay && 'animate-wave-bar')}
              style={{ height: `${h * 100}%`, animationDelay: `${i * 0.08}s` }}
            />
          ))}
        </span>
        <span className="kl-mono shrink-0 text-xs text-[var(--kl-low)]">1:42</span>
      </div>
      <p className="mt-2 flex flex-wrap items-center gap-1 text-[0.8rem] text-[var(--kl-low)]">
        Her voice, reading a poem · <ProvenanceTag kind="original" className="ml-1 align-middle" />
      </p>
    </div>
  )
}

function GuestBook() {
  return (
    <div>
      <p className={label}>GUEST BOOK</p>
      <figure className="mt-4 rounded-2xl border border-[var(--kl-paper-2)] p-5">
        <blockquote className="kl-serif text-[1.3rem] italic leading-snug">
          “You taught my mother, and then you taught me. Asante, Mwalimu.”
        </blockquote>
        <figcaption className="mt-3 flex flex-wrap items-center gap-2 text-[0.82rem] text-[var(--kl-low)]">
          — Neema K.
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[0.7rem] font-semibold text-success">
            <Check size={11} aria-hidden="true" /> approved by an administrator before appearing
          </span>
        </figcaption>
      </figure>
      <div className="mt-3 flex items-center gap-3 rounded-2xl border border-dashed border-[var(--kl-dash)] p-4" aria-hidden="true">
        <span className="h-9 w-9 shrink-0 rounded-full bg-[var(--kl-paper)]" />
        <span className="flex-1 space-y-2">
          <span className="block h-2 w-4/5 rounded-full bg-[var(--kl-paper-2)]" />
          <span className="block h-2 w-1/2 rounded-full bg-[var(--kl-paper-2)]" />
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[0.7rem] font-semibold text-warning">
          <Clock size={11} /> pending
        </span>
      </div>
    </div>
  )
}

function Tributes() {
  return (
    <div>
      <p className={label}>TRIBUTES</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          { n: '214', what: 'candles' },
          { n: '96', what: 'flowers' },
        ].map((t) => (
          <div key={t.what} className="rounded-2xl bg-[var(--kl-paper)] p-4">
            <div className="kl-serif text-[2.6rem] font-semibold leading-none">{t.n}</div>
            <div className="mt-1 text-sm text-[var(--kl-mid)]">{t.what}</div>
          </div>
        ))}
      </div>
      {/* A candle reads as light only against the dark: the tile stays night in both themes. */}
      <div className="force-dark mt-3 flex items-end justify-center gap-6 rounded-2xl bg-[#12162B] py-2">
        <CandleFlowerWidget kind="candle" tier="free" className="scale-90" />
        <CandleFlowerWidget kind="flower" tier="premium" className="scale-90" />
      </div>
      <p className="mt-2 text-[0.8rem] text-[var(--kl-low)]">free & premium</p>
    </div>
  )
}

function Location() {
  const reduced = useReducedMotion()
  return (
    <div>
      <p className={label}>GRAVE LOCATION</p>
      {/* A drawn map: contour lines, two paths and the pin. Illustrative —
          the coordinates beneath it are the record. */}
      <div className="relative mt-4 h-[176px] overflow-hidden rounded-2xl bg-[var(--kl-paper)]" aria-hidden="true">
        <svg viewBox="0 0 400 176" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full text-[var(--kl-dash)]">
          {[18, 40, 62, 84].map((r, i) => (
            <ellipse key={r} cx="250" cy="96" rx={r * 2.2} ry={r} fill="none" stroke="currentColor" strokeWidth="1" opacity={1 - i * 0.18} />
          ))}
          <path d="M-10 140 C 80 120, 140 150, 230 118 S 360 70, 420 82" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
          <path d="M60 -10 C 90 60, 120 90, 150 190" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
        </svg>
        <span className="absolute" style={{ left: '62.5%', top: '54.5%' }}>
          {!reduced && (
            <motion.span
              className="absolute -left-5 -top-5 h-10 w-10 rounded-full bg-[#D9A648]/30"
              animate={{ scale: [0.6, 1.4], opacity: [0.8, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
          <span className="kl-sheen absolute -left-[14px] -top-[34px] grid h-7 w-7 place-items-center rounded-full rounded-br-none rotate-45 shadow-md">
            <span className="h-2.5 w-2.5 -rotate-45 rounded-full bg-[var(--kl-night)]" />
          </span>
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="min-w-0">
          <p className="kl-mono text-sm text-[var(--kl-ink)]">−6.7924° S, 39.2083° E</p>
          <p className="text-[0.82rem] text-[var(--kl-low)]">Kinondoni Cemetery</p>
        </div>
        <span className="mono-data ms-auto rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[0.6rem] tracking-widest text-success">
          CAPTURED ON-SITE · VERIFIED
        </span>
      </div>
    </div>
  )
}

function Faith() {
  return (
    <div>
      <p className={label}>FAITH STYLE</p>
      <p className="kl-serif mt-3 text-[1.35rem] leading-snug">
        Chosen from her <span className="text-[var(--kl-gold-deep)]">documented wishes</span>, confirmed by
        the memorial’s administrators. AI plays no part in this choice.
      </p>
      <ul className="mt-6 space-y-2">
        {[
          { k: 'Source', v: 'Her documented wishes' },
          { k: 'Confirmed by', v: 'The memorial’s administrators' },
          { k: 'AI', v: 'Plays no part in this choice' },
        ].map((r) => (
          <li key={r.k} className="flex items-center justify-between gap-4 rounded-xl bg-[var(--kl-paper)] px-4 py-3 text-sm">
            <span className="kl-mono text-[11px] tracking-[0.12em] text-[var(--kl-low)]">{r.k.toUpperCase()}</span>
            <span className="text-end text-[var(--kl-ink)]">{r.v}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ── The section ───────────────────────────────────────────────────────── */

/**
 * A memorial, complete (memorials.md §2) — on the landing's selector pattern:
 * the six parts of a memorial as a numbered list, and one memorial beside it
 * showing the chosen part in full. It turns on its own until the visitor
 * picks a part, and never for visitors who asked for less motion.
 */
export default function MemorialAnatomy() {
  const { t } = useTranslation()
  const reduced = useReducedMotion()
  const [active, setActive] = useState(0)
  const [manual, setManual] = useState(false)
  const [autoplay, setAutoplay] = useState(false)
  const turning = !manual && !reduced

  useEffect(() => {
    if (!turning) return
    const timer = window.setInterval(() => setActive((i) => (i + 1) % PARTS.length), STEP_MS)
    return () => window.clearInterval(timer)
  }, [turning])

  const pick = (i: number) => {
    setManual(true)
    setActive(i)
  }

  const views: ReactNode[] = [
    <Biography key="bio" />,
    <Media key="media" autoplay={autoplay} onToggle={() => setAutoplay((v) => !v)} />,
    <GuestBook key="guestbook" />,
    <Tributes key="tributes" />,
    <Location key="location" />,
    <Faith key="faith" />,
  ]

  return (
    <div className="kl-split items-start gap-[clamp(40px,6vw,96px)]">
      <div>
        <p className="kl-mono text-xs tracking-[.14em] text-[var(--kl-gold-deep)]">{t('memorials.anatomy').toUpperCase()}</p>
        <h2 className="kl-h2 mt-4">{t('memorials.aMemorialComplete')}</h2>
        <p className="kl-lead mt-5">
          Every memorial is a whole life, carefully kept. Select each element to see where it lives.
        </p>

        <ol className="mt-10 border-b border-[var(--kl-paper-2)]">
          {PARTS.map((p, i) => {
            const on = i === active
            const Icon = p.icon
            return (
              <li key={p.title} className="relative border-t border-[var(--kl-paper-2)]">
                <button
                  type="button"
                  onClick={() => pick(i)}
                  aria-expanded={on}
                  className="flex w-full items-start gap-5 py-5 text-start"
                >
                  <span className={cn('kl-mono pt-1.5 text-[13px] transition-colors', on ? 'text-[var(--kl-gold-deep)]' : 'text-[var(--kl-low)]')}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        'kl-serif flex items-center gap-3 text-[clamp(22px,2.2vw,28px)] font-semibold leading-tight transition-colors',
                        on ? 'text-[var(--kl-ink)]' : 'text-[var(--kl-low)]',
                      )}
                    >
                      <Icon size={20} className={on ? 'text-[var(--kl-gold-deep)]' : 'opacity-60'} aria-hidden="true" />
                      {p.title}
                    </span>
                    <AnimatePresence initial={false}>
                      {on && (
                        <motion.span
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: reduced ? 0 : 0.35, ease: cloudEase }}
                          className="block overflow-hidden"
                        >
                          <span className="block pt-2 text-base leading-[1.55] text-[var(--kl-mid)]">{p.body}</span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                </button>
                {on && (
                  <motion.span
                    key={`bar-${i}-${turning}`}
                    aria-hidden="true"
                    className="absolute -top-px left-0 h-0.5 bg-[var(--kl-gold)]"
                    initial={{ width: turning ? '0%' : '100%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: turning ? STEP_MS / 1000 : 0, ease: 'linear' }}
                  />
                )}
              </li>
            )
          })}
        </ol>
      </div>

      {/* One memorial, open on the chosen part */}
      <div
        className="relative overflow-hidden rounded-[20px] p-[clamp(20px,4vw,44px)]"
        style={{ background: 'linear-gradient(160deg, var(--kl-stage-a), var(--kl-stage-b))' }}
      >
        <div aria-hidden="true" className="absolute -right-16 -top-16 h-[260px] w-[260px] rounded-full bg-[var(--kl-sky)] opacity-40 blur-[80px]" />
        <div aria-hidden="true" className="kl-sheen absolute -bottom-20 -left-16 h-[220px] w-[220px] rounded-full opacity-30 blur-[80px]" />

        <motion.article
          initial={reduced ? false : { opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: cloudEase }}
          className="kl-card-shadow relative mx-auto max-w-[460px] overflow-hidden rounded-[20px] bg-[var(--kl-surface)]"
          aria-label="Example memorial: Mama Agnes Neema Mushi"
        >
          <header className="flex items-center gap-4 border-b border-[var(--kl-paper-2)] p-5">
            <span className="kl-orb-ring shrink-0 rounded-full p-[3px]">
              <img
                src="/family-archive-1.jpg"
                alt="Portrait of Mama Agnes Neema Mushi with her family"
                className="h-14 w-14 rounded-full border-[3px] border-[var(--kl-cutout)] object-cover"
                style={{ objectPosition: '30% 25%' }}
              />
            </span>
            <div className="min-w-0">
              <p className="kl-serif flex items-center gap-2 text-xl font-semibold leading-tight">
                Mama Agnes Neema Mushi
                <VerifiedBadge size={16} />
              </p>
              <p className="kl-mono mt-1 text-[11px] tracking-[0.14em] text-[var(--kl-gold-deep)]">1947 — 2024 · DAR ES SALAAM</p>
            </div>
          </header>

          <div className="relative min-h-[360px] p-5">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: cloudEase }}
              >
                {views[active]}
              </motion.div>
            </AnimatePresence>
          </div>

          <footer className="flex items-center justify-between border-t border-[var(--kl-paper-2)] px-5 py-3">
            <span className="mono-data inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-[0.6rem] tracking-widest text-success">
              <ShieldCheck size={11} aria-hidden="true" /> VERIFIED MEMORIAL
            </span>
            <span className="flex gap-1.5" aria-hidden="true">
              {PARTS.map((p, i) => (
                <span
                  key={p.title}
                  className={cn('h-1.5 rounded-full transition-all', i === active ? 'w-5 bg-[var(--kl-gold)]' : 'w-1.5 bg-[var(--kl-paper-2)]')}
                />
              ))}
            </span>
          </footer>
        </motion.article>
      </div>
    </div>
  )
}
