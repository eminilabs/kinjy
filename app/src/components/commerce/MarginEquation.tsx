import { useEffect, useState } from 'react'
import { animate, motion } from 'framer-motion'
import { Info } from 'lucide-react'
import { CloudCard } from '@/components/ui-kit'
import { EASE, useReducedMotion } from '@/components/creators/motion-utils'

/** Animated currency figure — tweens 120ms on value change (FLIP-style digit morph). */
function MoneyFigure({ value, pulseKey, className }: { value: number; pulseKey: number; className?: string }) {
  const reduced = useReducedMotion()
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    if (reduced) {
      setDisplay(value)
      return
    }
    const controls = animate(display, value, {
      duration: 0.12,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(Math.round(v)),
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduced])

  return (
    <motion.span
      key={pulseKey}
      initial={reduced ? false : { scale: 1.06, color: '#F0C878' }}
      animate={{ scale: 1, color: '#F4F2EE' }}
      transition={{ duration: 0.24, ease: EASE }}
      className={className}
    >
      ${display}
    </motion.span>
  )
}

/** Section 2 — Agency pricing: the seller's price, the markup, the customer price. */
export default function MarginEquation() {
  const reduced = useReducedMotion()
  const [vendor, setVendor] = useState(100)
  const margin = vendor * 0.2
  const total = vendor + margin

  return (
    <section className="noise-overlay bg-ink px-6 py-24 md:py-32">
      <div className="mx-auto max-w-container">
        <p className="eyebrow text-center text-gold">Agency pricing</p>
        <h2 className="h2 mt-4 text-center">One simple formula.</h2>

        <motion.div
          className="mx-auto mt-14 max-w-4xl"
          initial={reduced ? false : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          {/* equation tokens */}
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-5">
            <motion.div
              className="cloud-card px-6 py-5 text-center"
              initial={reduced ? false : { x: -60, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-25%' }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <p className="caption">Seller sets</p>
              <MoneyFigure value={vendor} pulseKey={vendor} className="mono-data text-2xl font-semibold" />
            </motion.div>
            <motion.span
              key={`plus-${vendor}`}
              className="font-mono text-3xl font-semibold text-gold"
              initial={reduced ? false : { scale: 1.4 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
              aria-hidden="true"
            >
              +
            </motion.span>
            <motion.div
              className="cloud-card border-gold/30 px-6 py-5 text-center"
              initial={reduced ? false : { y: 40, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-25%' }}
              transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
            >
              <p className="caption">Kinjy markup 20%</p>
              <MoneyFigure value={margin} pulseKey={vendor} className="mono-data text-2xl font-semibold text-gold-soft" />
            </motion.div>
            <motion.span
              key={`eq-${vendor}`}
              className="font-mono text-3xl font-semibold text-gold"
              initial={reduced ? false : { scale: 1.4 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.2 }}
              aria-hidden="true"
            >
              =
            </motion.span>
            <motion.div
              className="cloud-card px-6 py-5 text-center"
              initial={reduced ? false : { x: 60, opacity: 0 }}
              whileInView={{ x: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-25%' }}
              transition={{ duration: 0.6, delay: 0.2, ease: EASE }}
            >
              <p className="caption">Customer pays</p>
              <MoneyFigure value={total} pulseKey={vendor} className="mono-data text-2xl font-semibold" />
            </motion.div>
          </div>

          {/* vendor price slider */}
          <div className="mx-auto mt-10 max-w-xl">
            <label htmlFor="vendor-price" className="caption mb-3 flex justify-between">
              <span>Seller’s price</span>
              <span className="mono-data text-gold-soft">${vendor}</span>
            </label>
            <input
              id="vendor-price"
              type="range"
              min={40}
              max={400}
              step={1}
              value={vendor}
              onChange={(e) => setVendor(Number(e.target.value))}
              className="w-full accent-gold"
              aria-valuetext={`$${vendor}`}
            />
            <div className="caption mt-1 flex justify-between">
              <span>$40</span>
              <span>$400</span>
            </div>
          </div>

          {/* callout */}
          <CloudCard gold className="mx-auto mt-10 max-w-3xl border-gold/30 bg-gold/[0.06] p-6">
            <div className="flex items-start gap-3">
              <Info size={18} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
              <p className="text-sm leading-relaxed text-text-mid">
                <span className="font-semibold text-gold-soft">
                  The sponsor's commission is calculated on the{' '}
                  <span className="mono-data">${Math.round(margin)}</span> markup — never on the gross price.
                </span>{' '}
                Sellers receive exactly what they set:{' '}
                <span className="mono-data text-gold-soft">${Math.round(vendor)}</span>.
              </p>
            </div>
          </CloudCard>
        </motion.div>
      </div>
    </section>
  )
}
