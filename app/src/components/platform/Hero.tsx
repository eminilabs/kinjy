import { Link } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import { MODULES } from './data'
import { KineticWords, ModuleGlyph, SNAP_EASE } from './shared'
import { spelled } from '@/lib/features'
import { MODULE_TONES } from './tones'
import { cn } from '@/lib/utils'

/**
 * Section 1 — Page hero, on the landing's split: the headline on the left, and
 * on the right every module as a pastel tile that jumps to its detail.
 */
export default function PlatformHero() {
  const reduced = useReducedMotion()
  return (
    <header className="kl-split kl-pad-x gap-[clamp(40px,6vw,96px)] pb-24 pt-14">
      <div>
        <motion.p
          className="kl-mono text-xs tracking-[.14em] text-[var(--kl-gold-deep)]"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          THE OPERATING SYSTEM
        </motion.p>
        <KineticWords
          as="h1"
          text={`${spelled(MODULES.length)} modules. One interconnected society.`}
          className="kl-serif mt-6 block text-[clamp(38px,6.4vw,92px)] font-semibold leading-[0.98] tracking-[-0.02em]"
          delay={0.2}
        />
        <motion.p
          className="mt-8 max-w-[480px] text-[19px] leading-[1.55] text-[var(--kl-mid)]"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
        >
          Every module is a first-class citizen — each one aware of your language, your algorithm
          choices, your circles and your AI agents. Explore them all.
        </motion.p>
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <Link
            to="/app"
            className="kl-sheen inline-flex items-center gap-[18px] rounded-[20px] py-[7px] pe-[7px] ps-[30px] text-[17px] font-semibold shadow-[0_14px_30px_-12px_rgba(169,118,28,.55)] transition-transform hover:-translate-y-0.5"
          >
            Open the app demo
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-xl text-[var(--kl-night)]" aria-hidden="true">→</span>
          </Link>
          <a href="#map" className="rounded-[20px] border border-[var(--kl-paper-2)] px-6 py-4 font-semibold transition-colors hover:border-[var(--kl-gold)] hover:text-[var(--kl-gold-deep)]">
            See the map
          </a>
        </div>
      </div>

      {/* Every module, one tap from its detail */}
      <nav aria-label="Jump to module" className="relative">
        <div aria-hidden="true" className="absolute right-0 -top-10 h-[260px] w-[260px] rounded-full bg-[var(--kl-sky)] opacity-30 blur-[80px]" />
        <div aria-hidden="true" className="kl-sheen absolute -bottom-12 left-0 h-[220px] w-[220px] rounded-full opacity-25 blur-[80px]" />
        <ul className="relative grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {MODULES.map((m, i) => {
            const [ink, tile] = MODULE_TONES[i % MODULE_TONES.length]
            return (
              <motion.li
                key={m.letter}
                // The count follows the feature switches; the last tile takes the
                // rest of its row so the mosaic never ends on an orphan.
                className={
                  i === MODULES.length - 1
                    ? cn(MODULES.length % 2 === 1 && 'col-span-2 sm:col-span-1', MODULES.length % 3 === 1 && 'sm:col-span-3', MODULES.length % 3 === 2 && 'sm:col-span-2')
                    : undefined
                }
                initial={reduced ? false : { opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.42, ease: SNAP_EASE, delay: 0.3 + i * 0.04 }}
              >
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById(`module-${m.letter}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  aria-label={`Jump to module ${m.letter}: ${m.name}`}
                  className="group flex w-full items-center gap-3 rounded-2xl border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] p-3 text-start shadow-[0_16px_30px_-24px_var(--kl-shadow)] transition-[transform,border-color] hover:-translate-y-0.5 hover:border-[var(--kl-gold)]"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[10px]" style={{ background: tile, color: ink }}>
                    <ModuleGlyph id={m.glyph} size={20} className="!text-current transition-transform group-hover:scale-110" />
                  </span>
                  <span className="min-w-0 text-sm font-semibold leading-tight">{m.name}</span>
                </button>
              </motion.li>
            )
          })}
        </ul>
      </nav>
    </header>
  )
}
