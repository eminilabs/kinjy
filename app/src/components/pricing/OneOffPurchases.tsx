import { motion } from 'framer-motion'
import { Clapperboard, Languages, Mail, Palette, Sparkles } from 'lucide-react'
import { useReducedMotion } from '@/components/creators/motion-utils'

const PACKS = [
  { icon: Clapperboard, name: 'HD pack', price: '$8', math: 'Basic $3.99/mo unit ≈ $2 → 4× once, HD forever' },
  { icon: Languages, name: 'Translation pack', price: '$12', math: 'Advanced translation unit ≈ $3 → 4× one-off' },
  { icon: Sparkles, name: 'AI credit bundle', price: '$6', math: 'Credit unit ≈ $2 → 3× one-off top-up' },
  { icon: Mail, name: 'Newsletter unlock', price: '$10', math: 'Publishing unit ≈ $2.5 → 4× one-off' },
  { icon: Palette, name: 'Brand kit', price: '$15', math: 'Premium unit ≈ $4 → ~4× one-off' },
]

/** Section 3 — One-off purchases at 2–4× implied subscription unit cost. */
export default function OneOffPurchases() {
  const reduced = useReducedMotion()
  return (
    <section className="noise-overlay bg-ink px-6 py-24 md:py-32">
      <div className="mx-auto max-w-container">
        <div className="cloud-card mx-auto max-w-4xl p-8 text-center md:p-12">
          <h2 className="h3">Prefer à la carte?</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-text-mid">
            One-off purchases are priced fairly at{' '}
            <span className="mono-data text-gold-soft">2–4× the implied subscription unit cost</span> —
            buy a feature forever instead of subscribing.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {PACKS.map((p, i) => (
              <motion.div
                key={p.name}
                initial={reduced ? false : { opacity: 0, scale: 0.7 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-15%' }}
                transition={{ delay: i * 0.06, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                className="group relative"
              >
                <div className="flex cursor-default items-center gap-2.5 rounded-full cloud-glass px-4 py-2.5 transition-colors duration-200 hover:border-gold/40">
                  <p.icon size={15} className="text-gold" aria-hidden="true" />
                  <span className="text-sm font-semibold text-text-hi">{p.name}</span>
                  <span className="mono-data rounded-full bg-gold/15 px-2 py-0.5 text-[0.7rem] text-gold-soft">{p.price}</span>
                </div>
                {/* unit-cost math tooltip */}
                <span className="mono-data pointer-events-none absolute -top-2 left-1/2 z-10 w-64 -translate-x-1/2 -translate-y-full rounded-card-sm border border-white/10 bg-ink-2/95 px-3 py-2 text-[0.65rem] leading-snug text-gold-soft opacity-0 shadow-cloud backdrop-blur-md transition-opacity duration-200 group-hover:opacity-100">
                  {p.math}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
