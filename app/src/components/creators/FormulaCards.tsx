import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { Eyebrow } from '@/components/landing/PageKit'
import { FEATURES, isRouteAvailable } from '@/lib/features'
import { cn } from '@/lib/utils'
import { useReducedMotion } from './motion-utils'

// The agency-pricing card and the markup example are the marketplace's; while
// it is switched off (lib/features.ts) the commission is explained without them.
const FORMULAS = [
  ...(FEATURES.marketplace
    ? [
        {
          title: 'Agency pricing',
          parts: ['Seller $100 ', '+ Kinjy markup 20% ($20) ', '= Customer $120'],
          caption:
            'The seller receives exactly what they set. The $20 markup is Kinjy’s revenue — and the only money a commission can come from.',
        },
      ]
    : []),
  {
    title: 'Direct commission',
    parts: ['Sponsor 20% ', '· Kinjy Leaders 5% ', '· Platform 75%'],
    caption: FEATURES.marketplace
      ? 'One level. The member who sponsored the buyer is paid 20% of Kinjy’s revenue — $4 on that $20 markup. Nobody above them is paid anything.'
      : 'One level. The member who sponsored you is paid 20% of Kinjy’s revenue on what you do. Nobody above them is paid anything.',
  },
  {
    title: 'Advertising',
    parts: ['Ad spend ', '→ sponsor 20% ', '+ Leaders 5%'],
    caption:
      'An ad bought from Kinjy is revenue in full, so the same single rate applies to the whole purchase.',
  },
]

function TypedFormula({ parts, start }: { parts: string[]; start: boolean }) {
  const reduced = useReducedMotion()
  const full = parts.join('')
  const [n, setN] = useState(reduced ? full.length : 0)
  const [done, setDone] = useState(reduced)

  useEffect(() => {
    if (!start || reduced) return
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setN(i)
      if (i >= full.length) {
        window.clearInterval(id)
        setDone(true)
      }
    }, 1000 / 30) // 30 chars/s
    return () => window.clearInterval(id)
  }, [start, full.length, reduced])

  // gold flash on operators once typing completes
  const renderPart = (text: string) =>
    text.split(/([+·=→])/).map((chunk, j) =>
      /^[+·=→]$/.test(chunk) ? (
        <span key={j} className={cn('text-[var(--kl-gold-deep)] transition-all duration-500', done && 'font-bold text-[var(--kl-gold)]')}>
          {chunk}
        </span>
      ) : (
        <span key={j}>{chunk}</span>
      ),
    )

  // precompute each part's start offset against the typed count
  const offsets: number[] = []
  parts.forEach((_p, i) => offsets.push(i === 0 ? 0 : offsets[i - 1] + parts[i - 1].length))
  return (
    <p className="kl-mono my-3 min-h-[3.4em] text-[15px] leading-relaxed">
      {parts.map((p, i) => {
        const visible = p.slice(0, Math.max(0, Math.min(p.length, n - offsets[i])))
        return <span key={i}>{renderPart(visible)}</span>
      })}
      {!done && start && <span className="animate-pulse text-[var(--kl-gold-deep)]">▍</span>}
    </p>
  )
}

/** Section 6 — the commerce and commission maths, in three cards. */
export default function FormulaCards() {
  const rootRef = useRef<HTMLElement>(null)
  const [start, setStart] = useState(false)

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setStart(true), { threshold: 0.35 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section ref={rootRef} className="kl-pad-x border-t border-[var(--kl-paper-2)] py-[clamp(72px,9vw,120px)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Eyebrow>The direct programme</Eyebrow>
          <h2 className="kl-h2 mt-5 max-w-[720px]">
            {FEATURES.marketplace ? 'Commerce math you can audit.' : 'Commission math you can audit.'}
          </h2>
        </div>
        {isRouteAvailable('/commerce') && (
          <Link to="/commerce" className="inline-flex items-center gap-2 font-semibold text-[var(--kl-gold-deep)] transition-all hover:gap-3">
            Full commerce details <ArrowRight size={16} aria-hidden="true" />
          </Link>
        )}
      </div>
      <div className={cn('mt-12 grid gap-5', FORMULAS.length === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2')}>
        {FORMULAS.map((f, i) => (
          <article
            key={f.title}
            className="flex flex-col rounded-[20px] border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] p-7 shadow-[0_18px_36px_-30px_var(--kl-shadow)] transition-transform hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between">
              <span className="kl-mono text-[11px] uppercase tracking-[.14em] text-[var(--kl-low)]">Formula {String(i + 1).padStart(2, '0')}</span>
              <span className="h-2 w-2 rounded-full" style={{ background: ['#D9A648', '#8FB8E8', '#E07856'][i % 3] }} aria-hidden="true" />
            </div>
            <h3 className="kl-serif mt-4 text-[26px] font-semibold leading-tight">{f.title}</h3>
            <div className="mt-5 rounded-[12px] bg-[var(--kl-paper)] px-4 py-1">
              <TypedFormula parts={f.parts} start={start} />
            </div>
            <p className="mt-5 text-[15px] leading-relaxed text-[var(--kl-mid)]">{f.caption}</p>
          </article>
        ))}
      </div>
    </section>
  )
}
