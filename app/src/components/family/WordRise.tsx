import { motion, useReducedMotion } from 'framer-motion'

const cloudEase = [0.22, 1, 0.36, 1] as [number, number, number, number]

/**
 * WordRise — headline words rise from behind an overflow mask,
 * staggered. Used on paper/heritage heroes (design §3 kinetic splits).
 */
export default function WordRise({
  text,
  className,
  rise = 40,
  stagger = 0.08,
  delay = 0,
  as: Tag = 'span',
}: {
  text: string
  className?: string
  rise?: number
  stagger?: number
  delay?: number
  as?: 'span' | 'h1' | 'h2'
}) {
  const reduced = useReducedMotion()
  const words = text.split(' ')
  const MotionTag = motion[Tag]
  return (
    <MotionTag className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] -mb-[0.08em] align-bottom pe-[0.24em] last:pe-0" aria-hidden="true">
          <motion.span
            className="inline-block"
            initial={reduced ? false : { y: rise, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: delay + i * stagger, duration: 0.7, ease: cloudEase }}
          >
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  )
}
