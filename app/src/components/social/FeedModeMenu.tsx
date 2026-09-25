import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, RefreshCw } from 'lucide-react'
import { useAppTheme } from '@/components/appdemo/theme'
import type { FeedMode } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * The feed's heading, in one control.
 *
 * Ten modes as chips wrapped onto two rows and pushed the first post below the
 * fold before anyone had read a word. A menu says the same thing in one line and
 * has room for each mode's description, which the chips never had.
 */
export default function FeedModeMenu({
  modes,
  active,
  onSelect,
  onRefresh,
  loading,
}: {
  modes: FeedMode[]
  active: string
  onSelect: (id: string) => void
  onRefresh: () => void
  loading: boolean
}) {
  const { tok } = useAppTheme()
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onAway = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onEscape = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onAway)
    document.addEventListener('keydown', onEscape)
    return () => {
      document.removeEventListener('mousedown', onAway)
      document.removeEventListener('keydown', onEscape)
    }
  }, [open])

  const current = modes.find((m) => m.id === active)

  return (
    <div className="mb-3 flex items-center gap-2">
      <div ref={boxRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-haspopup="listbox"
          className={cn(
            'flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors',
            tok.subtleBg,
            tok.text,
            tok.hoverBg,
          )}
        >
          {current?.label ?? 'Feed'}
          {current && !current.ranked && (
            <span className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[0.6rem] font-bold text-gold-soft">
              chronological
            </span>
          )}
          <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.ul
              role="listbox"
              initial={{ opacity: 0, y: 6, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'absolute start-0 top-12 z-40 max-h-[60svh] w-72 overflow-y-auto rounded-card-md p-1.5 shadow-cloud',
                tok.cardSolid,
              )}
            >
              {modes.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={m.id === active}
                    onClick={() => {
                      onSelect(m.id)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full gap-2 rounded-card-sm px-2.5 py-2 text-start transition-colors',
                      m.id === active ? 'bg-gold/10' : tok.hoverBg,
                    )}
                  >
                    <Check
                      size={14}
                      className={cn('mt-0.5 shrink-0', m.id === active ? 'text-gold-soft' : 'opacity-0')}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className={cn('block text-sm font-semibold', m.id === active ? 'text-gold-soft' : tok.text)}>
                        {m.label}
                      </span>
                      <span className={cn('block text-xs leading-snug', tok.low)}>
                        {m.description}
                        {!m.ranked && ' · never ranked'}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={onRefresh}
        aria-label="Refresh the feed"
        className={cn('ms-auto rounded-full p-2 transition-colors', tok.mid, tok.hoverBg)}
      >
        <RefreshCw size={14} className={cn(loading && 'animate-spin')} aria-hidden="true" />
      </button>
    </div>
  )
}
