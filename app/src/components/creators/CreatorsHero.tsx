import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowDown, Clapperboard, FileText, Mic, Newspaper, Sparkles } from 'lucide-react'
import { KineticWords } from '@/components/platform/shared'
import { Eyebrow, Stage } from '@/components/landing/PageKit'
import { MODULE_TONES } from '@/components/platform/tones'
import { EASE, useReducedMotion } from './motion-utils'

const FORMAT_CARDS = [
  { icon: FileText, label: 'Article', meta: '612 words · EN', rotate: -8, x: -158, y: -36 },
  { icon: Clapperboard, label: 'Video', meta: '9:16 · 0:42', rotate: -3, x: -56, y: -100 },
  { icon: Mic, label: 'Audio', meta: 'Waveform · 12:08', rotate: 3, x: 56, y: -100 },
  { icon: Newspaper, label: 'Newsletter', meta: 'Fri 9:00 EAT', rotate: 8, x: 158, y: -36 },
]

/** Section 1 — the landing's split: the promise, and one idea fanning out into four formats. */
export default function CreatorsHero() {
  const reduced = useReducedMotion()
  const rise = (delay: number) =>
    reduced ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay, ease: EASE } }

  return (
    <header className="kl-split kl-pad-x gap-[clamp(40px,6vw,96px)] pb-24 pt-14">
      <div className="min-w-0">
        <motion.div {...rise(0.1)}>
          <Eyebrow>Module G · Creator Studio</Eyebrow>
        </motion.div>
        <KineticWords
          as="h1"
          text="Create once. Earn everywhere."
          className="kl-serif mt-6 block text-[clamp(44px,6.6vw,96px)] font-semibold leading-[0.96] tracking-[-0.02em]"
          delay={0.2}
        />
        <motion.p className="mt-8 max-w-[480px] text-[19px] leading-[1.55] text-[var(--kl-mid)]" {...rise(0.45)}>
          An AI copilot that turns one idea into every format and every language — plugged into the
          fairest revenue splits on the internet.
        </motion.p>
        <motion.div className="mt-10 flex flex-wrap items-center gap-4" {...rise(0.6)}>
          <Link
            to="/app"
            className="kl-sheen inline-flex items-center gap-[18px] rounded-[20px] py-[7px] pe-[7px] ps-[30px] text-[17px] font-semibold shadow-[0_14px_30px_-12px_rgba(169,118,28,.55)] transition-transform hover:-translate-y-0.5"
          >
            Open Creator Studio
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-xl text-[var(--kl-night)]" aria-hidden="true">→</span>
          </Link>
          <a
            href="#splits"
            className="inline-flex items-center gap-2 rounded-[20px] border border-[var(--kl-paper-2)] px-6 py-4 font-semibold transition-colors hover:border-[var(--kl-gold)] hover:text-[var(--kl-gold-deep)]"
          >
            See the splits <ArrowDown size={16} aria-hidden="true" />
          </a>
        </motion.div>
        <motion.dl className="mt-14 flex max-w-[480px] divide-x divide-[var(--kl-paper-2)] border-t border-[var(--kl-paper-2)] pt-6" {...rise(0.75)}>
          {[
            { n: '1', label: 'idea in' },
            { n: '7', label: 'formats out' },
            { n: '40%', label: 'ad revenue to you' },
          ].map((s) => (
            <div key={s.label} className="flex-1 px-4 first:ps-0">
              <dt className="sr-only">{s.label}</dt>
              <dd className="kl-serif text-[40px] font-semibold leading-none">{s.n}</dd>
              <dd className="kl-mono mt-2 text-[11px] uppercase tracking-[.12em] text-[var(--kl-low)]">{s.label}</dd>
            </div>
          ))}
        </motion.dl>
      </div>

      {/* One idea at the bottom, four formats fanned above it, joined by arcs */}
      <Stage className="min-w-0" glows={['var(--kl-coral)', 'var(--kl-sky)']}>
        <div className="relative mx-auto h-[440px] w-full max-w-[520px] max-sm:-my-12 max-sm:scale-[0.7]" aria-hidden="true">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 520 440" fill="none" preserveAspectRatio="xMidYMid meet">
            {['M260 350 Q 140 320 102 228', 'M260 350 Q 214 270 204 164', 'M260 350 Q 306 270 316 164', 'M260 350 Q 380 320 418 228'].map((d, i) => (
              <motion.path
                key={d}
                d={d}
                stroke="url(#creatorArcGrad)"
                strokeWidth="1.6"
                strokeDasharray="4 5"
                strokeLinecap="round"
                initial={reduced ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.9 + i * 0.15, duration: 0.8, ease: [0.65, 0, 0.35, 1] }}
              />
            ))}
            <defs>
              <linearGradient id="creatorArcGrad" x1="0" y1="0" x2="520" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#F0C878" />
                <stop offset="0.55" stopColor="#D9A648" />
                <stop offset="1" stopColor="#8FB8E8" />
              </linearGradient>
            </defs>
          </svg>

          {/* the idea */}
          <div className="absolute inset-x-0 bottom-10 flex justify-center">
          <motion.div
            className="w-[230px] rounded-2xl bg-[var(--kl-surface)] p-4 text-center shadow-[0_24px_48px_-28px_var(--kl-shadow)]"
            initial={reduced ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5, ease: EASE }}
          >
            <span className="kl-sheen inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold">
              <Sparkles size={11} /> one idea
            </span>
            <p className="kl-serif mt-2.5 text-lg italic leading-snug">“Sunrise over Msasani Bay”</p>
          </motion.div>
          </div>

          {FORMAT_CARDS.map((c, i) => {
            const [ink, tile] = MODULE_TONES[i % MODULE_TONES.length]
            return (
              <motion.div
                key={c.label}
                className="absolute left-1/2 top-[44%] w-[136px] rounded-2xl bg-[var(--kl-surface)] p-3.5 shadow-[0_20px_40px_-26px_var(--kl-shadow)]"
                initial={reduced ? false : { x: '-50%', y: '60%', rotate: 0, opacity: 0, scale: 0.7 }}
                animate={{ x: `calc(-50% + ${c.x}px)`, y: `calc(-50% + ${c.y}px)`, rotate: c.rotate, opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.12, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <span className="grid h-9 w-9 place-items-center rounded-[10px]" style={{ background: tile, color: ink }}>
                  <c.icon size={18} />
                </span>
                <p className="mt-2.5 text-sm font-semibold">{c.label}</p>
                <p className="kl-mono mt-0.5 text-[10.5px] text-[var(--kl-low)]">{c.meta}</p>
              </motion.div>
            )
          })}
        </div>
      </Stage>
    </header>
  )
}
