import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/**
 * TranslationBubbles — a Swahili chat bubble rises, an arc pulses, and its
 * auto-translated English twin appears beside it. Loops every 7s.
 */
export default function TranslationBubbles({ className }: { className?: string }) {
  const [cycle, setCycle] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setCycle((c) => c + 1), 7000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className={className} aria-hidden="true">
      <AnimatePresence mode="wait">
        <motion.div key={cycle} className="relative">
          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.5, ease: EASE }}
            className="cloud-glass inline-block rounded-full bg-indigo/30 px-5 py-2.5 text-sm text-text-hi"
          >
            Habari ya leo?
          </motion.div>
          <motion.svg
            width="46"
            height="26"
            viewBox="0 0 46 26"
            className="absolute left-[120px] top-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.3 }}
          >
            <motion.path
              d="M2 22 Q 22 -6 44 12"
              fill="none"
              stroke="url(#tb-arc)"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ delay: 0.32, duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
            />
            <defs>
              <linearGradient id="tb-arc" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#F0C878" />
                <stop offset="0.55" stopColor="#D9A648" />
                <stop offset="1" stopColor="#8FB8E8" />
              </linearGradient>
            </defs>
          </motion.svg>
          <motion.div
            initial={{ opacity: 0, y: 26, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ delay: 0.62, duration: 0.5, ease: EASE }}
            className="cloud-glass mt-3 inline-block rounded-full px-5 py-2.5 text-sm text-text-hi"
          >
            How&rsquo;s your day? <span className="text-sky">· Translated · AI</span>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
