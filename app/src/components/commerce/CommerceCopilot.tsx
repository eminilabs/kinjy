import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Check, LineChart, Mic2, RotateCcw, ShoppingBasket, Sparkles } from 'lucide-react'
import { ArcButton } from '@/components/ui-kit'
import { EASE, useReducedMotion } from '@/components/creators/motion-utils'

const LISTING = {
  title: 'Hand-woven sisal basket — natural dye, 34 cm',
  description:
    'Woven over three days by the Neema Crafts cooperative in Arusha. Food-safe, rain-tough, and each one slightly — beautifully — different.',
  price: '$24',
  priceNote: 'suggested from 14 comparable sales in your region · margin preserved',
}

const FORECAST = [4, 6, 5, 9, 12, 11, 15, 18, 16, 21, 24, 27]
const TALKING_POINTS = [
  'Open on the maker story — buyers convert 2.3× better',
  'Show the weave close-up at minute 3',
  'Bundle with the spice box when chat mentions gifts',
]

/** Demand-forecast sparkline that draws itself when active. */
function ForecastSparkline({ active, reduced }: { active: boolean; reduced: boolean }) {
  const max = Math.max(...FORECAST)
  const pts = FORECAST.map((v, i) => `${(i / (FORECAST.length - 1)) * 280},${64 - (v / max) * 56}`).join(' ')
  return (
    <svg viewBox="0 0 280 70" className="h-20 w-full" fill="none" aria-hidden="true">
      <motion.polyline
        points={pts}
        stroke="#F0C878"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: reduced ? 1 : 0, opacity: 0 }}
        animate={active ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
        transition={{ duration: reduced ? 0.01 : 1.1, ease: [0.65, 0, 0.35, 1] }}
      />
      {active && (
        <motion.circle
          cx="280"
          cy={64 - (FORECAST[FORECAST.length - 1] / max) * 56}
          r="4"
          fill="#F0C878"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: reduced ? 0 : 1, duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
        />
      )}
    </svg>
  )
}

/** Section A5 — Commerce Copilot: photo in, listing out, demand forecast, live host assistant. */
export default function CommerceCopilot() {
  const reduced = useReducedMotion()
  const [stage, setStage] = useState(0) // 0 idle · 1 title · 2 desc · 3 price · 4 forecast · 5 live assistant
  const [running, setRunning] = useState(false)
  const timers = useRef<number[]>([])

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  const run = useCallback(() => {
    clearTimers()
    setStage(0)
    setRunning(true)
    for (let s = 1; s <= 5; s += 1) {
      timers.current.push(
        window.setTimeout(() => {
          setStage(s)
          if (s === 5) setRunning(false)
        }, reduced ? 80 * s : 350 + s * 620),
      )
    }
  }, [reduced])

  const reveal = (n: number, node: React.ReactNode) => (
    <AnimatePresence>
      {stage >= n && (
        <motion.div
          key={n}
          initial={reduced ? false : { opacity: 0, y: 12, filter: 'blur(3px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          {node}
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <section className="noise-overlay px-6 py-24 md:py-32" style={{ background: 'var(--ink)' }}>
      <div className="mx-auto max-w-container">
        <p className="eyebrow text-sky">Commerce Copilot — seller AI</p>
        <h2 className="h2 mt-4 max-w-2xl">
          Snap a photo. <span className="text-gold-grad font-display italic">Get a shop floor.</span>
        </h2>
        <p className="body-lg mt-4 max-w-2xl text-text-mid">
          The Commerce Copilot turns one seller photo into a complete listing — title, description,
          honest price suggestion — then forecasts demand and rides along as your live-shopping
          host assistant.
        </p>

        <div className="mt-12 grid items-start gap-8 lg:grid-cols-2">
          {/* Left: photo → generate */}
          <div className="cloud-card overflow-hidden">
            <div className="relative flex h-56 items-center justify-center bg-gradient-to-br from-gold/50 via-coral/30 to-ink-3">
              <ShoppingBasket size={72} className="text-gold-soft drop-shadow-[0_8px_24px_rgba(0,0,0,0.5)]" aria-hidden="true" />
              <span className="mono-data absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-ink/70 px-3 py-1 text-xs text-text-mid">
                <Camera size={12} aria-hidden="true" /> seller photo · IMG_4471.jpg
              </span>
              {stage === 0 && (
                <span className="absolute bottom-4 right-4 rounded-full border border-white/20 bg-ink/60 px-3 py-1 text-xs text-text-mid">
                  no listing yet
                </span>
              )}
            </div>
            <div className="p-6">
              <ArcButton onClick={run} disabled={running} className="w-full">
                {stage >= 5 ? (
                  <>
                    <RotateCcw size={15} aria-hidden="true" /> Regenerate listing
                  </>
                ) : (
                  <>
                    <Sparkles size={15} aria-hidden="true" /> {running ? 'Copilot is writing…' : 'Generate listing'}
                  </>
                )}
              </ArcButton>
              <p className="caption mt-3 text-center">
                Trained on Kinjy marketplace conventions — never invents claims about your product.
              </p>
            </div>
          </div>

          {/* Right: generated output */}
          <div className="flex min-h-[380px] flex-col gap-4">
            {stage === 0 && (
              <div className="cloud-card flex flex-1 items-center justify-center border-dashed p-8 text-center">
                <p className="caption max-w-xs">
                  Your generated listing, demand forecast and live-host assistant appear here.
                </p>
              </div>
            )}

            {reveal(
              1,
              <div className="cloud-card p-5">
                <p className="eyebrow text-text-low">Generated listing</p>
                <h3 className="mt-2 font-sans text-lg font-semibold text-text-hi">{LISTING.title}</h3>
              </div>,
            )}
            {reveal(
              2,
              <div className="cloud-card p-5">
                <p className="text-sm leading-relaxed text-text-mid">{LISTING.description}</p>
              </div>,
            )}
            {reveal(
              3,
              <div className="cloud-card flex items-center justify-between gap-4 p-5 shadow-gold-ring">
                <div>
                  <p className="eyebrow text-text-low">Price suggestion</p>
                  <p className="caption mt-1">{LISTING.priceNote}</p>
                </div>
                <span className="mono-data text-3xl font-semibold text-gold-soft">{LISTING.price}</span>
              </div>,
            )}
            {reveal(
              4,
              <div className="cloud-card p-5">
                <div className="flex items-center justify-between">
                  <p className="eyebrow inline-flex items-center gap-2 text-text-low">
                    <LineChart size={14} aria-hidden="true" /> Demand forecast · 12 weeks
                  </p>
                  <span className="mono-data text-xs text-success">▲ trending +38%</span>
                </div>
                <ForecastSparkline active={stage >= 4} reduced={reduced} />
                <p className="caption">Peak expected around the holiday market season — stock 30+ units.</p>
              </div>,
            )}
            {reveal(
              5,
              <div className="cloud-card gold p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: 'var(--grad-orb)' }}>
                    <Mic2 size={15} className="text-ink" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text-hi">Live-shopping host assistant</p>
                    <p className="caption">whispers in your ear while you stream</p>
                  </div>
                  <span className="mono-data ml-auto inline-flex items-center gap-1.5 rounded-full border border-coral/50 bg-coral/15 px-2.5 py-0.5 text-[0.65rem] text-coral">
                    <span className="h-1.5 w-1.5 rounded-full bg-coral" aria-hidden="true" /> LIVE
                  </span>
                </div>
                <ul className="mt-4 space-y-2">
                  {TALKING_POINTS.map((t) => (
                    <li key={t} className="flex items-start gap-2 text-sm text-text-mid">
                      <Check size={14} className="mt-0.5 shrink-0 text-gold-soft" aria-hidden="true" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>,
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
