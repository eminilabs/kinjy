import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowDown } from 'lucide-react'
import ArcButton from '@/components/ui-kit/ArcButton'
import HeroScene from './HeroScene'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const fn = () => setReduced(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return reduced
}

function KineticH1() {
  const words = [
    { text: 'One', gold: false },
    { text: 'world.', gold: false },
    { text: 'Every', gold: true },
    { text: 'connection.', gold: true },
  ]
  return (
    <h1 className="display-xl" aria-label="One world. Every connection.">
      {/* The gap between words is padding, not a space character. A trailing
          " " inside an inline-block is collapsed by CSS at the end of the box,
          so the heading rendered as "Oneworld." — the space was in the DOM and
          measured 0px wide. Padding cannot be collapsed. */}
      {words.map((w, i) => (
        <span
          key={w.text}
          className="inline-block overflow-hidden pb-1 align-bottom pe-[0.24em] last:pe-0"
        >
          <motion.span
            className={w.gold ? 'inline-block font-display italic text-gold-grad' : 'inline-block'}
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 + i * 0.09, duration: 0.9, ease: EASE }}
          >
            {w.text}
          </motion.span>
        </span>
      ))}
    </h1>
  )
}

/**
 * Section 1 — Hero: "The Living Network".
 * Full viewport, full-bleed (opts out of Layout's nav padding via -mt-[72px]).
 *
 * Deliberately holds one message: headline, one sentence, two actions. The
 * module list, the translation demo, the format morph and the family preview
 * each have their own section further down the page — showing them here too
 * made the first screen compete with itself.
 */
export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  // GSAP's pin wraps whatever it pins inside a .pin-spacer it inserts into the
  // DOM. If that were the <section>, React would later try to remove the
  // section from <main> — but GSAP moved it into the spacer, so removeChild
  // throws and the whole tree crashes on the first navigation. Pinning this
  // inner element keeps the <section> exactly where React put it.
  const pinRef = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()

  const scrollToModules = () => {
    document.getElementById('modules')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' })
  }

  return (
    <section ref={sectionRef} className="relative -mt-[72px] twilight-field" aria-label="The Living Network">
      <div ref={pinRef} className="relative flex min-h-[100svh] items-center overflow-hidden">
      {/* Background plate — dimmed to 35%, gradient-masked into ink */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage: 'url(/hero-poster.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.35,
          maskImage: 'linear-gradient(to bottom, black 55%, transparent 98%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 55%, transparent 98%)',
        }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-b from-ink/40 via-transparent to-ink" />

      {reduced ? (
        <img
          src="/hero-fallback.svg"
          alt="The Living Network — a dotted globe with golden arcs connecting people, formats and generations"
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
      ) : (
        <HeroScene sectionRef={sectionRef} pinRef={pinRef} />
      )}

      {/* Foreground copy */}
      <div id="hero-copy" className="relative z-20 mx-auto w-full max-w-container px-6 pt-[72px]">
        <div className="max-w-[560px]">
          <motion.p
            className="eyebrow text-gold"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7, ease: EASE }}
          >
            The Global Social Operating System
          </motion.p>
          <div className="mt-5">
            <KineticH1 />
          </div>
          <motion.p
            className="body-lg mt-6 text-text-mid"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.5, ease: EASE }}
          >
            Fifteen modules, one society — in every language you speak.
          </motion.p>
          <motion.div
            className="mt-8 flex flex-wrap items-center gap-3"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.12, duration: 0.5, ease: EASE }}
          >
            <ArcButton size="lg" onClick={() => (window.location.href = '/pricing')}>
              Join Kinjy
            </ArcButton>
            <ArcButton variant="ghost" size="lg" onClick={scrollToModules}>
              Explore the platform <ArrowDown size={16} aria-hidden="true" />
            </ArcButton>
          </motion.div>
        </div>
      </div>

      {/* Scroll cue */}
      <motion.button
        type="button"
        onClick={scrollToModules}
        className="absolute bottom-6 left-1/2 z-20 -translate-x-1/2 text-text-low hover:text-gold-soft transition-colors"
        aria-label="Scroll to explore"
        animate={reduced ? undefined : { y: [0, 8, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <ArrowDown size={20} />
      </motion.button>
      </div>
    </section>
  )
}
