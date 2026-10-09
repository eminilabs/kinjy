import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import { KineticWords } from '@/components/platform/shared'
import { Eyebrow, Stage } from '@/components/landing/PageKit'

const EASE = [0.22, 1, 0.36, 1] as const

/** Four nested shields: each layer of protection drawn inside the last. */
const SHIELD = 'M130 18 L232 54 V128 C232 196 188 246 130 272 C72 246 28 196 28 128 V54 Z'
const LAYERS = [
  { scale: 1, label: 'Layered moderation' },
  { scale: 0.8, label: 'Age-appropriate spaces' },
  { scale: 0.6, label: 'Honest content labels' },
  { scale: 0.4, label: 'Passkeys' },
]

/**
 * SafetyHero — the landing's split: the promise on the left, and the layers of
 * protection drawn as nested shields on a stage.
 */
export default function SafetyHero() {
  const reduced = useReducedMotion()
  const rise = (delay: number) =>
    reduced ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay, ease: EASE } }

  return (
    <header aria-label="Safety hero" className="kl-split kl-pad-x gap-[clamp(40px,6vw,96px)] pb-24 pt-14">
      <div className="min-w-0">
        <motion.div {...rise(0.1)}>
          <Eyebrow>Trust by design</Eyebrow>
        </motion.div>
        <KineticWords
          as="h1"
          text="Safe is not a feature. It’s the foundation."
          className="kl-serif mt-6 block text-balance text-[clamp(44px,6.4vw,92px)] font-semibold leading-[0.98] tracking-[-0.02em]"
        />
        <motion.p className="mt-8 max-w-[500px] text-[19px] leading-[1.55] text-[var(--kl-mid)]" {...rise(0.45)}>
          Layered moderation, age-appropriate spaces, honest content labels, passkey security — and
          account controls that truly belong to you.
        </motion.p>
        <motion.div className="mt-10 flex flex-wrap items-center gap-4" {...rise(0.6)}>
          <a
            href="#layers-heading"
            className="kl-sheen inline-flex items-center gap-[18px] rounded-[20px] py-[7px] pe-[7px] ps-[30px] text-[17px] font-semibold shadow-[0_14px_30px_-12px_rgba(169,118,28,.55)] transition-transform hover:-translate-y-0.5"
          >
            See every layer
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-[var(--kl-night)]" aria-hidden="true">
              <ArrowDown size={18} />
            </span>
          </a>
          <a
            href="#deletion-heading"
            className="rounded-[20px] border border-[var(--kl-paper-2)] px-6 py-4 font-semibold transition-colors hover:border-[var(--kl-gold)] hover:text-[var(--kl-gold-deep)]"
          >
            Account controls
          </a>
        </motion.div>
      </div>

      <Stage className="min-w-0" glows={['var(--kl-sky)', '#D9A648']}>
        <div className="relative mx-auto flex h-[460px] max-w-[520px] items-center justify-center" aria-hidden="true">
          <svg viewBox="0 0 260 290" className="h-[340px] w-auto">
            <defs>
              <linearGradient id="safety-shield" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#F0C878" />
                <stop offset="0.55" stopColor="#D9A648" />
                <stop offset="1" stopColor="#8FB8E8" />
              </linearGradient>
            </defs>
            {LAYERS.map((l, i) => (
              <motion.path
                key={l.label}
                d={SHIELD}
                fill={i === LAYERS.length - 1 ? 'url(#safety-shield)' : 'var(--kl-surface)'}
                fillOpacity={i === LAYERS.length - 1 ? 0.9 : 0.55}
                stroke="url(#safety-shield)"
                strokeWidth={2 / l.scale}
                style={{ transformOrigin: '130px 150px', transformBox: 'view-box', scale: l.scale }}
                initial={reduced ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1, delay: 0.3 + i * 0.18, ease: EASE }}
              />
            ))}
          </svg>
          {LAYERS.map((l, i) => (
            <span
              key={l.label}
              className={`kl-glass ${reduced ? '' : 'kl-float'} absolute rounded-full px-3.5 py-1.5 text-[13px] font-semibold shadow-[0_16px_30px_-20px_var(--kl-shadow)]`}
              style={{
                ...[
                  { left: '4%', top: '16%' },
                  { right: '4%', top: '30%' },
                  { left: '6%', bottom: '24%' },
                  { right: '8%', bottom: '12%' },
                ][i],
                ['--kl-dur' as string]: `${6 + i}s`,
              }}
            >
              <span className="kl-mono me-1.5 text-[11px] text-[var(--kl-gold-deep)]">0{i + 1}</span>
              {l.label}
            </span>
          ))}
        </div>
      </Stage>
    </header>
  )
}
