import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

/** VerifiedBadge — gold seal with checkmark draw-in animation. */
export default function VerifiedBadge({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <span
      className={cn('inline-flex items-center justify-center rounded-full bg-gradient-to-br from-gold-soft to-gold', className)}
      style={{ width: size, height: size }}
      title="Verified"
      role="img"
      aria-label="Verified"
    >
      <svg viewBox="0 0 20 20" width={size * 0.62} height={size * 0.62} fill="none" aria-hidden="true">
        <motion.path
          d="M4.5 10.5l3.4 3.4L15.5 6"
          stroke="#0B0E1D"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
        />
      </svg>
    </span>
  )
}
