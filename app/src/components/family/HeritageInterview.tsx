import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Archive,
  FileAudio,
  Languages,
  Link2,
  Mic,
  Play,
  Quote,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react'
import { ProvenanceTag } from '@/components/ui-kit'
import { cn } from '@/lib/utils'

const cloudEase = [0.22, 1, 0.36, 1] as [number, number, number, number]
const snapEase = [0.34, 1.56, 0.64, 1] as [number, number, number, number]

type Turn = { speaker: 'agent' | 'elder'; sw: string; en: string; t: string }

/** Scripted bilingual exchange — Kiswahili first, English gloss beneath. */
const SCRIPT: Turn[] = [
  {
    speaker: 'agent',
    sw: 'Shikamoo, Mama Zawadi. Naweza kukuuliza kuhusu ujana wako Kisumu?',
    en: 'Greetings, Mama Zawadi. May I ask you about your youth in Kisumu?',
    t: '00:00',
  },
  {
    speaker: 'elder',
    sw: 'Marahaba. Tulikuwa tunaishi karibu na kiwanda cha sukari, kando ya reli…',
    en: 'You are welcome. We lived near the sugar factory, beside the railway line…',
    t: '00:18',
  },
  {
    speaker: 'agent',
    sw: 'Je, unakumbuka siku Baba yako alipofungua duka lake la kwanza?',
    en: 'Do you remember the day your father opened his first shop?',
    t: '00:41',
  },
  {
    speaker: 'elder',
    sw: 'Ndiyo — mwaka 1956. Alifungua barabara ya Oginga Odinga, na mtaa wote ulikuja.',
    en: 'Yes — 1956. He opened it on Oginga Odinga Street, and the whole street came.',
    t: '00:58',
  },
]

/** Live waveform — 22 bars breathing while the interview plays. Isolated + memoized. */
const Waveform = memo(function Waveform({ active }: { active: boolean }) {
  const reduced = useReducedMotion()
  const bars = useMemo(
    () => Array.from({ length: 22 }, (_, i) => 0.25 + ((i * 37) % 60) / 100),
    [],
  )
  return (
    <div className="flex h-10 items-center gap-[3px]" aria-hidden="true">
      {bars.map((b, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-[#9A6B1F]/70"
          style={{ height: 10, transformOrigin: 'center' }}
          animate={
            reduced || !active
              ? { scaleY: b }
              : { scaleY: [b, 1.9 - b, 0.5 + b / 2, 1.6 - b / 2, b] }
          }
          transition={
            reduced || !active
              ? { duration: 0.4, ease: cloudEase }
              : { duration: 1.4, repeat: Infinity, ease: 'easeInOut', delay: i * 0.07 }
          }
        />
      ))}
    </div>
  )
})

/**
 * HeritageInterview — guided voice-conversation demo: the Heritage Interview Agent
 * gently interviews an elder in her own language, transcribes live, then files the
 * structured result into the Family Heritage Archive with full provenance.
 */
export default function HeritageInterview() {
  const reduced = useReducedMotion()
  const [step, setStep] = useState(0) // turns revealed
  const [playing, setPlaying] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const done = step >= SCRIPT.length

  const start = () => {
    if (reduced) {
      setStep(SCRIPT.length)
      setPlaying(false)
      return
    }
    setStep(0)
    setPlaying(true)
  }

  useEffect(() => {
    if (!playing) return
    if (step >= SCRIPT.length) {
      setPlaying(false)
      return
    }
    timer.current = setTimeout(() => setStep((s) => s + 1), step === 0 ? 900 : 2600)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [playing, step])

  return (
    <div className="grid items-start gap-12 lg:grid-cols-12">
      {/* copy column */}
      <div className="lg:col-span-4">
        <p className="eyebrow text-[#9A6B1F]">Heritage Interview Agent</p>
        <h2 className="h2 mt-3 text-paper-ink">It asks gently, in her own language.</h2>
        <p className="body-lg mt-4 text-[#5A5245]">
          Sit an elder down with the Interview Agent. It asks warm, patient questions in
          Kiswahili, English, French or Arabic — transcribes live, glosses for the
          grandchildren, and files every answer where it belongs.
        </p>
        <ul className="mt-7 space-y-4 text-[0.98rem] leading-relaxed text-[#5A5245]">
          <li className="flex gap-3">
            <ShieldCheck size={18} className="mt-1 shrink-0 text-[#9A6B1F]" />
            <span>
              <strong className="text-paper-ink">The original recording is always preserved</strong> —
              untouched, playable by the family forever.
            </span>
          </li>
          <li className="flex gap-3">
            <Quote size={18} className="mt-1 shrink-0 text-[#9A6B1F]" />
            <span>
              <strong className="text-paper-ink">AI never invents history</strong> — the transcript
              is labeled, and every filed answer cites its moment in the recording.
            </span>
          </li>
          <li className="flex gap-3">
            <Languages size={18} className="mt-1 shrink-0 text-[#9A6B1F]" />
            <span>
              Her words stay in her language; the English gloss is a courtesy copy,
              never the source of truth.
            </span>
          </li>
        </ul>
      </div>

      {/* demo column */}
      <div className="lg:col-span-8">
        {/* interview console */}
        <div className="rounded-card-lg border border-[#241F16]/10 bg-[#FFFDF8]/85 p-6 shadow-[0_16px_40px_-16px_rgba(36,31,22,0.2)] backdrop-blur-sm lg:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-11 w-11 items-center justify-center rounded-full bg-[#D9A648]/15 text-[#9A6B1F]">
                <Mic size={19} />
                {playing && !reduced && (
                  <motion.span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full border border-[#D9A648]/60"
                    animate={{ scale: [1, 1.35], opacity: [0.8, 0] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeOut' }}
                  />
                )}
              </span>
              <div>
                <p className="font-semibold text-paper-ink">Interview in progress</p>
                <p className="caption !text-[#6B5F4E]">
                  Mama Zawadi Odhiambo · Kiswahili ·{' '}
                  <span className="mono-data text-[0.72rem]">
                    {done ? SCRIPT[SCRIPT.length - 1].t : step > 0 ? SCRIPT[step - 1].t : '00:00'}
                  </span>
                </p>
              </div>
            </div>
            <Waveform active={playing} />
          </div>

          {/* transcript */}
          <div className="mt-6 min-h-[248px] space-y-4" aria-live="polite">
            {step === 0 && (
              <p className="caption py-16 text-center !text-[#6B5F4E]">
                Press play — the agent begins with respect: <em>“Shikamoo.”</em>
              </p>
            )}
            <AnimatePresence initial={false}>
              {SCRIPT.slice(0, step).map((turn) => (
                <motion.div
                  key={turn.t}
                  layout="position"
                  initial={{ opacity: 0, y: reduced ? 0 : 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: cloudEase }}
                  className={cn(
                    'flex gap-3',
                    turn.speaker === 'agent' ? '' : 'flex-row-reverse',
                  )}
                >
                  <span
                    className={cn(
                      'mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.62rem] font-bold uppercase tracking-wider',
                      turn.speaker === 'agent'
                        ? 'bg-[#D9A648]/15 text-[#9A6B1F]'
                        : 'bg-[#241F16]/8 text-[#5A5245]',
                    )}
                  >
                    {turn.speaker === 'agent' ? 'AI' : 'MZ'}
                  </span>
                  <div
                    className={cn(
                      'max-w-[85%] rounded-card-md border p-3.5',
                      turn.speaker === 'agent'
                        ? 'border-[#D9A648]/35 bg-[#D9A648]/8'
                        : 'border-[#241F16]/10 bg-white/70',
                    )}
                  >
                    <p className="text-[0.95rem] font-medium leading-relaxed text-paper-ink">
                      {turn.sw}
                    </p>
                    <p className="mt-1.5 flex items-start gap-1.5 text-[0.8rem] italic leading-relaxed text-[#6B5F4E]">
                      <Languages size={12} className="mt-0.5 shrink-0" />
                      {turn.en}
                    </p>
                    <p className="mono-data mt-2 text-[0.62rem] tracking-wider text-[#9A6B1F]">
                      REC {turn.t}
                    </p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={start}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-3 text-sm font-bold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:brightness-110"
            >
              {done ? <RotateCcw size={15} /> : <Play size={15} />}
              {done ? 'Replay the interview' : playing ? 'Playing…' : 'Play the interview'}
            </button>
            {playing && (
              <span className="mono-data text-[0.68rem] tracking-widest text-[#9A6B1F]">
                ● RECORDING — ORIGINAL SAVED
              </span>
            )}
          </div>
        </div>

        {/* structured result — revealed when the demo completes */}
        <AnimatePresence>
          {done && (
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: cloudEase, delay: reduced ? 0 : 0.4 }}
              className="mt-6 rounded-card-lg border border-[#D9A648]/40 bg-[#FFFDF8] p-6 shadow-[0_20px_50px_-20px_rgba(36,31,22,0.3)] lg:p-7"
            >
              <div className="flex items-center gap-2.5">
                <Archive size={18} className="text-[#9A6B1F]" />
                <h3 className="h3 text-paper-ink">Filed into the Family Heritage Archive</h3>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {/* the recording — original */}
                <motion.div
                  initial={reduced ? false : { opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: reduced ? 0 : 0.55, duration: 0.5, ease: snapEase }}
                  className="rounded-card-md border border-[#241F16]/10 bg-white/70 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-paper-ink">
                      <FileAudio size={15} className="text-[#9A6B1F]" />
                      Original recording
                    </span>
                    <ProvenanceTag kind="original" className="!border-[#241F16]/20 !bg-[#241F16]/5 !text-[#5A5245]" />
                  </div>
                  <p className="mono-data mt-2 text-[0.72rem] text-[#6B5F4E]">
                    mama-zawadi-2026-01-04.m4a · 4:12
                  </p>
                  <p className="caption mt-1.5 !text-[#6B5F4E]">
                    Preserved byte-for-byte. Never edited, never re-generated.
                  </p>
                </motion.div>

                {/* the transcript — AI assisted */}
                <motion.div
                  initial={reduced ? false : { opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: reduced ? 0 : 0.68, duration: 0.5, ease: snapEase }}
                  className="rounded-card-md border border-[#241F16]/10 bg-white/70 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-semibold text-paper-ink">
                      <Languages size={15} className="text-[#9A6B1F]" />
                      Transcript + English gloss
                    </span>
                    <ProvenanceTag kind="ai-assisted" />
                  </div>
                  <p className="caption mt-2 !text-[#6B5F4E]">
                    Kiswahili verbatim, English courtesy translation — clearly labeled as
                    AI-assisted, always beside the original.
                  </p>
                </motion.div>
              </div>

              {/* links */}
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduced ? 0 : 0.82, duration: 0.5, ease: cloudEase }}
                className="mt-4 flex flex-wrap gap-2"
              >
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#241F16]/15 bg-[#D9A648]/10 px-3 py-1.5 text-[0.72rem] font-semibold text-paper-ink">
                  <Link2 size={12} className="text-[#9A6B1F]" />
                  Person Record · Mama Zawadi Odhiambo (Level 1)
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#241F16]/15 bg-[#D9A648]/10 px-3 py-1.5 text-[0.72rem] font-semibold text-paper-ink">
                  <Link2 size={12} className="text-[#9A6B1F]" />
                  Family timeline · 1956 — “Father’s first shop”, Kisumu
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#9A6B1F]/30 bg-white/70 px-3 py-1.5 text-[0.72rem] font-semibold text-[#9A6B1F]">
                  <Quote size={12} />
                  Answer cites the recording · 00:58
                </span>
              </motion.div>

              <p className="caption mt-4 border-t border-[#241F16]/10 pt-3 !text-[#6B5F4E]">
                Nothing here was invented by AI — every archive entry traces back to her
                voice, at her timestamp.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
