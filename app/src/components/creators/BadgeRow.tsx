import confetti from 'canvas-confetti'
import { motion } from 'framer-motion'
import { Award, BookOpen, HeartHandshake, MapPin, TreePine, Users } from 'lucide-react'
import { EASE, useReducedMotion } from './motion-utils'

const BADGES = [
  { icon: HeartHandshake, name: 'Helpful Contributor', criterion: 'Consistently upvoted answers in forums & notes' },
  { icon: BookOpen, name: 'Expert', criterion: 'Demonstrated depth in a verified topic area' },
  { icon: Users, name: 'Community Builder', criterion: 'Grew a healthy, moderated community' },
  { icon: Award, name: 'Verified Creator', criterion: 'Original work, provenance-labeled, KYC verified' },
  { icon: TreePine, name: 'Family Historian', criterion: 'Documented & verified generations of heritage' },
  { icon: MapPin, name: 'Local Expert', criterion: 'Trusted knowledge of a place, confirmed by locals' },
]

const sessionFlags = { badgeConfetti: false } // once per session (module scope)

/** Section 7 — Gamification badges (refinement #19): gold-foil medallions with sheen sweep. */
export default function BadgeRow() {
  const reduced = useReducedMotion()

  const onVerifiedHover = () => {
    if (!sessionFlags.badgeConfetti && !reduced) {
      sessionFlags.badgeConfetti = true
      confetti({
        particleCount: 30,
        spread: 50,
        scalar: 0.7,
        colors: ['#F0C878', '#D9A648'],
        origin: { y: 0.75 },
      })
    }
  }

  return (
    <section className="noise-overlay twilight-field px-6 py-24 md:py-32">
      <div className="mx-auto max-w-container">
        <p className="eyebrow text-center text-gold">Refinement #19</p>
        <h2 className="h2 mt-4 text-center">Recognition for quality, not volume.</h2>
        <p className="body-lg mx-auto mt-4 max-w-xl text-center text-text-mid">
          Badges are earned by being genuinely useful — never by posting more.
        </p>

        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {BADGES.map((b, i) => (
            <motion.div
              key={b.name}
              initial={reduced ? false : { rotateY: 90, opacity: 0 }}
              whileInView={{ rotateY: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={{ delay: i * 0.1, duration: 0.55, ease: EASE }}
              whileHover={reduced ? undefined : { rotateX: -6, rotateY: 6, y: -6 }}
              onHoverStart={b.name === 'Verified Creator' ? onVerifiedHover : undefined}
              className="cloud-card group relative overflow-hidden p-5 text-center [perspective:600px]"
              style={{ transformStyle: 'preserve-3d' }}
            >
              {/* foil sheen sweep */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gold-soft/25 to-transparent transition-transform duration-700 ease-cloud-ease group-hover:translate-x-full"
              />
              <span
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gold/50"
                style={{ background: 'radial-gradient(circle at 32% 28%, #F0C878 0%, #D9A648 55%, #8a6a25 100%)' }}
              >
                <b.icon size={26} className="text-ink" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-sm font-bold text-gold-soft">{b.name}</h3>
              <p className="caption mt-2">{b.criterion}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
