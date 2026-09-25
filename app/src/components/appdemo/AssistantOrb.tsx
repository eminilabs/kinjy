import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAppTheme } from './theme'

export type OrbDock = 'feed' | 'create' | 'tree' | 'graveyard'

const CONTEXT_CHIPS: Record<OrbDock, string> = {
  feed: 'Ask me anything about your feed',
  create: 'Ask me to draft, translate or schedule',
  tree: 'Ask me how two people are related',
  graveyard: 'Ask me about tributes and memorials',
}

/**
 * AssistantOrb — the Kinjy Assistant, breathing conic orb that glides between
 * per-module anchor slots via a shared layoutId (420ms cloud-ease).
 */
export default function AssistantOrb({ dock, className }: { dock: OrbDock; className?: string }) {
  const { tok } = useAppTheme()
  const [showTip, setShowTip] = useState(false)
  const [prevDock, setPrevDock] = useState(dock)
  const tipSeen = useRef(false)

  // One-time narrated tooltip when the orb first moves to a non-feed dock
  // (derived-state-during-render pattern — avoids setState inside effects)
  if (dock !== prevDock) {
    setPrevDock(dock)
    if (dock !== 'feed' && !tipSeen.current) {
      tipSeen.current = true
      setShowTip(true)
    }
  }

  useEffect(() => {
    if (!showTip) return
    const id = setTimeout(() => setShowTip(false), 3600)
    return () => clearTimeout(id)
  }, [showTip])

  return (
    <motion.div
      layoutId="kaluta-assistant-orb"
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className={cn('pointer-events-auto relative z-30 flex flex-col items-center gap-2', className)}
    >
      <AnimatePresence>
        {showTip && (
          <motion.span
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={cn('absolute -top-9 whitespace-nowrap rounded-full px-3 py-1 text-[0.68rem] font-semibold text-gold-soft', tok.cardSolid)}
          >
            The Assistant moves with you.
          </motion.span>
        )}
      </AnimatePresence>

      <button
        type="button"
        aria-label="Open Kinjy Assistant"
        className="group relative block h-12 w-12 rounded-full"
      >
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-orb-breathe rounded-full"
          style={{ background: 'var(--grad-orb)', filter: 'blur(1px)' }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-[3px] rounded-full opacity-90"
          style={{ background: 'radial-gradient(circle at 32% 28%, rgba(255,255,255,0.5), transparent 45%)' }}
        />
        <MessageCircle
          size={17}
          className="absolute inset-0 m-auto text-white drop-shadow transition-transform duration-200 group-hover:scale-110"
          aria-hidden="true"
        />
      </button>
      <span
        className={cn(
          'max-w-[150px] rounded-full border border-gold/25 px-2.5 py-1 text-center text-[0.6rem] font-semibold leading-tight text-gold-soft',
          tok.cardSolid,
        )}
      >
        {CONTEXT_CHIPS[dock]}
      </span>
    </motion.div>
  )
}
