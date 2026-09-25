import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Check, CircleUserRound, FileText, Globe2, MapPin, SlidersHorizontal,
  Sparkles, Sprout, Target, TreePine, Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const SNAP: [number, number, number, number] = [0.34, 1.56, 0.64, 1]

/* --------------------------------- Script ---------------------------------- */

interface Question {
  id: string
  icon: LucideIcon
  ask: string
  chips: string[]
}

const QUESTIONS: Question[] = [
  { id: 'interests', icon: Sprout, ask: 'Karibu! I’m your onboarding concierge. First — what are you into?', chips: ['Urban farming', 'Music', 'Family history', 'Market trade'] },
  { id: 'languages', icon: Globe2, ask: 'Lovely. Which languages should your world speak?', chips: ['English + Kiswahili', 'Français', 'English only', 'العربية'] },
  { id: 'city', icon: MapPin, ask: 'And which city do you call home?', chips: ['Kigoma', 'Nairobi', 'Kigali', 'Dar es Salaam'] },
  { id: 'goal', icon: Target, ask: 'Last one — what’s your goal on Kinjy?', chips: ['Stay close to family', 'Grow my business', 'Learn something new'] },
]

const DONE_LINE = 'Asante! I’ve built your first day on Kinjy — everything below is yours to edit.'

/** Typing effect for concierge lines (skipped under reduced motion). */
function TypedLine({ text, onDone }: { text: string; onDone: () => void }) {
  const reduced = useReducedMotion()
  const [n, setN] = useState(reduced ? text.length : 0)
  const doneRef = useRef(onDone)
  useEffect(() => {
    doneRef.current = onDone
  }, [onDone])

  useEffect(() => {
    if (n >= text.length) {
      const id = setTimeout(() => doneRef.current(), 120)
      return () => clearTimeout(id)
    }
    const id = setTimeout(() => setN((v) => v + 1), 16)
    return () => clearTimeout(id)
  }, [n, text.length])

  return (
    <span>
      {text.slice(0, n)}
      {n < text.length && <span className="ms-0.5 inline-block h-3.5 w-[2px] animate-caret-blink bg-gold-soft align-middle" aria-hidden="true" />}
    </span>
  )
}

/* ------------------------------ Build artifacts ----------------------------- */

function BuildShell({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: SNAP }}
      className="cloud-glass rounded-card-md p-3.5"
    >
      {children}
    </motion.div>
  )
}

function BuildLabel({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-sky">
      <Icon size={11} aria-hidden="true" /> {text}
      <motion.span
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.35, duration: 0.4, ease: SNAP }}
        className="ms-auto flex h-4 w-4 items-center justify-center rounded-full bg-success/20 text-success"
      >
        <Check size={10} aria-hidden="true" />
      </motion.span>
    </p>
  )
}

function CirclesBuild({ interest }: { interest: string }) {
  return (
    <BuildShell>
      <BuildLabel icon={CircleUserRound} text="First Circle suggestion" />
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo/25 text-sky">
          <Users size={16} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-text-hi">
            {interest === 'Music' ? 'Kigoma Beats Circle' : interest === 'Family history' ? 'Heritage Keepers Circle' : interest === 'Market trade' ? 'Traders’ Table Circle' : 'Urban Growers Circle'}
          </p>
          <p className="text-xs text-text-mid">4,218 members · matched to your interests</p>
        </div>
        <motion.span
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45, duration: 0.3, ease: EASE }}
          className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-3 py-1.5 text-[0.68rem] font-bold text-ink"
        >
          Join
        </motion.span>
      </div>
    </BuildShell>
  )
}

function AlgorithmBuild({ languages }: { languages: string }) {
  return (
    <BuildShell>
      <BuildLabel icon={Sparkles} text="Algorithm selected" />
      <p className="text-sm font-bold text-text-hi">Community Warmth <span className="mono-data text-xs font-medium text-gold-soft">v2.4</span></p>
      <p className="mt-0.5 text-xs text-text-mid">Tuned for {languages} · transparent ranking, yours to change anytime</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {['People over virality', 'Why-am-I-seeing-this on'].map((c, i) => (
          <motion.span
            key={c}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.12, duration: 0.35, ease: SNAP }}
            className="rounded-full border border-sky/30 bg-sky/10 px-2.5 py-1 text-[0.65rem] font-semibold text-sky"
          >
            {c}
          </motion.span>
        ))}
      </div>
    </BuildShell>
  )
}

function FeedModesBuild({ city }: { city: string }) {
  const modes = ['For You', 'Family First', `Local · ${city}`]
  return (
    <BuildShell>
      <BuildLabel icon={SlidersHorizontal} text="Feed-mode defaults" />
      <div className="flex flex-wrap gap-1.5">
        {modes.map((m, i) => (
          <motion.span
            key={m}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 + i * 0.12, duration: 0.4, ease: SNAP }}
            className={cn(
              'rounded-full px-3 py-1.5 text-[0.68rem] font-bold',
              i === 0 ? 'bg-gradient-to-br from-gold-soft to-gold text-ink' : 'cloud-glass text-text-mid',
            )}
          >
            {m}
          </motion.span>
        ))}
      </div>
    </BuildShell>
  )
}

function FamilyAndPostBuild({ goal }: { goal: string }) {
  return (
    <>
      <BuildShell>
        <BuildLabel icon={TreePine} text="Family Tree · step 1" />
        <div className="flex items-center justify-center gap-6 py-1">
          {['Add your mother', 'Add your father'].map((label, i) => (
            <motion.div
              key={label}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 + i * 0.18, duration: 0.5, ease: SNAP }}
              className="flex flex-col items-center gap-1.5"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-gold/50 text-gold-soft">
                <TreePine size={15} aria-hidden="true" />
              </span>
              <span className="text-[0.62rem] font-semibold text-text-mid">{label}</span>
            </motion.div>
          ))}
        </div>
      </BuildShell>
      <BuildShell delay={0.15}>
        <BuildLabel icon={FileText} text="Your first post · drafted" />
        <p className="text-xs italic leading-relaxed text-text-mid">
          “Day one on Kinjy. Here to {goal === 'Grow my business' ? 'grow my little business and meet good people' : goal === 'Learn something new' ? 'learn from growers across the world' : 'keep my family close, near and far'}. Habari yenu!”
        </p>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.3 }}
          className="mt-2 inline-block rounded-full bg-gold/15 px-2.5 py-1 text-[0.62rem] font-bold text-gold-soft"
        >
          Review &amp; post →
        </motion.span>
      </BuildShell>
    </>
  )
}

/* ------------------------------- Progress arc ------------------------------- */

function ProgressArc({ done, total }: { done: number; total: number }) {
  const R = 26
  const C = 2 * Math.PI * R
  const pct = done / total
  return (
    <div className="relative h-16 w-16 shrink-0" role="img" aria-label={`${done} of ${total} steps complete`}>
      <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
        <circle cx="32" cy="32" r={R} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="4" />
        <motion.circle
          cx="32" cy="32" r={R} fill="none"
          stroke="url(#concierge-arc)" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={C}
          initial={false}
          animate={{ strokeDashoffset: C * (1 - pct) }}
          transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
        />
        <defs>
          <linearGradient id="concierge-arc" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#F0C878" />
            <stop offset="55%" stopColor="#D9A648" />
            <stop offset="100%" stopColor="#8FB8E8" />
          </linearGradient>
        </defs>
      </svg>
      <span className="mono-data absolute inset-0 flex items-center justify-center text-xs text-gold-soft">
        {done}/{total}
      </span>
    </div>
  )
}

/* --------------------------------- Section ---------------------------------- */

/** A1 — guided conversational first-run: the concierge interviews, then visibly builds. */
export default function ConciergeOnboarding() {
  const [answers, setAnswers] = useState<string[]>([])
  const [typed, setTyped] = useState(0) // how many concierge lines finished typing
  const step = answers.length
  const finished = step >= QUESTIONS.length

  const answer = (chip: string) => {
    if (typed <= step) return // wait for the question to finish typing
    setAnswers((a) => [...a, chip])
  }

  const restart = () => { setAnswers([]); setTyped(0) }

  return (
    <section className="noise-overlay relative bg-ink-2/20 px-6 py-24 md:py-28">
      <div className="mx-auto max-w-container">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-12 max-w-2xl"
        >
          <p className="eyebrow text-gold">AI onboarding concierge</p>
          <h3 className="h3 mt-3 font-display text-3xl font-medium">
            Four questions. <span className="text-gold-grad">A first day, built for you.</span>
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-text-mid">
            New members aren’t dropped into an empty feed. The concierge interviews them, then visibly assembles
            their first Circle, algorithm, feed modes, family tree and post — step by step.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* chat panel */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.65, ease: EASE }}
            className="cloud-card flex min-h-[480px] flex-col p-5"
          >
            <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
              <span className="relative flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'var(--grad-orb)' }}>
                <Sparkles size={16} className="text-ink" aria-hidden="true" />
              </span>
              <div className="flex-1">
                <p className="text-sm font-bold text-text-hi">Kinjy Concierge</p>
                <p className="text-xs text-text-low">First-run setup · scripted demo</p>
              </div>
              <ProgressArc done={step} total={QUESTIONS.length} />
            </div>

            <div className="flex flex-1 flex-col gap-3 overflow-y-auto" aria-live="polite">
              {QUESTIONS.slice(0, step + 1).map((q, i) => {
                const answered = i < step
                const isCurrent = i === step && !finished
                return (
                  <div key={q.id} className="flex flex-col gap-3">
                    {/* concierge bubble */}
                    <div className="max-w-[85%] self-start rounded-card-md rounded-es-sm bg-indigo/20 px-3.5 py-2.5 text-sm leading-relaxed text-text-hi">
                      {isCurrent ? (
                        <TypedLine text={q.ask} onDone={() => setTyped((v) => Math.max(v, i + 1))} />
                      ) : q.ask}
                    </div>
                    {/* user answer bubble */}
                    {answered && (
                      <motion.div
                        initial={{ opacity: 0, x: 16, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        transition={{ duration: 0.35, ease: SNAP }}
                        className="max-w-[85%] self-end rounded-card-md rounded-ee-sm bg-gold/15 px-3.5 py-2.5 text-sm font-semibold text-gold-soft"
                      >
                        {answers[i]}
                      </motion.div>
                    )}
                    {/* answer chips */}
                    {isCurrent && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: typed > i ? 1 : 0.35, y: 0 }}
                        transition={{ duration: 0.4, ease: EASE }}
                        className="flex flex-wrap gap-2"
                      >
                        {q.chips.map((chip) => (
                          <motion.button
                            key={chip}
                            type="button"
                            onClick={() => answer(chip)}
                            disabled={typed <= i}
                            whileTap={{ scale: 0.95 }}
                            className="rounded-full border border-gold/35 bg-gold/10 px-3.5 py-1.5 text-xs font-bold text-gold-soft transition-colors hover:bg-gold/20 disabled:cursor-wait disabled:opacity-50"
                          >
                            {chip}
                          </motion.button>
                        ))}
                      </motion.div>
                    )}
                  </div>
                )
              })}

              {finished && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: EASE }}
                  className="max-w-[85%] self-start rounded-card-md rounded-es-sm bg-indigo/20 px-3.5 py-2.5 text-sm leading-relaxed text-text-hi"
                >
                  <TypedLine text={DONE_LINE} onDone={() => {}} />
                </motion.div>
              )}
            </div>

            {finished && (
              <motion.button
                type="button"
                onClick={restart}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.4 }}
                className="mt-4 self-center rounded-full border border-white/15 px-4 py-2 text-xs font-bold text-text-mid transition-colors hover:border-gold/40 hover:text-gold-soft"
              >
                Replay the demo
              </motion.button>
            )}
          </motion.div>

          {/* build panel */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ delay: 0.1, duration: 0.65, ease: EASE }}
            className="cloud-card flex min-h-[480px] flex-col p-5"
          >
            <p className="mb-4 flex items-center gap-2 border-b border-white/10 pb-4 text-[0.7rem] font-bold uppercase tracking-[0.16em] text-gold">
              <Sparkles size={13} aria-hidden="true" /> Building your Kinjy — live
            </p>
            <div className="flex flex-1 flex-col gap-3.5">
              <AnimatePresence>
                {step === 0 && (
                  <motion.div
                    key="empty"
                    exit={{ opacity: 0 }}
                    className="flex flex-1 items-center justify-center rounded-card-md border border-dashed border-white/15 p-8 text-center"
                  >
                    <p className="max-w-[240px] text-xs leading-relaxed text-text-low">
                      Answer the concierge on the left — each reply assembles a piece of your account here.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
              {step >= 1 && <CirclesBuild interest={answers[0]} />}
              {step >= 2 && <AlgorithmBuild languages={answers[1]} />}
              {step >= 3 && <FeedModesBuild city={answers[2]} />}
              {step >= 4 && <FamilyAndPostBuild goal={answers[3]} />}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
