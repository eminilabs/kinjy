import { useRef } from 'react'
import { useNavigate } from 'react-router'
import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowDown, Clapperboard, FileText, Mic, Newspaper } from 'lucide-react'
import { ArcButton } from '@/components/ui-kit'
import { KineticWords } from './Kinetic'
import { EASE, useReducedMotion } from './motion-utils'

const FORMAT_CARDS = [
  { icon: FileText, label: 'Article', meta: '612 words · EN', rotate: -7, x: -150, y: -30 },
  { icon: Clapperboard, label: 'Video', meta: '9:16 · 0:42', rotate: -2, x: -52, y: -88 },
  { icon: Mic, label: 'Audio', meta: 'Waveform · 12:08', rotate: 3, x: 52, y: -88 },
  { icon: Newspaper, label: 'Newsletter', meta: 'Fri 9:00 EAT', rotate: 8, x: 150, y: -30 },
]

/** Section 1 — Creators hero: fanned format stack connected by arcs to one origin point. */
export default function CreatorsHero() {
  const reduced = useReducedMotion()
  const rootRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: rootRef, offset: ['start start', 'end start'] })
  const stackY = useTransform(scrollYProgress, [0, 1], [0, -60])
  const navigate = useNavigate()

  return (
    <section
      ref={rootRef}
      className="noise-overlay twilight-field relative -mt-[72px] flex min-h-[90dvh] items-center overflow-hidden px-6 pb-20 pt-[72px]"
    >
      {/* background photo at 40% under twilight veil */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center opacity-40"
        style={{ backgroundImage: 'url(/creator-studio.jpg)' }}
      />
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 75% 80%, rgba(217,166,72,0.10), transparent 55%), radial-gradient(ellipse at 30% 20%, rgba(46,42,110,0.85) 0%, rgba(11,14,29,0.92) 62%)',
        }}
      />

      <div className="relative mx-auto grid w-full max-w-container items-center gap-14 lg:grid-cols-2">
        {/* Copy column */}
        <div>
          <motion.p
            className="eyebrow text-coral"
            initial={reduced ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            Module G — Creator Studio
          </motion.p>
          <KineticWords
            className="display-lg mt-5"
            ariaLabel="Create once. Earn everywhere."
            words={[
              { text: 'Create' },
              { text: 'once.' },
              { text: 'Earn', gold: true },
              { text: 'everywhere.', gold: true },
            ]}
          />
          <motion.p
            className="body-lg mt-6 max-w-lg text-text-mid"
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7, ease: EASE }}
          >
            An AI copilot that turns one idea into every format and every language — plugged into the
            fairest revenue splits on the internet.
          </motion.p>
          <motion.div
            className="mt-9 flex flex-wrap gap-3"
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85, duration: 0.6, ease: EASE }}
          >
            <ArcButton onClick={() => navigate('/app')}>Open Creator Studio</ArcButton>
            <a href="#splits">
              <ArcButton variant="ghost">
                See the splits <ArrowDown size={16} aria-hidden="true" />
              </ArcButton>
            </a>
          </motion.div>
        </div>

        {/* Format stack — fanned glass cards with arcs to a single origin */}
        <motion.div
          style={reduced ? undefined : { y: stackY }}
          className="relative mx-auto hidden h-[380px] w-full max-w-[480px] sm:block"
          aria-hidden="true"
        >
          {/* arcs from origin to each card */}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 480 380" fill="none">
            {[
              'M240 340 Q 120 300 90 210',
              'M240 340 Q 190 250 188 150',
              'M240 340 Q 290 250 292 150',
              'M240 340 Q 360 300 390 210',
            ].map((d, i) => (
              <motion.path
                key={d}
                d={d}
                stroke="url(#creatorArcGrad)"
                strokeWidth="1.6"
                strokeLinecap="round"
                initial={reduced ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ delay: 0.9 + i * 0.15, duration: 0.8, ease: [0.65, 0, 0.35, 1] }}
              />
            ))}
            <defs>
              <linearGradient id="creatorArcGrad" x1="0" y1="0" x2="480" y2="0" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="#F0C878" />
                <stop offset="0.55" stopColor="#D9A648" />
                <stop offset="1" stopColor="#8FB8E8" />
              </linearGradient>
            </defs>
          </svg>
          {/* origin point */}
          <motion.span
            className="absolute bottom-8 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full"
            style={{ background: 'var(--grad-gold-sheen)', boxShadow: '0 0 24px rgba(217,166,72,0.8)' }}
            initial={reduced ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.75, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
          />
          {FORMAT_CARDS.map((c, i) => (
            <motion.div
              key={c.label}
              className="cloud-card absolute left-1/2 top-1/2 w-40 p-4"
              initial={reduced ? false : { x: '-50%', y: '60%', rotate: 0, opacity: 0, scale: 0.7 }}
              animate={{ x: `calc(-50% + ${c.x}px)`, y: `calc(-50% + ${c.y}px)`, rotate: c.rotate, opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.12, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <c.icon size={20} className="text-gold" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-text-hi">{c.label}</p>
              <p className="mono-data mt-1 text-[0.68rem] text-text-low">{c.meta}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
