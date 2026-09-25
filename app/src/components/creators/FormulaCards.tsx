import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight } from 'lucide-react'
import { CloudCard } from '@/components/ui-kit'
import { cn } from '@/lib/utils'
import { useReducedMotion } from './motion-utils'

const FORMULAS = [
  {
    title: 'Agency pricing',
    parts: ['Seller $100 ', '+ Kinjy markup 20% ($20) ', '= Customer $120'],
    caption:
      'The seller receives exactly what they set. The $20 markup is Kinjy’s revenue — and the only money a commission can come from.',
  },
  {
    title: 'Direct commission',
    parts: ['Sponsor 20% ', '· Kinjy Leaders 5% ', '· Platform 75%'],
    caption:
      'One level. The member who sponsored the buyer is paid 20% of Kinjy’s revenue — $4 on that $20 markup. Nobody above them is paid anything.',
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
        <span key={j} className={cn('text-gold-soft transition-all duration-500', done && 'text-gold [text-shadow:0_0_14px_rgba(217,166,72,0.7)]')}>
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
    <p className="mono-data mt-4 text-base leading-relaxed text-text-hi">
      {parts.map((p, i) => {
        const visible = p.slice(0, Math.max(0, Math.min(p.length, n - offsets[i])))
        return <span key={i}>{renderPart(visible)}</span>
      })}
      {!done && start && <span className="animate-pulse text-gold-soft">▍</span>}
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
    <section ref={rootRef} className="noise-overlay bg-ink px-6 py-24 md:py-32">
      <div className="mx-auto max-w-container">
        <p className="eyebrow text-center text-sky">The direct programme</p>
        <h2 className="h2 mt-4 text-center">Commerce math you can audit.</h2>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {FORMULAS.map((f) => (
            <CloudCard key={f.title} hoverable className="p-6">
              <h3 className="text-lg font-semibold text-gold-soft">{f.title}</h3>
              <TypedFormula parts={f.parts} start={start} />
              <p className="caption mt-4">{f.caption}</p>
            </CloudCard>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link to="/commerce" className="inline-flex items-center gap-2 font-semibold text-gold-soft transition-all hover:gap-3">
            Full commerce details <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
