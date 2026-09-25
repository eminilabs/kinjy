import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Flame, X } from 'lucide-react'
import { ArcButton, CandleFlowerWidget } from '@/components/ui-kit'

const cloudEase = [0.22, 1, 0.36, 1] as [number, number, number, number]

interface LitCandle {
  id: number
  name: string
}

/**
 * “Light a candle for someone” modal (memorials.md §7): candle widget +
 * name field; lighting plays a gentle bloom and adds the flame to a row
 * of recently lit candles.
 */
export default function LightCandleModal({
  open,
  onClose,
  lit,
  onLight,
}: {
  open: boolean
  onClose: () => void
  lit: LitCandle[]
  onLight: (name: string) => void
}) {
  const [name, setName] = useState('')
  const [justLit, setJustLit] = useState(false)
  const reduced = useReducedMotion()

  const handleClose = () => {
    setJustLit(false)
    setName('')
    onClose()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const light = () => {
    const trimmed = name.trim()
    if (!trimmed || justLit) return
    onLight(trimmed)
    setJustLit(true)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#060814]/70 p-6 backdrop-blur-sm"
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-label="Light a candle for someone"
        >
          <motion.div
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
            transition={{ duration: 0.5, ease: cloudEase }}
            className="w-full max-w-md rounded-card-xl border border-gold/25 bg-[#0E1226] p-8 shadow-[0_40px_90px_-20px_rgba(0,0,0,0.9)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="font-display text-2xl text-text-hi">Light a candle</h3>
              <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="rounded-full p-1.5 text-text-mid transition-colors hover:text-text-hi"
              >
                <X size={18} />
              </button>
            </div>
            <p className="caption mt-2 !text-text-mid">
              A small light travels with their name. Free, always.
            </p>

            <label className="mt-6 block">
              <span className="mono-data text-[0.68rem] tracking-[0.18em] text-gold-soft">IN MEMORY OF</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && light()}
                placeholder="Their name…"
                maxLength={60}
                className="mt-2 w-full rounded-card-sm border border-white/15 bg-white/[0.05] px-4 py-3 text-text-hi placeholder:text-text-low focus:border-gold/50 focus:outline-none"
              />
            </label>

            <div className="mt-6 flex items-center justify-between gap-4">
              <ArcButton onClick={light} disabled={!name.trim() || justLit}>
                <Flame size={16} />
                {justLit ? 'Candle lit' : 'Light it gently'}
              </ArcButton>
              <AnimatePresence>
                {justLit && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.6, ease: cloudEase }}
                  >
                    <CandleFlowerWidget kind="candle" tier="free" name={name.trim()} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {justLit && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="mt-4 text-center font-display text-sm italic text-[#D8D3C8]"
              >
                A flame now burns for {name.trim()}.
              </motion.p>
            )}

            {/* recently lit candles */}
            {lit.length > 0 && (
              <div className="mt-6 border-t border-white/10 pt-4">
                <p className="mono-data text-[0.62rem] tracking-[0.18em] text-text-low">RECENTLY LIT</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {lit.slice(-6).map((c) => (
                    <span key={c.id} className="inline-flex items-center gap-1.5 text-[0.78rem] text-text-mid">
                      <Flame size={11} className="text-gold-soft" /> {c.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
