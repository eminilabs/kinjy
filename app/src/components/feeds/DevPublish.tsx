import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { CLOUD_EASE } from '@/components/platform/shared'

const MANIFEST: Array<Array<[string, string]>> = [
  [['{', 'text-gold']],
  [['  "name"', 'text-sky'], [': ', 'text-text-low'], ['"global-discovery"', 'text-success'], [',', 'text-text-low']],
  [['  "version"', 'text-sky'], [': ', 'text-text-low'], ['"1.3.0"', 'text-success'], [',', 'text-text-low']],
  [['  "publisher"', 'text-sky'], [': ', 'text-text-low'], ['"@mundial"', 'text-success'], [',', 'text-text-low']],
  [['  "inputs"', 'text-sky'], [': ', 'text-gold'], ['[', 'text-gold'], ['"country"', 'text-success'], [', ', 'text-text-low'], ['"language"', 'text-success'], [', ', 'text-text-low'], ['"hour"', 'text-success'], [']', 'text-gold'], [',', 'text-text-low']],
  [['  "signals"', 'text-sky'], [': { ', 'text-text-low'], ['"verified_sources"', 'text-sky'], [': ', 'text-text-low'], ['0.6', 'text-gold-soft'], [', ', 'text-text-low'], ['"freshness"', 'text-sky'], [': ', 'text-text-low'], ['0.4', 'text-gold-soft'], [' },', 'text-text-low']],
  [['  "rank"', 'text-sky'], [': ', 'text-text-low'], ['"rotate(one_post_per_country, per_hour)"', 'text-success'], [',', 'text-text-low']],
  [['  "boosts"', 'text-sky'], [': { ', 'text-text-low'], ['"new_creators"', 'text-sky'], [': ', 'text-text-low'], ['1.5', 'text-gold-soft'], [' },', 'text-text-low']],
  [['  "demotes"', 'text-sky'], [': ', 'text-gold'], ['[', 'text-gold'], ['"outrage_bait"', 'text-success'], [', ', 'text-text-low'], ['"engagement_farming"', 'text-success'], [']', 'text-gold'], [',', 'text-text-low']],
  [['  "label"', 'text-sky'], [': ', 'text-text-low'], ['"community-built"', 'text-success'], [',', 'text-text-low']],
  [['  "review"', 'text-sky'], [': ', 'text-text-low'], ['"safety-passed · 2025-09-14"', 'text-success']],
  [['}', 'text-gold']],
]

/** Section 5 — For developers: publish your algorithm. */
export default function DevPublish() {
  const cardRef = useRef<HTMLDivElement>(null)
  const inView = useInView(cardRef, { amount: 0.6, once: true })
  const reduced = useReducedMotion()
  const [lines, setLines] = useState(reduced ? MANIFEST.length : 0)
  const [installs, setInstalls] = useState(reduced ? 12482 : 0)

  // Line-by-line typing (60ms/line)
  useEffect(() => {
    if (!inView || reduced) return
    let i = 0
    const t = setInterval(() => {
      i += 1
      setLines(i)
      if (i >= MANIFEST.length) clearInterval(t)
    }, 60)
    return () => clearInterval(t)
  }, [inView, reduced])

  // "installed 12,482 times" counter ticks up after typing
  useEffect(() => {
    if (!inView || reduced) return
    if (lines < MANIFEST.length) return
    const start = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min((t - start) / 1400, 1)
      setInstalls(Math.round(12482 * (1 - Math.pow(1 - p, 3))))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [inView, lines, reduced])

  return (
    <section className="px-6 py-24 md:py-32" aria-label="Publish your algorithm">
      <div className="mx-auto grid max-w-container items-center gap-12 lg:grid-cols-2">
        <div className="max-w-lg">
          <p className="eyebrow text-gold">Open by Design</p>
          <h3 className="h2 mt-4">Build an algorithm. Ship it to millions.</h3>
          <p className="body-lg mt-5 text-text-mid">
            Feed algorithms are publishable through the Kinjy API — declared inputs, transparent
            ranking signals, user-installed by choice. Reviewed for safety, labeled forever as
            community-built.
          </p>
          <Link
            to="/developers"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-7 py-3.5 text-base font-bold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:brightness-110"
          >
            Developer Platform <ArrowRight size={16} />
          </Link>
        </div>

        <motion.div
          ref={cardRef}
          className="cloud-card overflow-hidden"
          initial={reduced ? false : { opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.55, ease: CLOUD_EASE }}
        >
          <div className="flex items-center gap-1.5 border-b border-white/10 bg-ink-3/70 px-4 py-2.5">
            <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
            <span className="mono-data ml-2 text-[0.68rem] text-text-low">algorithm.manifest.json</span>
            <span className="mono-data ml-auto text-[0.68rem] text-gold-soft">
              installed {installs.toLocaleString()} times
            </span>
          </div>
          <pre className="min-h-[336px] overflow-x-auto p-5 font-mono text-[0.8rem] leading-[1.75]">
            <code>
              {MANIFEST.slice(0, lines).map((spans, i) => (
                <span key={i} className="block">
                  {spans.map(([txt, cls], j) => (
                    <span key={j} className={cls}>{txt}</span>
                  ))}
                </span>
              ))}
              {lines < MANIFEST.length && <span className="animate-caret-blink text-gold">▌</span>}
            </code>
          </pre>
        </motion.div>
      </div>
    </section>
  )
}
