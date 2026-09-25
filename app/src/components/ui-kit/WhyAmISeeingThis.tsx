import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import ArcButton from './ArcButton'

export interface WhyAmISeeingThisProps {
  reasons?: string[]
  onShowLess?: () => void
  onChangeAlgorithm?: () => void
  className?: string
  /** Render the popover permanently open (storytelling demos). */
  forceOpen?: boolean
}

/**
 * WhyAmISeeingThis — standard feed explainer popover: reason chips +
 * "Show less like this" / "Change my algorithm" actions.
 */
export default function WhyAmISeeingThis({
  reasons = ['Because you follow this creator', 'Popular in your region'],
  onShowLess,
  onChangeAlgorithm,
  className,
  forceOpen = false,
}: WhyAmISeeingThisProps) {
  const [open, setOpen] = useState(false)
  const isOpen = forceOpen || open

  return (
    <div className={cn('relative inline-block', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={isOpen}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-sky cloud-glass hover:border-sky/40 transition-colors"
      >
        <Sparkles size={13} aria-hidden="true" />
        Why am I seeing this?
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="absolute z-40 mt-2 w-72 rounded-card-md cloud-glass bg-ink-2/90 p-4 shadow-cloud"
            role="dialog"
            aria-label="Why you are seeing this post"
          >
            <p className="eyebrow text-gold mb-3">Why you&apos;re seeing this</p>
            <ul className="flex flex-wrap gap-2 mb-4">
              {reasons.map((r) => (
                <li key={r} className="rounded-full border border-sky/30 bg-sky/10 px-2.5 py-1 text-xs text-sky">
                  {r}
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <ArcButton variant="ghost" size="sm" onClick={onShowLess} className="flex-1 text-xs px-3 py-1.5">
                Show less like this
              </ArcButton>
              <ArcButton variant="indigo" size="sm" onClick={onChangeAlgorithm} className="flex-1 text-xs px-3 py-1.5">
                Change my algorithm
              </ArcButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
