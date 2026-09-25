import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Captions, Pause, Play, RotateCcw } from 'lucide-react'
import type { Lang } from './knowledgeBase'
import { LANG_META } from './knowledgeBase'
import type { DemoClipStep } from './clip'
import { DEFAULT_TARGETS } from './clip'

export interface DemoVideoPlayerProps {
  title: string
  steps: DemoClipStep[]
  /** ms per caption step (default 3200 → typical clips run 15–30s). */
  stepMs?: number
  thumbnail?: string
  lang?: Lang
}

/**
 * DemoVideoPlayer — the assistant's "video clip" response format.
 * No real mp4 exists in this environment: this is a scripted in-app animated
 * player simulating a screen recording — thumbnail + play button, progress
 * bar, timed captions in the user's language, and an animated mock-UI frame
 * with a gold cursor gliding between steps.
 */
export default function DemoVideoPlayer({ title, steps, stepMs = 3200, thumbnail = '/assistant-video-thumb.jpg', lang = 'en' }: DemoVideoPlayerProps) {
  const reduced = useReducedMotion()
  const [playing, setPlaying] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const frameRef = useRef<HTMLDivElement>(null)
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 })

  const total = steps.length * stepMs
  const done = elapsed >= total
  const stepIdx = Math.min(steps.length - 1, Math.floor(elapsed / stepMs))
  const step = steps[stepIdx]
  const target = step?.target ?? DEFAULT_TARGETS[0]
  const dir = LANG_META[lang].dir

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => setElapsed((e) => Math.min(e + 100, total)), 100)
    return () => clearInterval(id)
  }, [playing, total])

  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const measure = () => setFrameSize({ w: el.offsetWidth, h: el.offsetHeight })
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [playing])

  const toggle = () => {
    if (done) {
      setElapsed(0)
      setPlaying(true)
      return
    }
    setPlaying((p) => !p)
  }

  const cursor = useMemo(
    () => ({ x: (target.x / 100) * frameSize.w, y: (target.y / 100) * frameSize.h }),
    [target, frameSize],
  )

  return (
    <div dir={dir} className="overflow-hidden rounded-card-md border border-white/10 bg-ink/60">
      {/* Screen area */}
      <div ref={frameRef} className="relative aspect-video w-full select-none">
        {!playing && elapsed === 0 ? (
          /* Thumbnail state */
          <button
            type="button"
            onClick={toggle}
            className="group absolute inset-0 block h-full w-full"
            aria-label={`Play: ${title}`}
          >
            <img src={thumbnail} alt="" className="h-full w-full object-cover" />
            <span className="absolute inset-0 bg-ink/35 transition-colors group-hover:bg-ink/25" />
            <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-br from-gold-soft to-gold text-ink shadow-[0_4px_20px_rgba(217,166,72,0.55)] transition-transform group-hover:scale-105">
              <Play size={20} className="ms-0.5" fill="currentColor" aria-hidden="true" />
            </span>
            <span className="absolute bottom-2 left-2 rounded-full bg-ink/70 px-2.5 py-1 text-[0.68rem] font-semibold text-text-hi backdrop-blur">
              {title}
            </span>
          </button>
        ) : (
          /* Simulated screen recording */
          <div className="absolute inset-0 overflow-hidden bg-gradient-to-br from-ink-2 to-ink">
            {/* Mock UI skeleton */}
            <div className="absolute inset-x-3 top-3 flex items-center gap-1.5" aria-hidden="true">
              {['Following', 'For You', 'Family', 'Local'].map((chip, i) => (
                <span
                  key={chip}
                  className={
                    i === 1
                      ? 'rounded-full bg-gold/90 px-2.5 py-1 text-[0.6rem] font-bold text-ink'
                      : 'rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[0.6rem] text-text-mid'
                  }
                >
                  {chip}
                </span>
              ))}
            </div>
            <div className="absolute inset-x-3 bottom-3 top-11 grid grid-cols-2 gap-2" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-card-sm border border-white/10 bg-white/[0.05] p-2">
                  <div className="mb-1.5 h-1.5 w-3/5 rounded bg-white/15" />
                  <div className="h-1.5 w-4/5 rounded bg-white/10" />
                  <div className="mt-1.5 h-1.5 w-2/5 rounded bg-gold/30" />
                </div>
              ))}
            </div>

            {/* Target highlight ring */}
            <motion.div
              className="absolute h-10 w-10 rounded-full border-2 border-gold"
              style={{ left: 0, top: 0, x: cursor.x - 20, y: cursor.y - 20 }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.9, 0.5, 0.9] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden="true"
            />
            {/* Gold cursor */}
            <motion.div
              className="absolute z-10 h-3.5 w-3.5 rounded-full bg-gold-soft shadow-[0_0_12px_rgba(240,200,120,0.9)] ring-4 ring-gold/25"
              style={{ left: 0, top: 0 }}
              animate={{ x: cursor.x - 7, y: cursor.y - 7 }}
              transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 180, damping: 22 }}
              aria-hidden="true"
            />

            {/* Caption bar */}
            <div className="absolute inset-x-0 bottom-0 bg-ink/85 px-3 py-2 backdrop-blur" dir={dir}>
              <p className="flex items-start gap-1.5 text-[0.72rem] leading-snug text-text-hi">
                <Captions size={12} className="mt-0.5 shrink-0 text-gold-soft" aria-hidden="true" />
                <span>{step?.caption}</span>
              </p>
            </div>

            {/* Step counter */}
            <span className="absolute end-2 top-2 rounded-full bg-ink/70 px-2 py-0.5 font-mono text-[0.62rem] text-text-mid">
              {stepIdx + 1}/{steps.length}
            </span>
          </div>
        )}
      </div>

      {/* Control bar */}
      <div className="flex items-center gap-2.5 border-t border-white/10 px-3 py-2">
        <button
          type="button"
          onClick={toggle}
          className="flex h-7 w-7 items-center justify-center rounded-full cloud-glass text-gold-soft transition-colors hover:text-gold"
          aria-label={done ? 'Replay clip' : playing ? 'Pause clip' : 'Play clip'}
        >
          {done ? <RotateCcw size={13} /> : playing ? <Pause size={13} /> : <Play size={13} className="ms-0.5" />}
        </button>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-valuenow={Math.round((elapsed / total) * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold-soft to-gold transition-[width] duration-100 ease-linear"
            style={{ width: `${(elapsed / total) * 100}%` }}
          />
        </div>
        <span className="font-mono text-[0.62rem] text-text-low">
          {String(Math.floor(elapsed / 1000)).padStart(1, '0')}s / {Math.round(total / 1000)}s
        </span>
      </div>
    </div>
  )
}
