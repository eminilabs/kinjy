import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EASE, useReducedMotion } from './motion-utils'

/** Word-level kinetic headline — each word rises inside an overflow mask (design §3). */
export function KineticWords({
  words,
  className,
  delay = 0.35,
  as: Tag = 'h1',
  ariaLabel,
}: {
  words: { text: string; gold?: boolean }[]
  className?: string
  delay?: number
  as?: 'h1' | 'h2' | 'h3'
  ariaLabel: string
}) {
  const reduced = useReducedMotion()
  return (
    <Tag className={className} aria-label={ariaLabel}>
      {/* Padding, not a space character — see components/home/Hero.tsx: a
          trailing " " inside an inline-block is collapsed and the words run
          together. */}
      {words.map((w, i) => (
        <span
          key={`${w.text}-${i}`}
          className="inline-block overflow-hidden pb-1 align-bottom pe-[0.24em] last:pe-0"
        >
          <motion.span
            className={cn('inline-block', w.gold && 'font-display italic text-gold-grad')}
            initial={reduced ? false : { y: '110%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: delay + i * 0.08, duration: 0.85, ease: EASE }}
          >
            {w.text}
          </motion.span>
        </span>
      ))}
    </Tag>
  )
}
