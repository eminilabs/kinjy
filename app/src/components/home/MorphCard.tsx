import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FileText, Mail, Play } from 'lucide-react'
import { cn } from '@/lib/utils'

export const FORMATS = ['Article', 'Short video', 'Audio', 'Newsletter'] as const
export type Format = (typeof FORMATS)[number]

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

function ArticleGlyph() {
  return (
    <div className="space-y-2.5 p-1" aria-hidden="true">
      <div className="h-2 w-1/2 rounded-full bg-gold-soft/90" />
      <div className="h-1.5 w-full rounded-full bg-white/25" />
      <div className="h-1.5 w-11/12 rounded-full bg-white/25" />
      <div className="h-1.5 w-full rounded-full bg-white/25" />
      <div className="h-1.5 w-2/3 rounded-full bg-white/25" />
    </div>
  )
}

function VideoGlyph() {
  return (
    <div className="flex h-full items-center justify-center" aria-hidden="true">
      <div className="relative flex aspect-[9/16] h-36 items-center justify-center rounded-card-sm border border-indigo/60 bg-indigo/25">
        <Play size={26} className="fill-gold-soft text-gold-soft" />
      </div>
    </div>
  )
}

function AudioGlyph() {
  return (
    <div className="flex h-full items-center justify-center gap-1.5" aria-hidden="true">
      {[0.5, 0.9, 1.3, 0.7, 1.1, 0.6, 0.95, 0.55].map((d, i) => (
        <span
          key={i}
          className="w-1.5 origin-center animate-wave-bar rounded-full bg-sky"
          style={{ height: 44, animationDelay: `${i * 0.12}s`, animationDuration: `${d}s` }}
        />
      ))}
    </div>
  )
}

function NewsletterGlyph() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3" aria-hidden="true">
      <Mail size={34} className="text-gold-soft" strokeWidth={1.5} />
      <div className="h-1.5 w-24 rounded-full bg-white/25" />
      <div className="h-1.5 w-16 rounded-full bg-white/25" />
    </div>
  )
}

const GLYPHS: Record<Format, () => React.JSX.Element> = {
  Article: ArticleGlyph,
  'Short video': VideoGlyph,
  Audio: AudioGlyph,
  Newsletter: NewsletterGlyph,
}

/**
 * MorphCard — the One-to-Many card: one idea cycling through 4 content formats
 * with a shared-element morph (560ms cloud-ease).
 */
export default function MorphCard({
  format,
  onFormatChange,
  autoCycle = true,
  cycleMs = 4000,
  className,
}: {
  format?: Format
  onFormatChange?: (f: Format) => void
  autoCycle?: boolean
  cycleMs?: number
  className?: string
}) {
  const [internal, setInternal] = useState<Format>('Article')
  const active = format ?? internal

  useEffect(() => {
    if (!autoCycle || format !== undefined) return
    const id = setInterval(() => {
      setInternal((cur) => FORMATS[(FORMATS.indexOf(cur) + 1) % FORMATS.length])
    }, cycleMs)
    return () => clearInterval(id)
  }, [autoCycle, cycleMs, format])

  const Glyph = GLYPHS[active]

  return (
    <div className={cn('cloud-card w-[280px] p-5', className)}>
      <div className="mb-4 flex items-center gap-2">
        <FileText size={14} className="text-gold" aria-hidden="true" />
        <span className="caption">One idea, everywhere</span>
      </div>
      <div className="relative h-44 overflow-hidden rounded-card-md border border-white/10 bg-ink-3/60 p-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            layoutId={format !== undefined ? `morph-${active}` : undefined}
            initial={{ opacity: 0, scale: 0.94, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.56, ease: EASE }}
            className="h-full"
          >
            <Glyph />
          </motion.div>
        </AnimatePresence>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {FORMATS.map((f) => (
            <button
              key={f}
              type="button"
              aria-label={f}
              onClick={() => (onFormatChange ? onFormatChange(f) : setInternal(f))}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                f === active ? 'w-5 bg-gold' : 'w-1.5 bg-white/25 hover:bg-white/50',
              )}
            />
          ))}
        </div>
        <span className="mono-data text-gold" style={{ fontSize: '0.7rem' }}>
          1 idea → 4 formats
        </span>
      </div>
    </div>
  )
}
