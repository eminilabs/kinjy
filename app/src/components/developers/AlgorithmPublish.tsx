import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { motion, useInView } from 'framer-motion'
import { Check } from 'lucide-react'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const MANIFEST_LINES: Array<Array<[string, string]>> = [
  [['{', 'text-text-mid']],
  [['  "name": ', 'text-gold'], ['"family-first"', 'text-success'], [',', 'text-text-mid']],
  [['  "version": ', 'text-gold'], ['"2.4.0"', 'text-success'], [',', 'text-text-mid']],
  [['  "author": ', 'text-gold'], ['"amara.codes"', 'text-success'], [',', 'text-text-mid']],
  [['  "inputs": [', 'text-gold'], ['"follows", "kinship", "recency"', 'text-sky'], ['],', 'text-text-mid']],
  [['  "signals": {', 'text-gold']],
  [['    "boost": [', 'text-gold'], ['"level<=2", "shared-photos"', 'text-sky'], ['],', 'text-text-mid']],
  [['    "demote": [', 'text-gold'], ['"engagement-bait"', 'text-sky'], ['],', 'text-text-mid']],
  [['  },', 'text-text-mid']],
  [['  "guarantees": [', 'text-gold'], ['"no-shadow-amplification",', 'text-sky']],
  [['    ', ''], ['"chronological-tiebreak"', 'text-sky'], ['],', 'text-text-mid']],
  [['  "license": ', 'text-gold'], ['"Kinjy-Community-1.0"', 'text-success']],
  [['}', 'text-text-mid']],
]

const BULLETS = [
  'Declarative manifest — inputs, signals and guarantees, not opaque code',
  'Safety review + sandbox replay against synthetic feeds before listing',
  'Forever labeled “Community-built” wherever it ranks content',
  'Install analytics dashboard: installs, retention, uninstall reasons',
]

/** Section 3 — Publish a feed algorithm: manifest code card + ticking install counter. */
export default function AlgorithmPublish() {
  const rootRef = useRef<HTMLDivElement>(null)
  const inView = useInView(rootRef, { once: true, margin: '-40%' })
  const [linesShown, setLinesShown] = useState(0)
  const [installs, setInstalls] = useState(14208)

  // Manifest types in on 60% trigger
  useEffect(() => {
    if (!inView) return
    let i = 0
    const id = setInterval(() => {
      i += 1
      setLinesShown(i)
      if (i >= MANIFEST_LINES.length) clearInterval(id)
    }, 90)
    return () => clearInterval(id)
  }, [inView])

  // Install counter ticks upward at 2s intervals while visible
  useEffect(() => {
    if (!inView) return
    const id = setInterval(() => {
      setInstalls((n) => n + 1 + Math.floor(Math.random() * 3))
    }, 2000)
    return () => clearInterval(id)
  }, [inView])

  return (
    <section className="noise-overlay relative bg-ink-2/30 px-6 py-24 md:py-28">
      <div ref={rootRef} className="mx-auto grid max-w-container items-center gap-14 lg:grid-cols-2">
        {/* Left copy */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.65, ease: EASE }}
        >
          <p className="eyebrow text-gold">Algorithm Marketplace</p>
          <h3 className="h3 mt-4 font-display text-3xl font-medium">
            Ship ranking logic users <span className="text-gold-grad">choose to install.</span>
          </h3>
          <ul className="mt-7 space-y-3.5">
            {BULLETS.map((b, i) => (
              <motion.li
                key={b}
                initial={{ opacity: 0, x: -18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-10%' }}
                transition={{ delay: 0.15 + i * 0.09, duration: 0.45, ease: EASE }}
                className="flex items-start gap-3 text-text-mid"
              >
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
                  <Check size={12} aria-hidden="true" />
                </span>
                {b}
              </motion.li>
            ))}
          </ul>
          <Link
            to="/feeds"
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-sky transition-colors hover:text-gold-soft"
          >
            See the 15 algorithms members can pick from →
          </Link>
        </motion.div>

        {/* Right: manifest card + counter */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <div className="cloud-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/10 bg-ink-3/70 px-5 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-gold/70" aria-hidden="true" />
              <span className="mono-data ms-1 text-xs text-text-low">algorithm.manifest.json</span>
              <span className="mono-data ms-auto rounded-full border border-sky/30 bg-sky/10 px-2.5 py-0.5 text-[0.65rem] text-sky">
                sandbox ✓ replayed
              </span>
            </div>
            <div className="min-h-[19rem] bg-ink-3/50 p-5 font-mono text-[0.78rem] leading-[1.75]">
              {MANIFEST_LINES.slice(0, linesShown).map((segs, i) => (
                <div key={i} className="whitespace-pre">
                  {segs.map(([txt, cls], j) => (
                    <span key={j} className={cls}>{txt}</span>
                  ))}
                </div>
              ))}
              {linesShown < MANIFEST_LINES.length && inView && (
                <span className="inline-block h-3.5 w-2 animate-caret-blink bg-gold" aria-hidden="true" />
              )}
            </div>
          </div>

          {/* install counter */}
          <div className="mt-5 flex items-center justify-between rounded-card-md border border-gold/25 bg-gold/10 px-5 py-4">
            <div>
              <p className="eyebrow text-gold-soft">Installs this week</p>
              <p className="caption mt-1">Family First · by amara.codes</p>
            </div>
            <motion.p
              key={installs}
              initial={{ scale: 1.06, color: '#F0C878' }}
              animate={{ scale: 1, color: '#D9A648' }}
              transition={{ duration: 0.4, ease: EASE }}
              className="mono-data text-2xl font-semibold tabular-nums"
              aria-live="polite"
            >
              {installs.toLocaleString()}
            </motion.p>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
