import { useRef } from 'react'
import { motion, useInView } from 'framer-motion'
import { CloudCard } from '@/components/ui-kit'
import { EASE, useReducedMotion } from '@/components/creators/motion-utils'

/**
 * The direct commission, made visible.
 *
 * This replaces the ten-node ring that used to sit here. That diagram was an
 * honest picture of a ten-level programme — a payment fanning out to nine
 * people who had never met the buyer — and the point of the new programme is
 * that it does not do that. One sponsor, one rate, and the rest stays with the
 * platform that has to run the thing.
 */
const PAYOUTS = [
  {
    id: 'sponsor',
    label: 'Sponsor',
    pct: '20%',
    of: '$4.00',
    tone: 'gold' as const,
    note: 'the member who brought the buyer',
  },
  {
    id: 'leaders',
    label: 'Kinjy Leaders',
    pct: '5%',
    of: '$1.00',
    tone: 'sky' as const,
    note: 'shared monthly by the top 10,000',
  },
  {
    id: 'platform',
    label: 'Kinjy',
    pct: '75%',
    of: '$15.00',
    tone: 'muted' as const,
    note: 'moderation, custody, infrastructure',
  },
]

const TONES = {
  gold: { border: 'rgba(217,166,72,0.6)', text: 'text-gold-soft', dot: '#F0C878' },
  sky: { border: 'rgba(143,184,232,0.55)', text: 'text-sky', dot: '#8FB8E8' },
  muted: { border: 'rgba(255,255,255,0.14)', text: 'text-text-mid', dot: 'rgba(255,255,255,0.35)' },
}

export default function DirectCommission() {
  const reduced = useReducedMotion()
  const rootRef = useRef<HTMLDivElement>(null)
  const inView = useInView(rootRef, { once: true, margin: '-30% 0px' })
  const show = reduced || inView

  return (
    <section className="noise-overlay bg-ink px-6 py-24 md:py-32">
      <div className="mx-auto max-w-container">
        <p className="eyebrow text-center text-gold">The direct programme</p>
        <h2 className="h2 mt-4 text-center">One sponsor. One rate. Paid from our margin.</h2>
        <p className="lead mx-auto mt-4 max-w-2xl text-center">
          When Kinjy connects a buyer to a seller, the seller keeps their price and Kinjy adds a 20% markup on top.
          That markup is the only money a commission is ever taken from.
        </p>

        <CloudCard className="mx-auto mt-12 max-w-3xl p-6 md:p-10">
          {/* the money in */}
          <div ref={rootRef} className="flex flex-col items-center">
            <div className="flex w-full max-w-md items-stretch gap-2">
              <div className="flex-[5] rounded-card-sm border border-white/12 bg-ink-2 px-3 py-4 text-center">
                <p className="mono-data text-[0.62rem] uppercase tracking-wider text-text-low">Seller keeps</p>
                <p className="mono-data mt-1 text-lg font-semibold text-text-hi">$100</p>
              </div>
              <div className="flex-[1] rounded-card-sm border border-gold/45 bg-gold/[0.07] px-2 py-4 text-center">
                <p className="mono-data text-[0.62rem] uppercase tracking-wider text-gold-soft">Markup</p>
                <p className="mono-data mt-1 text-lg font-semibold text-gold-soft">$20</p>
              </div>
            </div>
            <p className="caption mt-3">Customer pays $120 · Kinjy’s revenue is the $20</p>

            <span className="mt-6 h-8 w-px bg-white/15" aria-hidden="true" />
            <p className="mono-data text-[0.65rem] uppercase tracking-wider text-text-low">the $20 splits</p>
            <span className="mt-2 h-6 w-px bg-white/15" aria-hidden="true" />

            {/* the split */}
            <div className="mt-6 grid w-full gap-3 sm:grid-cols-3">
              {PAYOUTS.map((p, i) => {
                const tone = TONES[p.tone]
                return (
                  <motion.div
                    key={p.id}
                    className="rounded-card-sm border bg-ink-2 px-4 py-5 text-center"
                    style={{ borderColor: tone.border }}
                    initial={reduced ? undefined : { opacity: 0, y: 14 }}
                    animate={show && !reduced ? { opacity: 1, y: 0 } : undefined}
                    transition={{ delay: 0.15 + i * 0.12, duration: 0.5, ease: EASE }}
                  >
                    <span
                      className="mx-auto block h-2 w-2 rounded-full"
                      style={{ background: tone.dot }}
                      aria-hidden="true"
                    />
                    <p className={`mono-data mt-3 text-xl font-semibold ${tone.text}`}>{p.pct}</p>
                    <p className="mt-1 text-sm font-medium text-text-hi">{p.label}</p>
                    <p className={`mono-data mt-1 text-sm ${tone.text}`}>{p.of}</p>
                    <p className="caption mt-2 leading-snug">{p.note}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>

          <p className="mono-data mt-8 text-center text-sm leading-relaxed text-text-hi">
            Kinjy revenue <span className="text-gold-soft">→</span> sponsor{' '}
            <span className="text-gold-soft">20%</span> <span className="text-gold-soft">+</span> Kinjy Leaders{' '}
            <span className="text-sky">5%</span>
          </p>
          <p className="caption mt-3 text-center">
            There is no second level. Nobody above your sponsor is paid on anything you do, and the seller’s $100 is
            never touched.
          </p>
        </CloudCard>
      </div>
    </section>
  )
}
