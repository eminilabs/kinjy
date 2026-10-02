import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { CLOUD_EASE } from '@/components/platform/shared'
import { Eyebrow, Stage } from './kit'

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
    <section className="kl-pad-x border-t border-[var(--kl-paper-2)] py-[clamp(72px,9vw,120px)]" aria-label="Publish your algorithm">
      <div className="kl-split gap-[clamp(40px,6vw,96px)]">
        <Stage className="min-w-0 p-[clamp(16px,4vw,48px)] lg:order-2" glows={['var(--kl-indigo)', '#D9A648']}>
          <motion.div
            ref={cardRef}
            className="overflow-hidden rounded-2xl bg-[var(--kl-surface)] shadow-[0_30px_60px_-36px_var(--kl-shadow)]"
            initial={reduced ? false : { opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.55, ease: CLOUD_EASE }}
          >
            <div className="flex items-center gap-1.5 border-b border-[var(--kl-paper-2)] bg-[var(--kl-paper)] px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-[#E07856]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#F0C878]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#7CC4A0]" />
              <span className="kl-mono ml-2 truncate text-[11px] text-[var(--kl-low)]">algorithm.manifest.json</span>
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
          <div className="kl-glass mx-auto -mt-5 flex w-fit items-center gap-3 rounded-full py-2 pe-5 ps-2 shadow-[0_20px_40px_-24px_var(--kl-shadow)] relative">
            <span className="kl-sheen grid h-8 w-8 place-items-center rounded-full text-sm" aria-hidden="true">↓</span>
            <span className="kl-mono text-[13px]">
              installed <span className="font-semibold">{installs.toLocaleString()}</span> times
            </span>
          </div>
        </Stage>

        <div className="min-w-0">
          <Eyebrow>Open by design</Eyebrow>
          <h2 className="kl-h2 mt-5">Build an algorithm. Ship it to millions.</h2>
          <p className="kl-lead mt-6">
            Feed algorithms are publishable through the Kinjy API — declared inputs, transparent
            ranking signals, user-installed by choice. Reviewed for safety, labeled forever as
            community-built.
          </p>
          <Link
            to="/developers"
            className="mt-10 inline-flex items-center gap-2 rounded-[20px] border border-[var(--kl-paper-2)] px-6 py-4 font-semibold transition-colors hover:border-[var(--kl-gold)] hover:text-[var(--kl-gold-deep)]"
          >
            Developer Platform <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  )
}
