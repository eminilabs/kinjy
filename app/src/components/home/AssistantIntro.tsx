import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { ArrowRight, Mic, Play } from 'lucide-react'
import { useInView } from 'framer-motion'
import { cn } from '@/lib/utils'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const QUESTION = 'How do I change my feed algorithm?'
const ANSWER =
  'Open any feed, tap the mode chips, then choose an algorithm from the Marketplace — Family First is a lovely place to start.'

function useTypewriter(text: string, active: boolean, speed = 42) {
  const [out, setOut] = useState('')
  useEffect(() => {
    if (!active) return
    let i = 0
    const id = setInterval(() => {
      i += 1
      setOut(text.slice(0, i))
      if (i >= text.length) clearInterval(id)
    }, 1000 / speed)
    return () => clearInterval(id)
  }, [text, active, speed])
  return out
}

/** Section 8 — Kinjy Assistant intro: chat mock with dual response formats. */
export default function AssistantIntro() {
  const rootRef = useRef<HTMLDivElement>(null)
  const inView = useInView(rootRef, { once: true, margin: '-40%' })
  const [phase, setPhase] = useState(0) // 0 idle, 1 question typed, 2 answer
  const [tab, setTab] = useState<'written' | 'video'>('written')
  const q = useTypewriter(QUESTION, inView)
  const a = useTypewriter(ANSWER, phase >= 1)

  useEffect(() => {
    if (q.length >= QUESTION.length) {
      const id = setTimeout(() => setPhase(1), 500)
      return () => clearTimeout(id)
    }
  }, [q])

  useEffect(() => {
    if (phase >= 1 && a.length >= ANSWER.length) {
      setPhase(2)
      const id = setTimeout(() => setTab('video'), 1600)
      const id2 = setTimeout(() => setTab('written'), 3600)
      return () => {
        clearTimeout(id)
        clearTimeout(id2)
      }
    }
  }, [phase, a])

  return (
    <section className="noise-overlay relative overflow-hidden bg-ink-2/30 px-6 py-24 md:py-32">
      <div ref={rootRef} className="mx-auto grid max-w-container items-center gap-14 lg:grid-cols-2">
        {/* Chat panel mock */}
        <motion.div
          className="cloud-card relative mx-auto w-full max-w-[440px] p-5"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
            <img src="/assistant-orb.svg" alt="" className="h-9 w-9 animate-orb-breathe" />
            <div>
              <p className="text-sm font-bold">Kinjy Assistant</p>
              <p className="caption">knows every feature · answers at your level</p>
            </div>
            <span className="ms-auto rounded-full border border-sky/30 bg-sky/10 px-2.5 py-1 text-[0.65rem] font-bold text-sky">
              USER
            </span>
          </div>

          {/* user message */}
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-card-md rounded-ee-sm bg-indigo/35 px-4 py-2.5 text-sm">
              <Mic size={13} className="me-1.5 inline text-sky" aria-hidden="true" />
              {q}
              {q.length < QUESTION.length && <span className="animate-caret-blink">▍</span>}
            </div>
          </div>

          {/* assistant reply */}
          {phase >= 1 && (
            <div className="mt-4 max-w-[92%] rounded-card-md rounded-es-sm cloud-glass bg-ink-3/70 p-4">
              <div className="mb-3 flex gap-1 rounded-full bg-white/5 p-1">
                {(['written', 'video'] as const).map((tb) => (
                  <button
                    key={tb}
                    type="button"
                    onClick={() => setTab(tb)}
                    className={cn(
                      'flex-1 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                      tab === tb ? 'bg-gold text-ink' : 'text-text-mid hover:text-text-hi',
                    )}
                  >
                    {tb === 'written' ? 'Written + images' : 'Video clip'}
                  </button>
                ))}
              </div>
              <p className="text-sm leading-relaxed text-text-hi/90">
                {a}
                {a.length < ANSWER.length && <span className="animate-caret-blink">▍</span>}
              </p>
              {phase >= 2 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="mt-3 overflow-hidden rounded-card-sm border border-white/10"
                >
                  {tab === 'written' ? (
                    <img
                      src="/assistant-illustration-1.jpg"
                      alt="Illustrated walkthrough: how to change your feed algorithm"
                      className="w-full object-cover"
                    />
                  ) : (
                    <div className="relative">
                      <img
                        src="/assistant-video-thumb.jpg"
                        alt="Demo clip: Setting up your memorial — 0:42"
                        className="w-full object-cover"
                      />
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/90 text-ink">
                          <Play size={18} className="ms-0.5 fill-ink" aria-hidden="true" />
                        </span>
                      </span>
                      <span className="mono-data absolute bottom-2 right-2 rounded bg-ink/80 px-1.5 py-0.5 text-[0.65rem] text-gold-soft">
                        0:42
                      </span>
                    </div>
                  )}
                </motion.div>
              )}
              <p className="caption mt-3">回答于中文可用 · Swahili OK · العربية</p>
            </div>
          )}
        </motion.div>

        {/* Copy */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <p className="eyebrow text-gold">Meet Kinjy Assistant</p>
          <h2 className="h2 mt-4">Ask anything. In any language. By voice or text.</h2>
          <ul className="mt-6 space-y-3.5 text-text-mid">
            {[
              'Knows every feature of the platform — and every permission level',
              'Answers as a user or an admin, based on your access',
              'Shows you with illustrative images or a demo video clip',
              'Moves beside you as you navigate between modules',
              'Stays current with every change shipped to the codebase',
            ].map((b) => (
              <li key={b} className="flex items-start gap-3">
                <img src="/assistant-orb.svg" alt="" className="mt-0.5 h-4 w-4 shrink-0" />
                {b}
              </li>
            ))}
          </ul>
          <Link to="/assistant" className="mt-8 inline-flex items-center gap-2 font-semibold text-gold-soft transition-all hover:gap-3">
            How the Assistant works <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
