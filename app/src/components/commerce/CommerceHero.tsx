import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import { ArcButton } from '@/components/ui-kit'
import { KineticWords } from '@/components/creators/Kinetic'
import { EASE, useReducedMotion } from '@/components/creators/motion-utils'

const PRICE_TAGS = [
  { label: 'Woven basket', price: '$24', x: '8%', y: '18%', delay: 0 },
  { label: 'Coffee beans', price: '$18', x: '62%', y: '8%', delay: 0.6 },
  { label: 'Spice box', price: '$12', x: '38%', y: '58%', delay: 1.2 },
]

/** Section 1 — Commerce hero with bobbing glass price tags. */
export default function CommerceHero() {
  const reduced = useReducedMotion()
  const navigate = useNavigate()

  return (
    <section className="noise-overlay twilight-field relative -mt-[72px] flex min-h-[85dvh] items-center overflow-hidden px-6 pb-20 pt-[72px]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center opacity-[0.42]"
        style={{ backgroundImage: 'url(/marketplace-hero.jpg)' }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 75% 80%, rgba(217,166,72,0.12), transparent 55%), radial-gradient(ellipse at 30% 20%, rgba(46,42,110,0.85) 0%, rgba(11,14,29,0.92) 62%)',
        }}
      />

      {/* floating price tags — bob ±8px, staggered sine */}
      {!reduced &&
        PRICE_TAGS.map((t) => (
          <motion.div
            key={t.label}
            aria-hidden="true"
            className="cloud-card absolute hidden px-4 py-2.5 md:block"
            style={{ left: t.x, top: t.y }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: [0, -8, 0, 8, 0] }}
            transition={{
              opacity: { delay: 1 + t.delay * 0.3, duration: 0.6 },
              y: { delay: 1 + t.delay * 0.3, duration: 6, repeat: Infinity, ease: 'easeInOut', times: [0, 0.25, 0.5, 0.75, 1] },
            }}
          >
            <p className="text-[0.7rem] font-medium text-text-mid">{t.label}</p>
            <p className="mono-data text-sm font-semibold text-gold-soft">{t.price}</p>
          </motion.div>
        ))}

      <div className="relative mx-auto w-full max-w-container">
        <motion.p
          className="eyebrow text-gold"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          Modules K + L — Commerce
        </motion.p>
        <KineticWords
          className="display-lg mt-5 max-w-3xl"
          ariaLabel="A global marketplace with honest math."
          words={[
            { text: 'A' },
            { text: 'global' },
            { text: 'marketplace' },
            { text: 'with' },
            { text: 'honest', gold: true },
            { text: 'math.', gold: true },
          ]}
        />
        <motion.p
          className="body-lg mt-6 max-w-xl text-text-mid"
          initial={reduced ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.7, ease: EASE }}
        >
          Buy and sell anywhere on Earth — and advertise with floor prices so competitive, any
          business can start today.
        </motion.p>
        <motion.div
          className="mt-9 flex flex-wrap gap-3"
          initial={reduced ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6, ease: EASE }}
        >
          <ArcButton onClick={() => navigate('/app')}>Open the Marketplace</ArcButton>
          <a href="#ad-engine">
            <ArcButton variant="ghost">
              Build an ad campaign <ArrowDown size={16} aria-hidden="true" />
            </ArcButton>
          </a>
        </motion.div>
      </div>
    </section>
  )
}
