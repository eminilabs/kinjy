import { useEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ProvenanceTag } from '@/components/ui-kit'

const cloudEase = [0.22, 1, 0.36, 1] as [number, number, number, number]

const TIMELINE = [
  { year: '1962', label: 'Grandfather’s first letter home' },
  { year: '1979', label: 'The veranda photograph' },
  { year: '2004', label: 'A voice recording, digitized' },
  { year: '2025', label: 'Restored by Heritage AI' },
]

/**
 * Family Heritage AI visual stack (family.md §5): tilted polaroid archive
 * card, a draggable before/after restore slider (originals always
 * preserved, enhanced copies labeled AI Assisted), and a gold timeline.
 */
export default function HeritageShowcase() {
  const reduced = useReducedMotion()
  const [pos, setPos] = useState(50)
  const [interacted, setInteracted] = useState(false)
  const dragRef = useRef(false)
  const boxRef = useRef<HTMLDivElement>(null)

  // gentle idle sway until first drag
  useEffect(() => {
    if (interacted || reduced) return
    let raf = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      setPos(50 + Math.sin((t - t0) / 1400) * 6)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [interacted, reduced])

  const updateFromClientX = (clientX: number) => {
    const box = boxRef.current
    if (!box) return
    const rect = box.getBoundingClientRect()
    const pct = ((clientX - rect.left) / rect.width) * 100
    setPos(Math.min(96, Math.max(4, pct)))
  }

  return (
    <div className="space-y-8">
      {/* 1 — polaroid archive card */}
      <motion.figure
        initial={reduced ? false : { opacity: 0, rotate: -6, y: 24 }}
        whileInView={{ opacity: 1, rotate: -2, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6, ease: cloudEase }}
        className="mx-auto max-w-md rounded-card-md bg-[#FFFDF8] p-3 pb-5 shadow-[0_24px_50px_-18px_rgba(36,31,22,0.4)]"
      >
        <img
          src="/family-archive-2.jpg"
          alt="Archival flat-lay: old letters, a fountain pen, a sepia portrait and an audio cassette on cream linen"
          className="aspect-[16/9] w-full rounded-card-sm object-cover"
          loading="lazy"
        />
        <figcaption className="mt-3 flex items-center justify-between px-1">
          <span className="font-display text-sm italic text-[#5A5245]">The Mushi family archive — scanned, searchable</span>
          <ProvenanceTag kind="original" />
        </figcaption>
      </motion.figure>

      {/* 2 — before/after restore slider */}
      <div>
        <div
          ref={boxRef}
          className="relative aspect-[16/9] w-full cursor-ew-resize touch-none select-none overflow-hidden rounded-card-lg border border-[#241F16]/10 shadow-[0_24px_50px_-18px_rgba(36,31,22,0.35)]"
          onPointerDown={(e) => {
            setInteracted(true)
            dragRef.current = true
            e.currentTarget.setPointerCapture(e.pointerId)
            updateFromClientX(e.clientX)
          }}
          onPointerMove={(e) => {
            if (dragRef.current) updateFromClientX(e.clientX)
          }}
          onPointerUp={() => {
            dragRef.current = false
          }}
          role="slider"
          aria-label="Compare original and AI-restored photograph"
          aria-valuenow={Math.round(pos)}
          aria-valuemin={0}
          aria-valuemax={100}
          tabIndex={0}
          onKeyDown={(e) => {
            setInteracted(true)
            if (e.key === 'ArrowLeft') setPos((p) => Math.max(4, p - 4))
            if (e.key === 'ArrowRight') setPos((p) => Math.min(96, p + 4))
          }}
        >
          {/* Original — preserved (faded) */}
          <img
            src="/family-archive-3.jpg"
            alt="Original 1960s family portrait, faded and scratched — preserved as uploaded"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: 'sepia(0.55) brightness(0.82) contrast(0.78) saturate(0.7)' }}
            draggable={false}
          />
          {/* Enhanced copy — clipped to the right of the divider */}
          <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
            <img
              src="/family-archive-3.jpg"
              alt="The same portrait cleanly restored by Family Heritage AI"
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
          </div>
          {/* divider handle */}
          <div className="absolute inset-y-0" style={{ left: `${pos}%` }}>
            <div className="absolute inset-y-0 -left-px w-0.5 bg-[#F0C878] shadow-[0_0_12px_rgba(240,200,120,0.8)]" />
            <span className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#D9A648] bg-[#241F16] px-2.5 py-1.5 text-[0.65rem] font-bold tracking-widest text-[#F0C878] shadow-lg">
              ◂ ▸
            </span>
          </div>
          <span className="absolute left-3 top-3 rounded-full bg-[#241F16]/80 px-3 py-1 text-[0.68rem] font-semibold text-[#F6F1E7] backdrop-blur-sm">
            Original — preserved
          </span>
          <span className="absolute right-3 top-3">
            <ProvenanceTag kind="ai-assisted" className="!bg-[#241F16]/80 backdrop-blur-sm" />
          </span>
        </div>
        <p className="caption mt-2 !text-[#6B5F4E]">
          Enhanced copy — <strong>AI Assisted</strong>. The original file is never altered;
          both live side-by-side in the archive.
        </p>
      </div>

      {/* 3 — interactive timeline strip */}
      <div className="relative pt-2">
        <div className="absolute left-0 right-0 top-[1.35rem] h-px bg-[#D9A648]/40" aria-hidden="true" />
        <ol className="relative grid grid-cols-4 gap-2">
          {TIMELINE.map((t, i) => (
            <motion.li
              key={t.year}
              initial={reduced ? false : { opacity: 0, y: 16, scale: 0.85 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.8 }}
              transition={{ delay: i * 0.12, duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
              className="flex flex-col items-center text-center"
            >
              <span className="z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#D9A648] bg-[#FFFDF8]">
                <span className="h-2 w-2 rounded-full bg-[#D9A648]" />
              </span>
              <span className="mono-data mt-2 text-[0.72rem] font-semibold text-[#9A6B1F]">{t.year}</span>
              <span className="caption mt-0.5 !text-[#6B5F4E]">{t.label}</span>
            </motion.li>
          ))}
        </ol>
      </div>
    </div>
  )
}
