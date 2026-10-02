import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Info } from 'lucide-react'
import { Eyebrow, Stage } from '@/components/landing/PageKit'
import { cn } from '@/lib/utils'
import { FEATURES } from '@/lib/features'

gsap.registerPlugin(ScrollTrigger)

type Segment = { label: string; pct: number; color: string; textDark?: boolean; ink?: string }

// The creator is paid first, out of the gross. What Kinjy retains is then
// Kinjy's revenue, and the direct commission is computed on that — which is why
// 20% of the retained 60% reads as 12% of the whole bar.
const SEGMENTS: Segment[] = [
  { label: 'Creator', pct: 40, color: '#D9A648', textDark: true },
  { label: 'Sponsor', pct: 12, color: '#8FB8E8', textDark: true },
  { label: 'Leaders', pct: 3, color: '#4A52E0' },
  // Platform follows the page theme, so its label does too.
  { label: 'Platform', pct: 45, color: 'var(--kl-paper-2)', ink: 'var(--kl-ink)' },
]

const LEGEND = [
  { color: '#D9A648', text: 'Creator — 40% of the ad revenue' },
  { color: '#8FB8E8', text: 'Their sponsor — 20% of what Kinjy retains' },
  { color: '#4A52E0', text: 'Kinjy Leaders pool — 5% of what Kinjy retains' },
  { color: 'var(--kl-paper-2)', text: 'Platform — the rest' },
]

const ALL_STREAMS: { label: string; caption: string; live?: boolean }[] = [
  { label: 'Advertising', caption: 'Ads: creator 40%, then the creator’s sponsor takes 20% of what Kinjy retains.' },
  { label: 'Subscriptions', caption: 'Subscriptions: creator keeps 80% of every subscriber payment.' },
  { label: 'Tips', caption: 'Tips: creator keeps 90% — a small processing share keeps the rails running.' },
  { label: 'Gifts', caption: 'Gifts: creator keeps 85% of every gift’s coin value.' },
  { label: 'Paid livestreams', caption: 'Paid livestreams: creator keeps 80% of ticket and seat revenue.', live: true },
  { label: 'Ticketed events', caption: 'Ticketed events: organizer keeps 85% of every ticket sold.' },
  { label: 'Paid newsletters', caption: 'Paid newsletters: writer keeps 85% of each subscription.' },
  { label: 'Courses', caption: 'Courses: instructor keeps 80% of every enrollment.' },
  { label: 'Digital products', caption: 'Digital products: seller keeps 85% of every sale.' },
]

/** Livestream revenue is only listed while live is switched on (lib/features.ts). */
const STREAMS = ALL_STREAMS.filter((s) => FEATURES.live || !s.live)

/** Section 4 — Monetization waterfall: the creator share, then the direct commission. */
export default function MonetizationWaterfall() {
  const rootRef = useRef<HTMLElement>(null)
  const [stream, setStream] = useState(0)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>('.wf-seg').forEach((seg, i) => {
        const pct = Number(seg.dataset.pct)
        gsap.fromTo(
          seg,
          { width: '0%' },
          {
            width: `${pct}%`,
            duration: 1,
            delay: i * 0.12,
            ease: 'power2.inOut', // line-ease
            scrollTrigger: { trigger: '.wf-bar', start: 'top 70%' },
          },
        )
      })
      gsap.utils.toArray<HTMLElement>('.wf-tick').forEach((el, i) => {
        gsap.fromTo(
          el,
          { opacity: 0, scale: 0.6 },
          {
            opacity: 1,
            scale: 1,
            duration: 0.3,
            delay: 1.35 + i * 0.09, // honest rhythm: 1% ticks pulse in one by one
            ease: 'back.out(2)',
            scrollTrigger: { trigger: '.wf-bar', start: 'top 70%' },
          },
        )
      })
      gsap.utils.toArray<HTMLElement>('.wf-num').forEach((el) => {
        const target = Number(el.dataset.value)
        // The last readout is a count, not a rate. The animation used to append
        // "%" to all four, which turned "1 commission level" into "1%".
        const unit = el.dataset.unit ?? '%'
        const obj = { v: 0 }
        gsap.to(obj, {
          v: target,
          duration: 1.2,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 75%' },
          onUpdate: () => {
            el.textContent = `${Math.round(obj.v)}${unit}`
          },
        })
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={rootRef} id="splits" className="kl-pad-x scroll-mt-24 border-t border-[var(--kl-paper-2)] py-[clamp(72px,9vw,120px)]">
      <div className="max-w-[760px]">
        <Eyebrow>The split, in full</Eyebrow>
        <h2 className="kl-h2 mt-5">Where every advertising dollar goes.</h2>
        <p className="kl-lead mt-5 !max-w-[580px]">
          One immutable formula, visible to everyone. The creator always takes the largest single share.
        </p>
      </div>

      {/* Stacked bar */}
      <div className="mt-14">
        <div className="wf-bar flex h-24 w-full gap-1 overflow-hidden rounded-[20px] bg-[var(--kl-paper)] p-1">
          {SEGMENTS.map((s, i) => (
            <div
              key={`${s.label}-${i}`}
              className="wf-seg relative flex flex-col items-start justify-end overflow-hidden rounded-[16px] px-3 pb-2.5"
              data-pct={s.pct}
              style={{ width: `${s.pct}%`, background: s.color }}
              title={`${s.label} — ${s.pct}%`}
            >
              {s.pct >= 5 && (
                <>
                  <span className={cn('kl-serif text-2xl font-semibold leading-none', s.textDark ? 'text-[#241F16]' : 'text-white')} style={s.ink ? { color: s.ink } : undefined}>
                    {s.pct}%
                  </span>
                  <span
                    className={cn('kl-mono mt-1 hidden text-[10px] uppercase tracking-[.12em] opacity-75 sm:block', s.textDark ? 'text-[#241F16]' : 'text-white')}
                    style={s.ink ? { color: s.ink } : undefined}
                  >
                    {s.label}
                  </span>
                </>
              )}
              {s.pct === 1 && <span className="wf-tick kl-mono text-[9px] text-white/80">1%</span>}
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-x-8 gap-y-2">
          {LEGEND.map((l) => (
            <span key={l.text} className="flex items-center gap-2 text-sm text-[var(--kl-mid)]">
              <span className="h-2.5 w-2.5 rounded-full ring-1 ring-[var(--kl-paper-2)]" style={{ background: l.color }} aria-hidden="true" />
              {l.text}
            </span>
          ))}
        </div>

        {/* count-up readout, as an editorial row */}
        <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-10 border-t border-[var(--kl-paper-2)] pt-10 lg:grid-cols-4">
          {[
            { v: 40, l: 'to the creator', unit: '%' },
            { v: 20, l: 'of Kinjy’s share to their sponsor', unit: '%' },
            { v: 5, l: 'of Kinjy’s share to Kinjy Leaders', unit: '%' },
            // Not a percentage. Rendering "1%" here read as a rate rather
            // than as the count it is, which is the whole claim.
            { v: 1, l: 'commission level — there is no second', unit: '' },
          ].map((r) => (
            <div key={r.l}>
              <p className="wf-num kl-serif text-[clamp(44px,5vw,64px)] font-semibold leading-none text-[var(--kl-gold-deep)]" data-value={r.v} data-unit={r.unit}>
                {r.v}
                {r.unit}
              </p>
              <p className="mt-3 max-w-[220px] text-[15px] leading-snug text-[var(--kl-mid)]">{r.l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Other streams */}
      <Stage className="mt-16 p-[clamp(20px,4vw,48px)]" glows={['var(--kl-sky)', 'var(--kl-coral)']}>
        <p className="kl-mono text-[11px] uppercase tracking-[.14em] text-[var(--kl-low)]">Every stream, one honest split — tap to see</p>
        <div className="mt-5 flex flex-wrap gap-2" role="group" aria-label="Revenue streams">
          {STREAMS.map((st, i) => (
            <button
              key={st.label}
              type="button"
              aria-pressed={stream === i}
              onClick={() => setStream(i)}
              className={cn(
                'whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                stream === i ? 'kl-sheen' : 'bg-[var(--kl-surface)] text-[var(--kl-mid)] hover:text-[var(--kl-ink)]',
              )}
            >
              {st.label}
            </button>
          ))}
        </div>
        <p className="kl-serif mt-8 max-w-[760px] text-[clamp(22px,2.6vw,32px)] leading-snug" aria-live="polite">
          {STREAMS[stream].caption}
        </p>
      </Stage>

      {/* One level, and what that rules out */}
      <div className="mt-10 flex max-w-[860px] items-start gap-4 border-s-2 border-[var(--kl-gold)] ps-6">
        <Info size={18} className="mt-1 shrink-0 text-[var(--kl-gold-deep)]" aria-hidden="true" />
        <p className="text-[15px] leading-relaxed text-[var(--kl-mid)]">
          <span className="font-semibold text-[var(--kl-ink)]">One level, deliberately:</span> only the member who
          sponsored you earns on what you do. There is no chain above them, so nobody is paid for a recruit they
          have never met, and no commission is split so thin it stops being worth the introduction. An advertising
          dollar is counted once: the creator is paid out of it, and the commission comes from what Kinjy keeps —
          never from both.
        </p>
      </div>
    </section>
  )
}
