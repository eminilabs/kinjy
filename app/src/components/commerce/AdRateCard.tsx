import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Gavel } from 'lucide-react'
import { cn } from '@/lib/utils'

gsap.registerPlugin(ScrollTrigger)

const RATES = [
  { product: 'Standard display', floor: 'CPM $0.50' },
  { product: 'Premium video', floor: 'CPM $1.00' },
  { product: 'Clicks', floor: 'CPC $0.05' },
  { product: 'Views', floor: 'CPV $0.005' },
  { product: 'Engagement', floor: '$0.02' },
  { product: 'Lead', floor: '$0.25 min' },
  { product: 'Local promoted post', floor: 'from $1/day' },
  { product: 'City sponsorship', floor: 'from $5/day' },
  { product: 'Country & Global sponsorship', floor: 'by auction', auction: true },
]

const CLEARING = ['$0.74 CPM', '$0.81 CPM', '$1.12 CPM', '$0.68 CPM']

/** Section 4 — Advertising floor pricing : glass rate-card rows. */
export default function AdRateCard() {
  const rootRef = useRef<HTMLElement>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.from('.rate-row', {
        x: -60,
        opacity: 0,
        duration: 0.5,
        stagger: 0.06,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.rate-table', start: 'top 72%' },
      })
    }, root)
    return () => ctx.revert()
  }, [])

  // live auction ticker — example clearing prices, 3s interval
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => (t + 1) % CLEARING.length), 3000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <section ref={rootRef} className="kl-pad-x border-t border-[var(--kl-paper-2)] py-[clamp(72px,9vw,120px)]">
      <div className="mx-auto max-w-container">
        <p className="kl-mono text-xs uppercase tracking-[.14em] text-[var(--kl-gold-deep)] text-center">Advertising</p>
        <h2 className="kl-h2 mt-5 text-center">Floors, not barriers.</h2>
        <p className="text-[17px] leading-[1.55] mx-auto mt-4 max-w-xl text-center text-[var(--kl-mid)]">
          Competitive auction floors mean a neighborhood café and a global brand play by the same honest rules.
        </p>

        <div className="rate-table mx-auto mt-12 max-w-3xl space-y-2">
          {RATES.map((r) => (
            <div
              key={r.product}
              className="rate-row group flex items-center justify-between gap-4 rounded-[14px] border border-[var(--kl-paper-2)] bg-[var(--kl-paper)] px-5 py-4 transition-colors duration-200 ease-cloud-ease hover:border-gold/30 hover:bg-[var(--kl-paper)]"
            >
              <span className="flex items-center gap-3 text-sm font-medium text-[var(--kl-ink)]">
                {r.auction && <Gavel size={15} className="text-[var(--kl-gold-deep)]" aria-hidden="true" />}
                {r.product}
              </span>
              <span className="flex items-center gap-3">
                {r.auction && (
                  <span className="mono-data hidden rounded-full border border-gold/25 bg-gold/[0.07] px-2.5 py-0.5 text-[0.65rem] text-[var(--kl-gold-deep)] sm:inline">
                    clearing now: {CLEARING[tick]}
                  </span>
                )}
                <span
                  className={cn(
                    'mono-data text-[var(--kl-ink)] transition-all duration-200 group-hover:text-[var(--kl-gold-deep)] group-hover:[text-shadow:0_0_16px_rgba(217,166,72,0.65)]',
                  )}
                >
                  {r.floor}
                </span>
              </span>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--kl-low)] mx-auto mt-6 max-w-xl text-center">
          Auction floors — AI-adjusted by demand, never below these lines. Human-approved before launch, always.
        </p>
      </div>
    </section>
  )
}
