import { useEffect, useRef, useState } from 'react'
import confetti from 'canvas-confetti'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, CalendarClock, Check, Pencil, ShieldCheck, Sparkles, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EASE, useReducedMotion } from './motion-utils'
import { Eyebrow, Stage } from '@/components/landing/PageKit'
import { MODULE_TONES } from '@/components/platform/tones'

const USER_MSG = 'Turn my market vlog into a newsletter for Friday'
const COPILOT_MSG = 'Drafted 612 words, pulled 4 stills, scheduled 9:00 EAT. Approve?'

const sessionFlags = { approveConfetti: false } // once per session (module scope)

function useTypewriter(text: string, start: boolean, charsPerSec = 42) {
  const [out, setOut] = useState('')
  useEffect(() => {
    if (!start) return
    let i = 0
    const id = window.setInterval(() => {
      i += 1
      setOut(text.slice(0, i))
      if (i >= text.length) window.clearInterval(id)
    }, 1000 / charsPerSec)
    return () => window.clearInterval(id)
  }, [start, text, charsPerSec])
  return out
}

/** Section 3 — AI Copilot chat panel + autonomous agents copy. */
export default function CopilotPanel() {
  const reduced = useReducedMotion()
  const rootRef = useRef<HTMLElement>(null)
  const [inView, setInView] = useState(false)
  const [status, setStatus] = useState<'idle' | 'approved' | 'edited' | 'rejected'>('idle')

  useEffect(() => {
    const el = rootRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && e.intersectionRatio >= 0.4 && setInView(true),
      { threshold: [0.4, 0.6] },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  const userTyped = useTypewriter(USER_MSG, inView && !reduced)
  const userDone = reduced ? inView : userTyped.length >= USER_MSG.length
  const copilotTyped = useTypewriter(COPILOT_MSG, userDone, 42)
  const copilotDone = reduced ? inView : copilotTyped.length >= COPILOT_MSG.length

  // gold confetti burst on first approval of the session
  useEffect(() => {
    if (status === 'approved' && !sessionFlags.approveConfetti && !reduced) {
      sessionFlags.approveConfetti = true
      confetti({
        particleCount: 40,
        spread: 65,
        startVelocity: 28,
        scalar: 0.8,
        colors: ['#F0C878', '#D9A648', '#8FB8E8'],
        origin: { y: 0.7 },
      })
    }
  }, [status, reduced])

  const approve = () => setStatus('approved')

  return (
    <section ref={rootRef} className="kl-pad-x py-[clamp(72px,9vw,120px)]">
      <div className="kl-split gap-[clamp(40px,6vw,96px)]">
        {/* Copilot chat panel */}
        <Stage className="min-w-0 p-[clamp(16px,4vw,48px)]" glows={['var(--kl-indigo)', 'var(--kl-coral)']}>
        <motion.div
          className="rounded-[20px] bg-[var(--kl-surface)] p-5 shadow-[0_30px_60px_-36px_var(--kl-shadow)]"
          initial={reduced ? false : { opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <div className="flex items-center gap-2.5 border-b border-[var(--kl-paper-2)] pb-4">
            <span className="kl-orb-ring flex h-9 w-9 items-center justify-center rounded-full">
              <Sparkles size={16} className="text-[#0B0E1D]" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-semibold">Creator Copilot</p>
              <p className="kl-mono text-[11px] text-[var(--kl-low)]">approval workflow · on</p>
            </div>
            <span className="ms-auto inline-flex items-center gap-1 rounded-full bg-[#F7E1D8] px-2.5 py-1 text-[11px] font-semibold text-[#C45531]">
              <Bot size={11} aria-hidden="true" /> autonomous
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {/* user message */}
            <div className="flex justify-end">
              <p className="max-w-[80%] rounded-2xl rounded-ee-md bg-[var(--kl-indigo)] px-4 py-2.5 text-sm text-white">
                {reduced ? (inView ? USER_MSG : '') : userTyped}
                {!userDone && inView && <span className="animate-pulse text-[#F0C878]">▍</span>}
              </p>
            </div>
            {/* copilot reply */}
            <AnimatePresence>
              {userDone && (
                <motion.div
                  className="flex justify-start"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: EASE }}
                >
                  <div className="max-w-[85%] rounded-2xl rounded-es-md bg-[var(--kl-paper)] px-4 py-2.5">
                    <p className="text-sm">
                      {reduced ? COPILOT_MSG : copilotTyped}
                      {!copilotDone && <span className="animate-pulse text-[var(--kl-gold-deep)]">▍</span>}
                    </p>
                    {copilotDone && status === 'idle' && (
                      <div className="mt-3 flex gap-2">
                        {[
                          { label: 'Approve', icon: Check, act: approve, cls: 'kl-sheen' },
                          { label: 'Edit', icon: Pencil, act: () => setStatus('edited'), cls: 'bg-[var(--kl-surface)] border border-[var(--kl-paper-2)]' },
                          { label: 'Reject', icon: X, act: () => setStatus('rejected'), cls: 'bg-[var(--kl-surface)] border border-[var(--kl-paper-2)] text-[var(--kl-mid)]' },
                        ].map((b, i) => (
                          <motion.button
                            key={b.label}
                            type="button"
                            onClick={b.act}
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.08, duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                            className={cn('inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-bold', b.cls)}
                          >
                            <b.icon size={12} aria-hidden="true" /> {b.label}
                          </motion.button>
                        ))}
                      </div>
                    )}
                    <AnimatePresence>
                      {status !== 'idle' && (
                        <motion.p
                          key={status}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                          className={cn(
                            'kl-mono mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px]',
                            status === 'approved' && 'bg-[#F6EBD3] text-[#8A6414]',
                            status === 'edited' && 'bg-[#E3ECF7] text-[#2F6BA8]',
                            status === 'rejected' && 'bg-[var(--kl-surface)] text-[var(--kl-low)]',
                          )}
                        >
                          {status === 'approved' && (
                            <>
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ duration: 0.35, ease: [0.34, 1.56, 0.64, 1] }}
                                className="kl-sheen flex h-4 w-4 items-center justify-center rounded-full"
                              >
                                <Check size={10} aria-hidden="true" />
                              </motion.span>
                              approved · publishing Fri 9:00 EAT
                            </>
                          )}
                          {status === 'edited' && 'opened in editor — nothing publishes yet'}
                          {status === 'rejected' && 'discarded · copilot will redraft on request'}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        </Stage>

        {/* Copy column */}
        <motion.div
          className="min-w-0"
          initial={reduced ? false : { opacity: 0, x: 60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <Eyebrow>Your tireless team</Eyebrow>
          <h2 className="kl-h2 mt-5">Copilot for today. Agents for every day.</h2>
          <ul className="mt-10 border-t border-[var(--kl-paper-2)]">
            {[
              {
                icon: CalendarClock,
                title: 'Recurring tasks, run autonomously',
                body: 'Weekly digests, cross-posting and translation refreshes run on schedule — with approval workflows. Nothing publishes without your yes.',
              },
              {
                icon: ShieldCheck,
                title: 'Brand kit keeps every format on-style',
                body: 'Fonts, colors, tone and watermark applied to every article, clip and newsletter the engine renders.',
              },
              {
                icon: Sparkles,
                title: 'AI credits scale with your plan',
                body: 'Free gets a monthly allowance; Basic multiplies it ×5; Premium unlocks the full AI Creator Studio.',
              },
            ].map((b, i) => (
              <li key={b.title} className="flex items-start gap-4 border-b border-[var(--kl-paper-2)] py-5">
                <span
                  className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px]"
                  style={{ background: MODULE_TONES[i][1], color: MODULE_TONES[i][0] }}
                >
                  <b.icon size={19} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-semibold">{b.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-[var(--kl-mid)]">{b.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </motion.div>
      </div>
    </section>
  )
}
