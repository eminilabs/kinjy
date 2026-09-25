import { useRef } from 'react'
import { pinLength } from '@/lib/pinLength'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import { motion } from 'framer-motion'

gsap.registerPlugin(ScrollTrigger)

const HEADLINE = ["Safe", "is", "not", "a", "feature.", "It's", "the", "foundation."]

/**
 * SafetyHero — full-bleed 80vh hero. safety-hero.jpg at 40% under a twilight veil;
 * shield layers parallax ±20px on scroll (pinned 40vh); H1 words rise 0.08s stagger.
 */
export default function SafetyHero() {
  const scope = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (reduce) return
      gsap
        .timeline({
          scrollTrigger: {
            trigger: scope.current,
            start: 'top top',
            end: pinLength(0.4),
            scrub: 0.6,
            pin: true,
            pinSpacing: true,
          },
        })
        .fromTo('[data-hero-img]', { y: -20 }, { y: 20, ease: 'none' }, 0)
        .fromTo('[data-hero-col]', { y: 0 }, { y: -14, ease: 'none' }, 0)
    },
    { scope },
  )

  return (
    <section
      ref={scope}
      aria-label="Safety hero"
      className="relative -mt-[72px] flex min-h-[80dvh] items-center justify-center overflow-hidden"
    >
      {/* Shield image at 40% under twilight veil */}
      <div data-hero-img className="absolute inset-0 scale-110">
        <img
          src="/safety-hero.jpg"
          alt=""
          className="h-full w-full object-cover opacity-40"
          loading="eager"
        />
      </div>
      <div className="absolute inset-0 twilight-field opacity-80" aria-hidden="true" />
      <div
        className="absolute inset-0 bg-gradient-to-b from-ink/40 via-transparent to-ink"
        aria-hidden="true"
      />

      <div data-hero-col className="relative z-10 mx-auto max-w-4xl px-6 pt-24 text-center">
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="eyebrow text-gold"
        >
          Trust by design
        </motion.p>
        <h1 className="display-lg mt-5">
          {HEADLINE.map((word, i) => (
            <span key={i} className="inline-block overflow-hidden pb-1 align-bottom">
              <motion.span
                className="inline-block"
                initial={{ y: '110%' }}
                animate={{ y: 0 }}
                transition={{ duration: 0.8, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
              >
                {word}
                {i < HEADLINE.length - 1 ? ' ' : ''}
              </motion.span>
            </span>
          ))}
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="body-lg mx-auto mt-6 max-w-2xl text-text-mid"
        >
          Layered moderation, age-appropriate spaces, honest content labels, passkey
          security — and account controls that truly belong to you.
        </motion.p>
      </div>
    </section>
  )
}
