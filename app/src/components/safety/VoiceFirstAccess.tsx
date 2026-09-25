import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Accessibility,
  AudioLines,
  Check,
  Image as ImageIcon,
  Mic,
  Square,
  ToggleLeft,
  ToggleRight,
  Users,
  Volume2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ArcButton } from '@/components/ui-kit'
import { EASE, useReducedMotion } from './motion-utils'

const COMMANDS = [
  { id: 'circles', label: '“Open my Circles”', icon: Users, result: 'Circles opened — 4 circles, 2 unread threads' },
  { id: 'read', label: '“Read this thread aloud”', icon: Volume2, result: 'Reading aloud — “Boat permit fees”, 18 replies, ~2 min' },
] as const

type CommandId = (typeof COMMANDS)[number]['id']
type CmdState = 'idle' | 'listening' | 'done'

const AUDIO_DESCRIPTION =
  'A wooden fishing boat rests on calm water at golden hour. Two fishermen haul a net glittering with silver dagaa. Behind them, the Kigoma shoreline glows amber under a deep indigo sky.'

const READING_PARAGRAPH =
  'Accessibility is not a mode you switch on for some people — it is the platform working the way every person needs it to. Kinjy treats voice, reading support, and audio description as first-class navigation, equal to touch and sight.'

/** Animated waveform — isolated + memo-friendly (parent re-renders don't reset it). */
function Waveform({ active, reduced }: { active: boolean; reduced: boolean }) {
  const bars = [0.5, 0.9, 0.65, 1, 0.75, 0.55, 0.85, 0.6]
  return (
    <span className="flex h-6 items-center gap-[3px]" aria-hidden="true">
      {bars.map((h, i) => (
        <span
          key={i}
          className={cn('w-[3px] origin-center rounded-full bg-sky', active && !reduced && 'animate-wave-bar')}
          style={{
            height: `${h * 100}%`,
            animationDelay: `${i * 0.09}s`,
            transform: active && reduced ? 'scaleY(0.8)' : !active ? 'scaleY(0.35)' : undefined,
          }}
        />
      ))}
    </span>
  )
}

/**
 * VoiceFirstAccess — voice-first navigation & Accessibility+ demo (B10):
 * voice commands with waveform → execution, AI audio description of an image
 * post, and a dyslexia-friendly reading mode toggle that visibly restyles text.
 */
export default function VoiceFirstAccess() {
  const reduced = useReducedMotion()
  const [cmdState, setCmdState] = useState<Record<CommandId, CmdState>>({ circles: 'idle', read: 'idle' })
  const [describing, setDescribing] = useState(false)
  const [descShown, setDescShown] = useState(false)
  const [dyslexiaMode, setDyslexiaMode] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])
  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, reduced ? Math.min(ms, 300) : ms))
  }

  const runCommand = (id: CommandId) => {
    setCmdState((s) => ({ ...s, [id]: 'listening' }))
    later(() => setCmdState((s) => ({ ...s, [id]: 'done' })), 1600)
  }

  const runDescription = () => {
    setDescribing(true)
    setDescShown(false)
    later(() => {
      setDescribing(false)
      setDescShown(true)
    }, 1800)
  }

  return (
    <section aria-labelledby="voice-first-heading" className="px-6 py-24">
      <div className="mx-auto max-w-container">
        <div className="max-w-2xl">
          <p className="eyebrow text-sky">Voice-First Navigation &amp; Accessibility+</p>
          <h2 id="voice-first-heading" className="h2 mt-3">
            Speak it. Hear it.{' '}
            <span className="font-display italic text-gold-grad">Read it your way.</span>
          </h2>
          <p className="body-lg mt-4 text-text-mid">
            Voice commands, AI audio description, and a reading mode that adapts to you — every
            voice feature is always paired with a visible, tappable alternative.
          </p>
        </div>

        <div className="mt-14 grid items-start gap-8 lg:grid-cols-2">
          {/* Voice command demo */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ duration: 0.7, ease: EASE }}
            className="cloud-card p-5"
          >
            <p className="mono-data flex items-center gap-2 text-[0.7rem] uppercase tracking-wider text-text-low">
              <Mic size={13} className="text-gold" aria-hidden="true" /> Voice command demo
            </p>

            <div className="mt-4 space-y-3">
              {COMMANDS.map((cmd) => {
                const state = cmdState[cmd.id]
                return (
                  <div
                    key={cmd.id}
                    className="rounded-card-md border border-white/10 bg-ink-3/60 p-4"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => runCommand(cmd.id)}
                        disabled={state === 'listening'}
                        className="inline-flex items-center gap-2 rounded-full border border-sky/40 bg-sky/10 px-4 py-2 text-sm font-semibold text-sky transition-colors duration-200 ease-cloud-ease hover:bg-sky/20 disabled:opacity-80"
                      >
                        <Mic size={14} aria-hidden="true" />
                        {cmd.label}
                      </button>
                      <Waveform active={state === 'listening'} reduced={reduced} />
                    </div>
                    <div className="mt-2 min-h-[1.5rem]" aria-live="polite">
                      <AnimatePresence mode="wait" initial={false}>
                        {state === 'listening' && (
                          <motion.p
                            key="listening"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="mono-data text-[0.7rem] text-sky"
                          >
                            Listening… parsing intent…
                          </motion.p>
                        )}
                        {state === 'done' && (
                          <motion.p
                            key="done"
                            initial={reduced ? false : { opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: EASE }}
                            className="flex items-center gap-2 text-sm text-success"
                          >
                            <Check size={14} aria-hidden="true" />
                            <span className="text-text-hi">{cmd.result}</span>
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                    {state === 'done' && (
                      <motion.div
                        initial={reduced ? false : { opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: reduced ? 0 : 0.2, ease: EASE }}
                        className="mt-3 flex items-center gap-2.5 rounded-card-sm border border-gold/25 bg-gold/[0.06] p-3"
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/15">
                          <cmd.icon size={13} className="text-gold-soft" aria-hidden="true" />
                        </span>
                        <p className="caption">
                          {cmd.id === 'circles'
                            ? 'Navigated: Home → Circles · announced via screen reader'
                            : 'Speech synthesis · 1× speed · Kiswahili voice · tap anywhere to pause'}
                        </p>
                      </motion.div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* AI audio description */}
            <div className="mt-5 rounded-card-md border border-white/10 bg-ink-3/60 p-4">
              <div className="relative h-36 overflow-hidden rounded-card-sm">
                <img
                  src="/marketplace-hero.jpg"
                  alt="Fishing boat at golden hour near the Kigoma shoreline"
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-ink-3/80 to-transparent" aria-hidden="true" />
                <span className="absolute start-3 top-3">
                  <ProvenanceChip />
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <ArcButton size="sm" variant="indigo" onClick={runDescription} disabled={describing}>
                  {describing ? (
                    <>
                      <Square size={13} aria-hidden="true" /> Describing…
                    </>
                  ) : (
                    <>
                      <AudioLines size={15} aria-hidden="true" /> Listen to AI description
                    </>
                  )}
                </ArcButton>
                {describing && <Waveform active reduced={reduced} />}
              </div>
              <AnimatePresence>
                {descShown && (
                  <motion.p
                    initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    className="overflow-hidden pt-3 text-sm italic leading-relaxed text-text-mid"
                    aria-live="polite"
                  >
                    “{AUDIO_DESCRIPTION}”
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Dyslexia-friendly reading mode */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ duration: 0.7, delay: 0.12, ease: EASE }}
            className="cloud-card p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="mono-data flex items-center gap-2 text-[0.7rem] uppercase tracking-wider text-text-low">
                <Accessibility size={13} className="text-gold" aria-hidden="true" /> Reading mode
              </p>
              <button
                type="button"
                role="switch"
                aria-checked={dyslexiaMode}
                onClick={() => setDyslexiaMode((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors duration-200 ease-cloud-ease',
                  dyslexiaMode
                    ? 'border-gold/50 bg-gold/15 text-gold-soft'
                    : 'border-white/15 bg-white/5 text-text-mid hover:border-gold/30',
                )}
              >
                {dyslexiaMode ? (
                  <ToggleRight size={18} aria-hidden="true" />
                ) : (
                  <ToggleLeft size={18} aria-hidden="true" />
                )}
                Dyslexia-friendly
              </button>
            </div>

            <div
              className={cn(
                'mt-5 rounded-card-md border p-6 transition-colors duration-500 ease-cloud-ease',
                dyslexiaMode ? 'border-gold/30 bg-paper text-paper-ink' : 'border-white/10 bg-ink-3/60',
              )}
            >
              <motion.p
                animate={{
                  letterSpacing: dyslexiaMode ? '0.08em' : '0em',
                  lineHeight: dyslexiaMode ? 2.1 : 1.6,
                  fontSize: dyslexiaMode ? '1.125rem' : '0.95rem',
                  wordSpacing: dyslexiaMode ? '0.16em' : 'normal',
                }}
                transition={{ duration: 0.55, ease: EASE }}
                className={cn(dyslexiaMode ? 'font-sans font-medium' : 'text-text-hi')}
                style={{ fontFamily: dyslexiaMode ? 'Manrope, Verdana, sans-serif' : undefined }}
              >
                {READING_PARAGRAPH}
              </motion.p>
              <p
                className={cn(
                  'mono-data mt-4 text-[0.65rem] uppercase tracking-wider',
                  dyslexiaMode ? 'text-paper-ink/60' : 'text-text-low',
                )}
              >
                {dyslexiaMode
                  ? 'wider spacing · 2.1 line height · high-contrast paper'
                  : 'default reading style'}
              </p>
            </div>

            <ul className="mt-5 space-y-2.5">
              {[
                'Voice input always paired with a text alternative',
                'AI audio description available on every image post',
                'Reading preferences sync across devices — set once, everywhere',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2.5 text-sm text-text-mid">
                  <Check size={15} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                  {line}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/** Small image glyph chip for the described post. */
function ProvenanceChip() {
  return (
    <span className="mono-data inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-ink-3/80 px-2.5 py-1 text-[0.62rem] uppercase tracking-wider text-text-mid">
      <ImageIcon size={11} aria-hidden="true" /> image post
    </span>
  )
}
