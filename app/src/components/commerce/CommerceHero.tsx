import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowDown, Coffee, ShoppingBasket, UtensilsCrossed } from 'lucide-react'
import { Eyebrow, Stage } from '@/components/landing/PageKit'
import { KL_BTN_GHOST, KL_BTN_GOLD } from '@/components/landing/kl-classes'
import { MODULE_TONES } from '@/components/platform/tones'
import { KineticWords } from '@/components/platform/shared'
import { EASE, useReducedMotion } from '@/components/creators/motion-utils'

const PRICE_TAGS = [
  { icon: ShoppingBasket, label: 'Woven basket', price: '$24', meta: 'Arusha, TZ', x: -120, y: -128, rotate: -5 },
  { icon: Coffee, label: 'Coffee beans', price: '$18', meta: 'Moshi, TZ', x: 100, y: -34, rotate: 4 },
  { icon: UtensilsCrossed, label: 'Spice box', price: '$12', meta: 'Stone Town, TZ', x: -80, y: 78, rotate: -3 },
]

/** Section 1 — the landing's split: the promise, and three listings floating on a stage. */
export default function CommerceHero() {
  const reduced = useReducedMotion()
  const rise = (delay: number) =>
    reduced ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay, ease: EASE } }

  return (
    <header className="kl-split kl-pad-x gap-[clamp(40px,6vw,96px)] pb-24 pt-14">
      <div className="min-w-0">
        <motion.div {...rise(0.1)}>
          <Eyebrow>Modules K + L — Commerce</Eyebrow>
        </motion.div>
        <KineticWords
          as="h1"
          text="A global marketplace with honest math."
          className="kl-serif mt-6 block text-[clamp(44px,6.6vw,96px)] font-semibold leading-[0.96] tracking-[-0.02em]"
          delay={0.2}
        />
        <motion.p className="mt-8 max-w-[480px] text-[19px] leading-[1.55] text-[var(--kl-mid)]" {...rise(0.45)}>
          Buy and sell anywhere on Earth — and advertise with floor prices so competitive, any business can
          start today.
        </motion.p>
        <motion.div className="mt-10 flex flex-wrap items-center gap-4" {...rise(0.6)}>
          <Link to="/app" className={KL_BTN_GOLD}>
            Open the Marketplace
          </Link>
          <a href="#ad-engine" className={KL_BTN_GHOST}>
            Build an ad campaign <ArrowDown size={16} aria-hidden="true" />
          </a>
        </motion.div>
      </div>

      <Stage className="min-w-0" glows={['var(--kl-gold)', 'var(--kl-sky)']}>
        <div className="relative mx-auto h-[420px] w-full max-w-[520px]" aria-hidden="true">
          {PRICE_TAGS.map((t, i) => {
            const [ink, tile] = MODULE_TONES[i % MODULE_TONES.length]
            return (
              <motion.div
                key={t.label}
                className="absolute left-1/2 top-1/2 w-[210px] rounded-2xl bg-[var(--kl-surface)] p-4 shadow-[0_24px_48px_-28px_var(--kl-shadow)]"
                initial={reduced ? false : { opacity: 0, y: 24 }}
                animate={
                  reduced
                    ? { opacity: 1, x: `calc(-50% + ${t.x}px)`, y: `calc(-50% + ${t.y}px)`, rotate: t.rotate }
                    : { opacity: 1, x: `calc(-50% + ${t.x}px)`, y: [`calc(-50% + ${t.y}px)`, `calc(-50% + ${t.y - 8}px)`, `calc(-50% + ${t.y}px)`], rotate: t.rotate }
                }
                transition={{ opacity: { delay: 0.4 + i * 0.15, duration: 0.5 }, y: { delay: 0.9 + i * 0.3, duration: 6, repeat: Infinity, ease: 'easeInOut' } }}
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[12px]" style={{ background: tile, color: ink }}>
                    <t.icon size={20} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{t.label}</p>
                    <p className="kl-mono text-[10.5px] text-[var(--kl-low)]">{t.meta}</p>
                  </div>
                </div>
                <p className="kl-mono mt-3 text-xl font-semibold text-[var(--kl-gold-deep)]">{t.price}</p>
              </motion.div>
            )
          })}
        </div>
      </Stage>
    </header>
  )
}
