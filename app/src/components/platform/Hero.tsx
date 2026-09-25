import { memo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { MODULES } from './data'
import { KineticWords, ModuleGlyph, SNAP_EASE } from './shared'

/** Faint rotating ring of the 15 module glyphs behind the hero copy (5% opacity, 30s loop). */
const GlyphRing = memo(function GlyphRing() {
  const reduced = useReducedMotion()
  const R = 340
  return (
    <motion.div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.05]"
      style={{ width: R * 2 + 120, height: R * 2 + 120 }}
      animate={reduced ? undefined : { rotate: 360 }}
      transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
    >
      {MODULES.map((m, i) => {
        const a = (i / MODULES.length) * Math.PI * 2
        return (
          <span
            key={m.letter}
            className="absolute left-1/2 top-1/2"
            style={{ transform: `translate(-50%, -50%) rotate(${(a * 180) / Math.PI}deg) translateY(-${R}px)` }}
          >
            <ModuleGlyph id={m.glyph} size={44} />
          </span>
        )
      })}
    </motion.div>
  )
})

/** Section 1 — Page hero: eyebrow, kinetic H1, anchor nav of 15 glyph chips. */
export default function PlatformHero() {
  const scrollTo = (letter: string) => {
    document.getElementById(`module-${letter}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="twilight-field noise-overlay relative overflow-hidden px-6 pb-20 pt-24 md:pb-28 md:pt-32">
      <GlyphRing />
      <div className="relative mx-auto max-w-[760px] text-center">
        <motion.p
          className="eyebrow text-gold"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          The Operating System
        </motion.p>
        <KineticWords
          as="h1"
          text="Fifteen modules. One interconnected society."
          className="display-lg mt-5"
          delay={0.2}
        />
        <motion.p
          className="body-lg mx-auto mt-6 max-w-xl text-text-mid"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65 }}
        >
          Every module is a first-class citizen — each one aware of your language, your algorithm
          choices, your circles and your AI agents. Explore them all.
        </motion.p>

        {/* Anchor nav — 15 tiny glyph chips */}
        <nav aria-label="Jump to module" className="mt-10 flex flex-wrap justify-center gap-2">
          {MODULES.map((m, i) => (
            <motion.button
              key={m.letter}
              type="button"
              onClick={() => scrollTo(m.letter)}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.42, ease: SNAP_EASE, delay: 0.8 + i * 0.05 }}
              className="cloud-glass group flex h-11 w-11 items-center justify-center rounded-full transition-colors duration-200 hover:border-gold/50"
              title={`${m.letter} · ${m.name}`}
              aria-label={`Jump to module ${m.letter}: ${m.name}`}
            >
              <ModuleGlyph id={m.glyph} size={20} className="transition-transform duration-200 group-hover:scale-110" />
            </motion.button>
          ))}
        </nav>
      </div>
    </section>
  )
}
