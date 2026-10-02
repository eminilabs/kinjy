import confetti from 'canvas-confetti'
import { motion } from 'framer-motion'
import { Award, BookOpen, HeartHandshake, MapPin, TreePine, Users } from 'lucide-react'
import { EASE, useReducedMotion } from './motion-utils'
import { Eyebrow, Stage } from '@/components/landing/PageKit'

const BADGES = [
  { icon: HeartHandshake, name: 'Helpful Contributor', criterion: 'Consistently upvoted answers in forums & notes' },
  { icon: BookOpen, name: 'Expert', criterion: 'Demonstrated depth in a verified topic area' },
  { icon: Users, name: 'Community Builder', criterion: 'Grew a healthy, moderated community' },
  { icon: Award, name: 'Verified Creator', criterion: 'Original work, provenance-labeled, KYC verified' },
  { icon: TreePine, name: 'Family Historian', criterion: 'Documented & verified generations of heritage' },
  { icon: MapPin, name: 'Local Expert', criterion: 'Trusted knowledge of a place, confirmed by locals' },
]

const sessionFlags = { badgeConfetti: false } // once per session (module scope)

/** Section 7 — gamification badges: gold-foil medallions with a sheen sweep, on a stage. */
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
    <section className="mx-auto max-w-[1320px] px-4 py-[clamp(24px,4vw,48px)]">
      <Stage className="kl-pad-x py-[clamp(56px,8vw,100px)]" glows={['#D9A648', 'var(--kl-coral)']}>
        <div className="text-center">
          <Eyebrow>Badges</Eyebrow>
          <h2 className="kl-h2 mx-auto mt-5 max-w-[760px]">Recognition for quality, not volume.</h2>
          <p className="mx-auto mt-5 max-w-xl text-[17px] text-[var(--kl-mid)]">
            Badges are earned by being genuinely useful — never by posting more.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-6">
          {BADGES.map((b, i) => (
            <motion.div
              key={b.name}
              initial={reduced ? false : { rotateY: 90, opacity: 0 }}
              whileInView={{ rotateY: 0, opacity: 1 }}
              viewport={{ once: true, margin: '-15%' }}
              transition={{ delay: i * 0.1, duration: 0.55, ease: EASE }}
              whileHover={reduced ? undefined : { y: -6 }}
              onHoverStart={b.name === 'Verified Creator' ? onVerifiedHover : undefined}
              className="group text-center"
            >
              <span
                className="relative mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full shadow-[0_18px_30px_-16px_rgba(169,118,28,.7)] ring-4 ring-[var(--kl-surface)]"
                style={{ background: 'radial-gradient(circle at 32% 28%, #F0C878 0%, #D9A648 55%, #8a6a25 100%)' }}
              >
                {/* foil sheen sweep */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                />
                <b.icon size={30} className="relative text-[#241F16]" aria-hidden="true" />
              </span>
              <h3 className="kl-serif mt-5 text-lg font-semibold leading-tight">{b.name}</h3>
              <p className="mx-auto mt-2 max-w-[180px] text-[13px] leading-snug text-[var(--kl-mid)]">{b.criterion}</p>
            </motion.div>
          ))}
        </div>
      </Stage>
    </section>
  )
}
