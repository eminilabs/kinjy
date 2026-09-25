import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Info } from 'lucide-react'
import { CloudCard, ModeChip } from '@/components/ui-kit'
import { cn } from '@/lib/utils'

gsap.registerPlugin(ScrollTrigger)

type Segment = { label: string; pct: number; color: string; textDark?: boolean }

// The creator is paid first, out of the gross. What Kinjy retains is then
// Kinjy's revenue, and the direct commission is computed on that — which is why
// 20% of the retained 60% reads as 12% of the whole bar.
const SEGMENTS: Segment[] = [
  { label: 'Creator', pct: 40, color: '#D9A648', textDark: true },
  { label: 'Sponsor', pct: 12, color: '#8FB8E8', textDark: true },
  { label: 'Leaders', pct: 3, color: '#4A52E0' },
  { label: 'Platform', pct: 45, color: '#1A1F3B' },
]

const LEGEND = [
  { color: '#D9A648', text: 'Creator — 40% of the ad revenue' },
  { color: '#8FB8E8', text: 'Their sponsor — 20% of what Kinjy retains' },
  { color: '#4A52E0', text: 'Kinjy Leaders pool — 5% of what Kinjy retains' },
  { color: '#1A1F3B', text: 'Platform — the rest' },
]

const STREAMS: { label: string; caption: string }[] = [
  { label: 'Advertising', caption: 'Ads: creator 40%, then the creator’s sponsor takes 20% of what Kinjy retains.' },
  { label: 'Subscriptions', caption: 'Subscriptions: creator keeps 80% of every subscriber payment.' },
  { label: 'Tips', caption: 'Tips: creator keeps 90% — a small processing share keeps the rails running.' },
  { label: 'Gifts', caption: 'Gifts: creator keeps 85% of every gift’s coin value.' },
  { label: 'Paid livestreams', caption: 'Paid livestreams: creator keeps 80% of ticket and seat revenue.' },
  { label: 'Ticketed events', caption: 'Ticketed events: organizer keeps 85% of every ticket sold.' },
  { label: 'Paid newsletters', caption: 'Paid newsletters: writer keeps 85% of each subscription.' },
  { label: 'Courses', caption: 'Courses: instructor keeps 80% of every enrollment.' },
  { label: 'Digital products', caption: 'Digital products: seller keeps 85% of every sale.' },
]

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
    <section ref={rootRef} id="splits" className="noise-overlay bg-ink px-6 py-24 md:py-32">
      <div className="mx-auto max-w-container">
        <p className="eyebrow text-center text-gold">The split, in full</p>
        <h2 className="h2 mt-4 text-center">Where every advertising dollar goes.</h2>
        <p className="body-lg mx-auto mt-4 max-w-2xl text-center text-text-mid">
          One immutable formula, visible to everyone. The creator always takes the largest single share.
        </p>

        {/* Stacked waterfall bar — 12 labeled segments */}
        <div className="mt-14">
          <div className="wf-bar flex h-20 w-full overflow-hidden rounded-card-md border border-white/10">
            {SEGMENTS.map((s, i) => (
              <div
                key={`${s.label}-${i}`}
                className="wf-seg relative flex items-center justify-center overflow-hidden border-e border-ink/40"
                data-pct={s.pct}
                style={{ width: `${s.pct}%`, background: s.color }}
                title={`${s.label} — ${s.pct}%`}
              >
                {s.pct >= 5 && (
                  <span className={cn('mono-data text-xs', s.textDark ? 'text-ink font-semibold' : 'text-text-hi')}>
                    {s.pct}%
                  </span>
                )}
                {s.pct === 1 && (
                  <span className="wf-tick mono-data text-[0.55rem] text-text-hi/80">1%</span>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-x-8 gap-y-2">
            {LEGEND.map((l) => (
              <span key={l.text} className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full border border-white/20" style={{ background: l.color }} aria-hidden="true" />
                <span className="mono-data text-text-mid">{l.text}</span>
              </span>
            ))}
          </div>
          {/* count-up readout */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { v: 40, l: 'to the creator', unit: '%' },
              { v: 20, l: 'of Kinjy’s share to their sponsor', unit: '%' },
              { v: 5, l: 'of Kinjy’s share to Kinjy Leaders', unit: '%' },
              // Not a percentage. Rendering "1%" here read as a rate rather
              // than as the count it is, which is the whole claim.
              { v: 1, l: 'commission level — there is no second', unit: '' },
            ].map((r) => (
              <div key={r.l} className="cloud-card p-4 text-center">
                <p
                  className="wf-num font-mono text-2xl font-semibold text-gold-soft"
                  data-value={r.v}
                  data-unit={r.unit}
                >
                  {r.v}
                  {r.unit}
                </p>
                <p className="caption mt-1">{r.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Other streams */}
        <div className="mt-12 text-center">
          <p className="caption mb-4">Every stream, one honest split — tap to see:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {STREAMS.map((s, i) => (
              <ModeChip key={s.label} label={s.label} active={stream === i} onClick={() => setStream(i)} />
            ))}
          </div>
          <p className="mono-data mx-auto mt-5 max-w-xl text-sky" aria-live="polite">
            {STREAMS[stream].caption}
          </p>
        </div>

        {/* Gold footnote — one level, and what that rules out */}
        <CloudCard gold className="mx-auto mt-12 max-w-3xl border-gold/30 bg-gold/[0.06] p-6">
          <div className="flex items-start gap-3">
            <Info size={18} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
            <p className="text-sm leading-relaxed text-text-mid">
              <span className="font-semibold text-gold-soft">One level, deliberately:</span> only the member who
              sponsored you earns on what you do. There is no chain above them, so nobody is paid for a recruit they
              have never met, and no commission is split so thin it stops being worth the introduction. An advertising
              dollar is counted once: the creator is paid out of it, and the commission comes from what Kinjy keeps —
              never from both.
            </p>
          </div>
        </CloudCard>
      </div>
    </section>
  )
}
