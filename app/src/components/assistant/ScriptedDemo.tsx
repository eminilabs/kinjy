import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion, useInView } from 'framer-motion'
import { ArrowUpRight, Image as ImageIcon, Mic, Play, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProvenanceTag } from '@/components/ui-kit'
import DemoVideoPlayer from './DemoVideoPlayer'
import type { DemoClipStep } from './clip'
import { clipFromAnswer } from './clip'
import { Waveform } from './ChatPanel'
import Orb from './Orb'
import { KB_BY_ID } from './knowledgeBase'

/**
 * ScriptedDemo — the /assistant page Section 2: a full-scale, non-floating
 * replica of the production chat panel running a scripted, replayable
 * conversation proving (1) voice input, (2) dual response formats and
 * (3) automatic language mirroring (English → Kiswahili).
 */

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const Q1 = 'How do I change my feed algorithm?'
const Q2 = 'Nawezaje kuthibitisha mjomba wangu kwenye mti?'

const FEED_CLIP: DemoClipStep[] = [
  { caption: 'Open the gold mode chips above your feed.', target: { x: 30, y: 16 } },
  { caption: 'Tap "Change my algorithm" — the Marketplace opens.', target: { x: 70, y: 16 } },
  { caption: 'Pick Family First: each card says what it optimizes for.', target: { x: 30, y: 55 } },
  { caption: 'The feed reorders instantly — reversible any time.', target: { x: 68, y: 62 } },
  { caption: '"Why am I seeing this?" explains every recommendation.', target: { x: 44, y: 80 } },
]

function useTypewriter(text: string, active: boolean, cps = 26) {
  const [out, setOut] = useState('')
  useEffect(() => {
    if (!active) return
    let i = 0
    const id = setInterval(() => {
      i += 1
      setOut(text.slice(0, i))
      if (i >= text.length) clearInterval(id)
    }, 1000 / cps)
    return () => clearInterval(id)
  }, [text, active, cps])
  return active ? out : ''
}

function DemoTabs({ written, video }: { written: React.ReactNode; video: React.ReactNode }) {
  const [tab, setTab] = useState<'written' | 'video'>('written')
  return (
    <div className="mt-3">
      <div className="flex gap-1 rounded-full border border-white/10 bg-ink/50 p-1" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'written'}
          onClick={() => setTab('written')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[0.68rem] font-bold transition-colors',
            tab === 'written' ? 'bg-gold/90 text-ink' : 'text-text-mid hover:text-text-hi',
          )}
        >
          <ImageIcon size={11} aria-hidden="true" /> Written + images
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'video'}
          onClick={() => setTab('video')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[0.68rem] font-bold transition-colors',
            tab === 'video' ? 'bg-gold/90 text-ink' : 'text-text-mid hover:text-text-hi',
          )}
        >
          <Play size={11} aria-hidden="true" /> Video clip
        </button>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="pt-3"
        >
          {tab === 'written' ? written : video}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export default function ScriptedDemo() {
  const rootRef = useRef<HTMLDivElement>(null)
  const inView = useInView(rootRef, { once: true, margin: '-25%' })
  const [run, setRun] = useState(0)
  const [phase, setPhase] = useState(0)
  // phases: 0 idle · 1 listening q1 · 2 typing q1 · 3 answer1 · 4 listening q2 · 5 typing q2 · 6 answer2 (done)

  const started = inView || run > 0
  const q1 = useTypewriter(Q1, started && phase === 2)
  const q2 = useTypewriter(Q2, started && phase === 5)

  const feed = KB_BY_ID['algorithm-marketplace']
  const family = KB_BY_ID['family-tree']
  const familyClip = useMemo(() => clipFromAnswer(family.answer.sw), [family])

  /* phase machine */
  useEffect(() => {
    if (!started || phase !== 0) return
    const id = setTimeout(() => setPhase(1), 400)
    return () => clearTimeout(id)
  }, [started, phase])
  useEffect(() => {
    if (phase === 1) {
      const id = setTimeout(() => setPhase(2), 1400)
      return () => clearTimeout(id)
    }
    if (phase === 2 && q1.length >= Q1.length) {
      const id = setTimeout(() => setPhase(3), 700)
      return () => clearTimeout(id)
    }
    if (phase === 3) {
      const id = setTimeout(() => setPhase(4), 2600)
      return () => clearTimeout(id)
    }
    if (phase === 4) {
      const id = setTimeout(() => setPhase(5), 1400)
      return () => clearTimeout(id)
    }
    if (phase === 5 && q2.length >= Q2.length) {
      const id = setTimeout(() => setPhase(6), 700)
      return () => clearTimeout(id)
    }
  }, [phase, q1, q2])

  const replay = () => {
    setPhase(0)
    setRun((r) => r + 1)
  }

  const listening = phase === 1 || phase === 4

  return (
    <div ref={rootRef} className="cloud-card relative w-full overflow-hidden p-5 md:p-6">
      {/* Panel header replica */}
      <div className="mb-5 flex items-center gap-3 border-b border-white/10 pb-4">
        <Orb size={38} state={listening ? 'listening' : phase === 2 || phase === 5 ? 'thinking' : 'idle'} />
        <div>
          <p className="text-sm font-bold">Kinjy Assistant</p>
          <p className="caption text-[0.66rem]">live replica · scripted demo</p>
        </div>
        <span className="ms-auto rounded-full border border-sky/30 bg-sky/10 px-2.5 py-1 text-[0.62rem] font-bold text-sky">
          MEMBER
        </span>
      </div>

      <div className="space-y-4">
        {/* Exchange 1 — English voice question */}
        {phase >= 1 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="flex justify-end">
            <div className="max-w-[85%] rounded-card-md rounded-ee-sm bg-indigo/45 px-4 py-3 text-sm">
              <span className="mb-1.5 flex items-center gap-2 text-[0.6rem] font-bold uppercase tracking-widest text-sky">
                {phase === 1 ? <Waveform bars={8} /> : <Mic size={10} aria-hidden="true" />}
                Voice · English
              </span>
              {phase === 1 ? <span className="text-text-mid">Listening…</span> : q1}
            </div>
          </motion.div>
        )}

        {/* Answer 1 — dual format */}
        {phase >= 3 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }} className="flex justify-start">
            <div className="max-w-[94%] rounded-card-md rounded-es-sm border border-white/10 border-s-2 border-s-gold bg-white/[0.05] px-4 py-3">
              <p className="text-sm leading-relaxed">{feed.answer.en}</p>
              <DemoTabs
                written={
                  <div>
                    <ol className="mb-3 space-y-2">
                      {feed.steps?.map((step, i) => (
                        <li key={step} className="flex items-start gap-2.5 text-[0.8rem] text-text-mid">
                          <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-soft to-gold font-mono text-[0.58rem] font-bold text-ink">
                            {i + 1}
                          </span>
                          {step}
                        </li>
                      ))}
                    </ol>
                    <img src={feed.image} alt={feed.imageAlt} loading="lazy" className="mb-3 w-full rounded-card-sm border border-white/10" />
                    <Link
                      to={feed.deepLink?.to ?? '/feeds'}
                      className="inline-flex items-center gap-1.5 rounded-full border border-sky/30 bg-sky/10 px-3 py-1.5 text-[0.68rem] font-bold text-sky hover:border-sky/60"
                    >
                      Open in app: {feed.deepLink?.label} <ArrowUpRight size={11} aria-hidden="true" />
                    </Link>
                  </div>
                }
                video={<DemoVideoPlayer title="Feed algorithms in 42 seconds" steps={FEED_CLIP} />}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ProvenanceTag kind="ai-generated" />
                <span className="font-mono text-[0.6rem] text-text-low">From: {feed.module} · updated {feed.version}</span>
              </div>
            </div>
          </motion.div>
        )}

        {/* Exchange 2 — Kiswahili voice question */}
        {phase >= 4 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }} className="flex justify-end">
            <div className="max-w-[85%] rounded-card-md rounded-ee-sm bg-indigo/45 px-4 py-3 text-sm">
              <span className="mb-1.5 flex items-center gap-2 text-[0.6rem] font-bold uppercase tracking-widest text-sky">
                {phase === 4 ? <Waveform bars={8} /> : <Mic size={10} aria-hidden="true" />}
                Voice · Kiswahili
              </span>
              {phase === 4 ? <span className="text-text-mid">Inasikiliza…</span> : q2}
            </div>
          </motion.div>
        )}

        {/* Answer 2 — mirrored in Kiswahili */}
        {phase >= 6 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }} className="flex justify-start">
            <div className="max-w-[94%] rounded-card-md rounded-es-sm border border-white/10 border-s-2 border-s-gold bg-white/[0.05] px-4 py-3">
              <p className="mb-2 inline-flex rounded-full border border-sky/30 bg-sky/10 px-2.5 py-1 text-[0.62rem] font-bold text-sky">
                Replying in Kiswahili · matches your language automatically
              </p>
              <p className="text-sm leading-relaxed">{family.answer.sw}</p>
              <DemoTabs
                written={
                  <img src={family.image} alt={family.imageAlt} loading="lazy" className="w-full rounded-card-sm border border-white/10" />
                }
                video={<DemoVideoPlayer title="Onyesho la demo · Uthibitisho wa familia" steps={familyClip} lang="sw" />}
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ProvenanceTag kind="ai-generated" />
                <span className="font-mono text-[0.6rem] text-text-low">Kutoka: {family.module} · updated {family.version}</span>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Replay */}
      <div className="mt-5 flex justify-center border-t border-white/10 pt-4">
        <button
          type="button"
          onClick={replay}
          className="inline-flex items-center gap-2 rounded-full cloud-glass px-4 py-2 text-[0.72rem] font-bold text-text-mid transition-colors hover:text-gold-soft"
        >
          <RotateCcw size={12} aria-hidden="true" /> Replay the conversation
        </button>
      </div>
    </div>
  )
}
