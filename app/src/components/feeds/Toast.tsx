import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Undo2 } from 'lucide-react'
import { CLOUD_EASE } from '@/components/platform/shared'

export interface ToastAction {
  label: string
  onClick: () => void
  gold?: boolean
}

export interface Toast {
  id: number
  message: string
  actions?: ToastAction[]
  duration?: number
}

interface ToastCtx {
  push: (message: string, opts?: { actions?: ToastAction[]; duration?: number }) => void
}

const Ctx = createContext<ToastCtx>({ push: () => undefined })

export function useToasts() {
  return useContext(Ctx)
}

/** Lightweight glass toast stack (bottom-center), with undo-style actions. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const idRef = useRef(0)

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])

  const push = useCallback(
    (message: string, opts?: { actions?: ToastAction[]; duration?: number }) => {
      const id = ++idRef.current
      setToasts((t) => [...t.slice(-2), { id, message, actions: opts?.actions, duration: opts?.duration }])
      const dur = opts?.duration ?? 4600
      window.setTimeout(() => dismiss(id), dur)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ push }), [push])

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex flex-col items-center gap-2 px-4" aria-live="polite">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.3, ease: CLOUD_EASE }}
              className="pointer-events-auto flex items-center gap-3 rounded-full cloud-glass bg-ink-2/95 py-2.5 pl-5 pr-2.5 shadow-cloud"
            >
              <p className="text-sm font-medium text-text-hi">{t.message}</p>
              {t.actions?.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => {
                    a.onClick()
                    dismiss(t.id)
                  }}
                  className={
                    a.gold
                      ? 'flex items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-3.5 py-1.5 text-xs font-bold text-ink'
                      : 'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-sky hover:bg-white/5'
                  }
                >
                  {!a.gold && <Undo2 size={12} />}
                  {a.label}
                </button>
              ))}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Ctx.Provider>
  )
}
