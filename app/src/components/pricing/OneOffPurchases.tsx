import { motion } from 'framer-motion'
import { Clapperboard, Languages, Mail, Palette, Sparkles } from 'lucide-react'
import { useReducedMotion } from '@/components/creators/motion-utils'
import { Eyebrow } from '@/components/landing/PageKit'
import { MODULE_TONES } from '@/components/platform/tones'

const PACKS = [
  { icon: Clapperboard, name: 'HD pack', price: '$8', math: 'Basic $3.99/mo unit ≈ $2 → 4× once, HD forever' },
  { icon: Languages, name: 'Translation pack', price: '$12', math: 'Advanced translation unit ≈ $3 → 4× one-off' },
  { icon: Sparkles, name: 'AI credit bundle', price: '$6', math: 'Credit unit ≈ $2 → 3× one-off top-up' },
  { icon: Mail, name: 'Newsletter unlock', price: '$10', math: 'Publishing unit ≈ $2.5 → 4× one-off' },
  { icon: Palette, name: 'Brand kit', price: '$15', math: 'Premium unit ≈ $4 → ~4× one-off' },
]

/** Section 3 — one-off purchases, set as a menu: each pack with its unit-cost maths in plain view. */
export default function OneOffPurchases() {
  const reduced = useReducedMotion()
  return (
    <section className="kl-pad-x border-t border-[var(--kl-paper-2)] py-[clamp(72px,9vw,120px)]">
      <div className="kl-split items-start gap-[clamp(40px,6vw,96px)]">
        <div className="min-w-0">
          <Eyebrow>À la carte</Eyebrow>
          <h2 className="kl-h2 mt-5">Prefer to buy once?</h2>
          <p className="kl-lead mt-6">
            One-off purchases are priced fairly at{' '}
            <span className="font-semibold text-[var(--kl-ink)]">2–4× the implied subscription unit cost</span> — buy a
            feature forever instead of subscribing.
          </p>
        </div>
        <ul className="min-w-0 border-t-2 border-[var(--kl-ink)]">
          {PACKS.map((p, i) => (
            <motion.li
              key={p.name}
              initial={reduced ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              className="flex items-center gap-4 border-b border-[var(--kl-paper-2)] py-5"
            >
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-[10px]"
                style={{ background: MODULE_TONES[i % 4][1], color: MODULE_TONES[i % 4][0] }}
              >
                <p.icon size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[17px] font-semibold">{p.name}</p>
                <p className="kl-mono mt-0.5 text-[11px] text-[var(--kl-low)]">{p.math}</p>
              </div>
              <span className="kl-serif text-[32px] font-semibold leading-none">{p.price}</span>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  )
}
