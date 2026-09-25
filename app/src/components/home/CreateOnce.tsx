import { useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Languages, PenLine, Sparkles } from 'lucide-react'
import { ModeChip } from '@/components/ui-kit'
import MorphCard, { type Format } from './MorphCard'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const LANG_CARDS = [
  { code: 'EN', text: 'One idea becomes every format.' },
  { code: 'SW', text: 'Wazo moja linakuwa kila umbo.' },
  { code: 'FR', text: 'Une idée devient tous les formats.' },
  { code: '中文', text: '一个想法，变成所有形式。' },
]

/** Section 5 — "Create once. Speak everywhere." One-to-Many + translation demo. */
export default function CreateOnce() {
  const [format, setFormat] = useState<Format | undefined>(undefined)
  const [translated, setTranslated] = useState(false)
  const [interacted, setInteracted] = useState(false)

  const pickFormat = (f: Format) => {
    setInteracted(true)
    setFormat(f)
  }

  return (
    <section className="noise-overlay relative overflow-hidden bg-ink px-6 py-24 md:py-32">
      {/* Backdrop accent.
          This used to be the raw photo at opacity-15 with a rounded-rectangle
          edge, hanging 145px off the right of the viewport: at that opacity the
          image is unreadable, so it registered as a smudge with a hard border
          rather than as an accent. Same photo, now dissolved by a radial mask
          and pulled fully inside the fold, so it reads as a glow. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 top-1/2 hidden h-[520px] w-[520px] -translate-y-1/2 bg-cover bg-center opacity-[0.12] lg:block"
        style={{
          backgroundImage: 'url(/creator-formats.jpg)',
          maskImage: 'radial-gradient(circle at 50% 50%, black 0%, transparent 68%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 50%, black 0%, transparent 68%)',
        }}
      />
      <div className="relative mx-auto grid max-w-container items-center gap-14 lg:grid-cols-2">
        {/* Left: interactive demo */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <div className="cloud-card mb-5 flex items-center gap-3 p-4">
            <PenLine size={18} className="text-gold" aria-hidden="true" />
            <span className="text-text-mid">Share your idea…</span>
            <span className="ms-auto inline-flex items-center gap-1.5 rounded-full bg-indigo/25 px-3 py-1 text-xs font-semibold text-sky">
              <Sparkles size={12} aria-hidden="true" /> AI copilot
            </span>
          </div>

          <div className="relative">
            <MorphCard
              format={format}
              onFormatChange={pickFormat}
              autoCycle={!interacted}
              className="w-full max-w-[340px]"
            />
            <AnimatePresence>
              {translated && (
                <motion.div className="absolute -right-2 top-6 hidden sm:block" initial="hidden" animate="show" exit="hidden">
                  {LANG_CARDS.map((l, i) => (
                    <motion.div
                      key={l.code}
                      variants={{
                        hidden: { opacity: 0, x: 0, y: 0, rotate: 0 },
                        show: { opacity: 1, x: 18 + i * 26, y: i * 34, rotate: (i - 1.5) * 3 },
                      }}
                      transition={{ delay: i * 0.08, duration: 0.45, ease: EASE }}
                      className="cloud-card absolute w-44 p-3"
                    >
                      <p className="mono-data text-[0.68rem] text-gold-soft">{l.code} · AI</p>
                      <p className="mt-1 text-xs leading-snug text-text-hi/90">{l.text}</p>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {(['Article', 'Short video', 'Audio', 'Newsletter'] as Format[]).map((f) => (
              <ModeChip key={f} label={f} active={format === f} onClick={() => pickFormat(f)} />
            ))}
            <ModeChip
              label="Translated ×4"
              icon={<Languages size={13} aria-hidden="true" />}
              active={translated}
              onClick={() => setTranslated((v) => !v)}
            />
          </div>
        </motion.div>

        {/* Right: copy */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-20%' }}
          transition={{ duration: 0.7, ease: EASE }}
        >
          <p className="eyebrow text-gold">Creator Studio</p>
          <h2 className="h2 mt-4">One idea becomes every format, in every language.</h2>
          <ul className="mt-6 space-y-4">
            {[
              'AI copilot drafts, crops and schedules for you',
              'Voice-preserving dubbing with lip sync — still unmistakably you',
              'Side-by-side translation view on every post',
              'Publish to all fifteen modules at once',
            ].map((b) => (
              <li key={b} className="flex items-start gap-3 text-text-mid">
                <svg width="18" height="14" viewBox="0 0 18 14" className="mt-1.5 shrink-0" aria-hidden="true">
                  <path d="M1 12 Q 9 -2 17 12" fill="none" stroke="#D9A648" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
                {b}
              </li>
            ))}
          </ul>
          <Link
            to="/creators"
            className="mt-8 inline-flex items-center gap-2 font-semibold text-gold-soft transition-all hover:gap-3"
          >
            See Creator Studio <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
