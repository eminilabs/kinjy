import { useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { CalendarClock, Clapperboard, FileText, Image, Languages, Mic, Newspaper, Sparkles, Wand2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { avatarStyle, useAppTheme } from './theme'
import type { ReactNode } from 'react'

type Format = 'post' | 'video' | 'audio' | 'article' | 'newsletter'

const FORMAT_META: Record<Format, { icon: typeof Image; label: string; preview: string; accent: string }> = {
  post: { icon: Image, label: 'Photo post', preview: 'Square card · caption + tags', accent: 'from-gold/40 to-gold/10' },
  video: { icon: Clapperboard, label: 'Short video', preview: '9:16 · auto-captions ×4 languages', accent: 'from-coral/40 to-coral/10' },
  audio: { icon: Mic, label: 'Audio note', preview: 'Waveform card · 90s max', accent: 'from-sky/40 to-sky/10' },
  article: { icon: FileText, label: 'Article', preview: 'Long-form · SEO-ready headline', accent: 'from-indigo/50 to-indigo/15' },
  newsletter: { icon: Newspaper, label: 'Newsletter', preview: 'Email + feed digest · weekly', accent: 'from-success/40 to-success/10' },
}

const COPILOT_SUGGESTIONS = [
  'Tighten the hook — first 8 words decide the scroll',
  'Add a question to double comment rate',
  'Translate to Kiswahili, Français, العربية, 中文',
]

interface Props {
  orb?: ReactNode
}

/** Create module — AI copilot + One-to-Many format morph + schedule row. */
export default function CreateModule({ orb }: Props) {
  const { t, tok } = useAppTheme()
  const [formats, setFormats] = useState<Format[]>(['post', 'video'])
  const primary = formats[formats.length - 1] ?? 'post'
  const Meta = FORMAT_META[primary]

  const toggle = (f: Format) =>
    setFormats((fs) => (fs.includes(f) ? fs.filter((x) => x !== f) : [...fs, f]))

  return (
    <div className="grid h-full gap-3.5 lg:grid-cols-[1fr_260px]">
      {/* composer + copilot */}
      <div className={cn('flex flex-col rounded-card-lg p-4', tok.card)}>
        {/* toolbar with orb docked beside it */}
        <div className="flex items-center gap-2">
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-full', tok.subtleBg)}>
            <Wand2 size={15} className="text-gold" aria-hidden="true" />
          </span>
          <p className={cn('text-sm font-bold', tok.text)}>Create studio</p>
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo/25 px-2.5 py-1 text-[0.65rem] font-bold text-sky">
            <Sparkles size={10} aria-hidden="true" /> AI copilot
          </span>
          {/* orb anchor: docked right of the composer toolbar */}
          <span className="ms-auto">{orb}</span>
        </div>

        <div className="mt-3 flex items-start gap-3">
          <span className="h-10 w-10 shrink-0 rounded-full bg-cover ring-1 ring-gold/30" style={avatarStyle(0)} aria-hidden="true" />
          <textarea
            rows={3}
            placeholder={t('share')}
            defaultValue="Grandma's sukuma wiki recipe — the one that raised three generations…"
            className={cn('min-w-0 flex-1 resize-none rounded-card-md p-3 text-sm outline-none focus:ring-1 focus:ring-gold/50', tok.input, tok.text)}
          />
        </div>

        {/* One-to-Many format chips */}
        <p className={cn('mb-2 mt-4 text-[0.68rem] font-bold uppercase tracking-wider', tok.low)}>
          One-to-Many · pick every format this becomes
        </p>
        <div className="flex flex-wrap gap-1.5">
          {(Object.keys(FORMAT_META) as Format[]).map((f) => {
            const M = FORMAT_META[f]
            const on = formats.includes(f)
            return (
              <motion.button
                key={f}
                type="button"
                onClick={() => toggle(f)}
                whileTap={{ scale: 0.96 }}
                aria-pressed={on}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                  on ? 'bg-gradient-to-br from-gold-soft to-gold text-ink' : cn(tok.subtleBg, tok.mid, tok.hoverBg),
                )}
              >
                <M.icon size={12} aria-hidden="true" /> {M.label}
              </motion.button>
            )
          })}
          <span className="inline-flex items-center gap-1.5 rounded-full border border-sky/35 bg-sky/10 px-3 py-1.5 text-xs font-semibold text-sky">
            <Languages size={12} aria-hidden="true" /> Translate ×4 auto
          </span>
        </div>

        {/* copilot suggestions */}
        <div className="mt-4 space-y-1.5">
          {COPILOT_SUGGESTIONS.map((s, i) => (
            <motion.button
              key={s}
              type="button"
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.12, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className={cn('flex w-full items-center gap-2 rounded-card-sm border border-indigo/25 bg-indigo/10 px-3 py-2 text-start text-xs text-sky transition-colors hover:bg-indigo/20')}
            >
              <Sparkles size={11} aria-hidden="true" /> {s}
            </motion.button>
          ))}
        </div>

        {/* schedule row with Basic upsell */}
        <div className={cn('mt-auto flex items-center gap-2.5 border-t pt-3.5', tok.divider.replace('divide-', 'border-'))}>
          <CalendarClock size={15} className={tok.low} aria-hidden="true" />
          <span className={cn('text-xs', tok.mid)}>Schedule for Sat 9:00 AM — peak family-circle hour</span>
          <Link
            to="/pricing"
            className="ms-auto inline-flex items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-[0.65rem] font-bold text-gold-soft transition-colors hover:bg-gold/20"
          >
            Scheduling is Basic · $3.99/mo ↑
          </Link>
        </div>
      </div>

      {/* morphing preview card */}
      <div className={cn('relative overflow-hidden rounded-card-lg p-4', tok.card)}>
        <p className={cn('mb-3 text-[0.68rem] font-bold uppercase tracking-wider', tok.low)}>Live preview</p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={primary}
            layoutId="create-preview-morph"
            initial={{ opacity: 0, scale: 0.92, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: -10 }}
            transition={{ duration: 0.56, ease: [0.22, 1, 0.36, 1] }}
            className={cn('flex aspect-[4/5] flex-col items-center justify-center gap-3 rounded-card-md bg-gradient-to-br', Meta.accent)}
          >
            <Meta.icon size={34} className="text-text-hi/90" aria-hidden="true" />
            <p className="text-sm font-bold text-text-hi">{Meta.label}</p>
            <p className="px-4 text-center text-[0.68rem] text-text-hi/70">{Meta.preview}</p>
          </motion.div>
        </AnimatePresence>
        <p className={cn('mt-3 text-center text-[0.65rem]', tok.low)}>
          {formats.length} format{formats.length === 1 ? '' : 's'} · 4 translations · 1 idea
        </p>
      </div>
    </div>
  )
}
