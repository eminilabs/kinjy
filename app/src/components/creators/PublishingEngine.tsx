import { useRef, useState } from 'react'
import { pinLength } from '@/lib/pinLength'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { AnimatePresence, motion } from 'framer-motion'
import { Clapperboard, FileText, Images, Languages, Mic, Newspaper, Sparkles, Video } from 'lucide-react'
import { Eyebrow, Stage } from '@/components/landing/PageKit'
import { cn } from '@/lib/utils'
import { EASE, useReducedMotion } from './motion-utils'

gsap.registerPlugin(ScrollTrigger)

const FORMATS = [
  { id: 'article', label: 'Article', icon: FileText },
  { id: 'short', label: 'Short video', icon: Clapperboard },
  { id: 'long', label: 'Long video', icon: Video },
  { id: 'audio', label: 'Audio', icon: Mic },
  { id: 'carousel', label: 'Carousel', icon: Images },
  { id: 'newsletter', label: 'Newsletter', icon: Newspaper },
  { id: 'translations', label: 'Translations ×N', icon: Languages },
] as const

type FormatId = (typeof FORMATS)[number]['id']

const PIPELINE = [
  'speech', 'transcript', 'translation', 'subtitles', 'AI dubbing', 'voice-preserving dubbing', 'lip sync',
]

const LANG_VARIANTS = [
  { code: 'EN', text: 'Sunrise over Msasani Bay' },
  { code: 'SW', text: 'Macheo juu ya Ghuba ya Msasani' },
  { code: 'FR', text: 'Lever du soleil sur la baie de Msasani' },
  { code: '中文', text: '姆萨萨尼湾的日出' },
]

const BEAT_COPY = [
  { title: 'Start with one idea.', body: 'A title, a thought, a voice note — that is all the engine needs.' },
  {
    title: 'The engine renders every format.',
    body: 'Layout, captions, cuts and all — seven publish-ready artifacts from a single idea card.',
  },
  {
    title: 'Your voice, every language.',
    body: 'Tone preserved and lips in sync — a seven-step pipeline from speech to a dubbed, localized you.',
  },
]

/** Format-specific mini chrome inside each format card. */
function FormatChrome({ id }: { id: FormatId }) {
  switch (id) {
    case 'article':
      return (
        <div className="mt-2 space-y-1.5">
          {[92, 100, 76, 88].map((w) => (
            <span key={w} className="block h-1.5 rounded-full bg-[var(--kl-paper-2)]" style={{ width: `${w}%` }} />
          ))}
        </div>
      )
    case 'short':
      return (
        <div className="mx-auto mt-2 flex aspect-[9/16] w-12 items-center justify-center rounded-[8px] bg-gradient-to-b from-[#C9CDF5] to-[#F0C878]">
          <Clapperboard size={14} className="text-[#241F16]" aria-hidden="true" />
        </div>
      )
    case 'long':
      return (
        <div className="mt-3">
          <div className="h-14 rounded-[8px] bg-gradient-to-r from-[#E3ECF7] via-[#C9CDF5] to-[#F6EBD3]" />
          <div className="mt-2 h-1 rounded-full bg-[var(--kl-paper-2)]">
            <div className="kl-sheen h-full w-2/3 rounded-full" />
          </div>
          <p className="kl-mono mt-1 text-[10px] text-[var(--kl-low)]">08:12 / 12:08</p>
        </div>
      )
    case 'audio':
      return (
        <div className="mt-3 flex h-10 items-end justify-center gap-[3px]" aria-hidden="true">
          {[0.5, 0.9, 0.6, 1, 0.7, 0.85, 0.55, 0.95, 0.65, 0.8, 0.5, 0.75].map((h, i) => (
            <motion.span
              key={i}
              className="w-[3px] rounded-full bg-[#8FB8E8]"
              animate={{ scaleY: [h, Math.min(1, h + 0.35), h] }}
              transition={{ duration: 0.9 + (i % 4) * 0.15, repeat: Infinity, ease: 'easeInOut' }}
              style={{ height: '100%', transformOrigin: 'bottom' }}
            />
          ))}
        </div>
      )
    case 'carousel':
      return (
        <div className="mt-2 flex gap-1.5" aria-hidden="true">
          {['from-[#F0C878] to-[#F2B8A2]', 'from-[#C9CDF5] to-[#E3ECF7]', 'from-[#E3ECF7] to-[#F6EBD3]', 'from-[#F7E1D8] to-[#F0C878]'].map(
            (g) => (
              <span key={g} className={cn('h-12 flex-1 rounded-[6px] bg-gradient-to-br', g)} />
            ),
          )}
        </div>
      )
    case 'newsletter':
      return (
        <div className="mt-2">
          <div className="rounded-t-[6px] bg-[#F6EBD3] px-2 py-1">
            <p className="kl-serif text-[11px] italic text-[#8A6414]">The Msasani Letter</p>
          </div>
          <div className="space-y-1 rounded-b-[6px] border border-[var(--kl-paper-2)] p-2">
            {[100, 80, 90].map((w) => (
              <span key={w} className="block h-1 rounded-full bg-[var(--kl-paper-2)]" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      )
    case 'translations':
      return (
        <div className="mt-2 flex flex-wrap gap-1" aria-hidden="true">
          {['EN', 'SW', 'FR', '中文', '+N'].map((l) => (
            <span key={l} className="kl-mono rounded-full bg-[#E3ECF7] px-1.5 py-0.5 text-[10px] text-[#2F6BA8]">
              {l}
            </span>
          ))}
        </div>
      )
  }
}

function FormatCard({ id, label, icon: Icon, className }: { id: FormatId; label: string; icon: typeof FileText; className?: string }) {
  return (
    <div className={cn('w-[150px] shrink-0 rounded-2xl bg-[var(--kl-surface)] p-3 shadow-[0_18px_36px_-26px_var(--kl-shadow)]', className)}>
      <div className="flex items-center gap-1.5">
        <Icon size={14} className="text-[var(--kl-gold-deep)]" aria-hidden="true" />
        <p className="text-xs font-semibold">{label}</p>
      </div>
      <FormatChrome id={id} />
    </div>
  )
}

/** Section 2 — One-to-Many Publishing Engine: pinned 3-beat scroll narrative. */
export default function PublishingEngine() {
  const reduced = useReducedMotion()
  const rootRef = useRef<HTMLElement>(null)
  const [beat, setBeat] = useState(0)
  const [pipelineLit, setPipelineLit] = useState(0)
  const [freePick, setFreePick] = useState<FormatId | null>(null)

  // useGSAP, not useEffect — see FeedRulesStory: passive cleanup reverts the
  // pin after React already detached the node, which crashes navigation.
  useGSAP(() => {
    const root = rootRef.current
    if (!root || reduced) return
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: root.querySelector('.engine-pin'),
        start: 'top top',
        end: pinLength(2.0),
        pin: true,
        onUpdate: (self) => {
          const p = self.progress
          setFreePick(null)
          if (p < 1 / 3) {
            setBeat(0)
            setPipelineLit(0)
          } else if (p < 2 / 3) {
            setBeat(1)
            setPipelineLit(0)
          } else {
            setBeat(2)
            setPipelineLit(Math.min(7, Math.floor(((p - 2 / 3) / (1 / 3)) * 8)))
          }
        },
      })
    }, root)
    return () => ctx.revert()
  }, { dependencies: [reduced] })

  // The frame for one beat; the reduced-motion page renders all three at once.
  const renderStage = (beat: number, pipelineLit: number) => (
    <div className="relative mx-auto flex min-h-[300px] w-full max-w-5xl items-center justify-center">
      <AnimatePresence mode="wait">
        {freePick ? (
          <motion.div
            key={`free-${freePick}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <FormatCard
              id={freePick}
              label={FORMATS.find((f) => f.id === freePick)!.label}
              icon={FORMATS.find((f) => f.id === freePick)!.icon}
              className="w-[220px]"
            />
          </motion.div>
        ) : beat === 0 ? (
          <motion.div
            key="idea"
            layoutId="idea-card"
            className="w-72 rounded-2xl bg-[var(--kl-surface)] p-5 text-center shadow-[0_24px_48px_-28px_var(--kl-shadow)]"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <span className="kl-sheen inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold">
              <Sparkles size={12} aria-hidden="true" /> one idea
            </span>
            <p className="kl-serif mt-3 text-2xl italic">“Sunrise over Msasani Bay”</p>
            <p className="kl-mono mt-2 text-[11px] text-[var(--kl-low)]">draft · 06:14 EAT</p>
          </motion.div>
        ) : beat === 1 ? (
          <motion.div key="formats" className="flex flex-wrap items-stretch justify-center gap-3" initial="hidden" animate="show" exit={{ opacity: 0, y: -20 }}>
            {FORMATS.map((f, i) => (
              <motion.div
                key={f.id}
                variants={{ hidden: { opacity: 0, y: 30, scale: 0.85 }, show: { opacity: 1, y: 0, scale: 1 } }}
                transition={{ delay: i * 0.09, duration: 0.56, ease: EASE }}
              >
                <FormatCard id={f.id} label={f.label} icon={f.icon} />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div key="translations" className="w-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="flex flex-wrap items-start justify-center gap-3">
              {LANG_VARIANTS.map((l, i) => (
                <motion.div
                  key={l.code}
                  className="w-48 rounded-2xl bg-[var(--kl-surface)] p-4 shadow-[0_18px_36px_-26px_var(--kl-shadow)]"
                  initial={{ opacity: 0, x: -30 - i * 8, y: 20, rotate: -3 }}
                  animate={{ opacity: 1, x: 0, y: i % 2 === 0 ? 0 : 14, rotate: (i - 1.5) * 1.5 }}
                  transition={{ delay: i * 0.1, duration: 0.5, ease: EASE }}
                >
                  <p className="kl-mono text-[11px] text-[var(--kl-gold-deep)]">{l.code} · voice-preserved</p>
                  <p className="mt-1.5 text-sm leading-snug">{l.text}</p>
                </motion.div>
              ))}
            </div>
            {/* pipeline strip — 7 steps light in sequence */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Translation pipeline">
              {PIPELINE.map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <span
                    className={cn(
                      'kl-mono rounded-full px-3 py-1.5 text-[11px] transition-all duration-300',
                      i < pipelineLit
                        ? 'kl-sheen'
                        : 'bg-[var(--kl-surface)] text-[var(--kl-low)]',
                    )}
                  >
                    {step}
                  </span>
                  {i < PIPELINE.length - 1 && (
                    <span className={cn('h-px w-3', i < pipelineLit - 1 ? 'bg-[var(--kl-gold)]' : 'bg-[var(--kl-dash)]')} aria-hidden="true" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  const chips = (
    <div className="mt-8 flex flex-wrap justify-center gap-2" role="group" aria-label="Replay a format">
      {FORMATS.map((f) => {
        const on = freePick === f.id
        return (
          <button
            key={f.id}
            type="button"
            aria-pressed={on}
            onClick={() => setFreePick((cur) => (cur === f.id ? null : f.id))}
            className={cn(
              'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors',
              on ? 'kl-sheen' : 'border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] text-[var(--kl-mid)] hover:text-[var(--kl-ink)]',
            )}
          >
            <f.icon size={13} aria-hidden="true" />
            {f.label}
          </button>
        )
      })}
    </div>
  )

  if (reduced) {
    // Reduced motion: three static frames with captions
    return (
      <section ref={rootRef} className="kl-pad-x border-t border-[var(--kl-paper-2)] py-[clamp(72px,9vw,120px)]">
        <Eyebrow className="text-center">One-to-many publishing engine</Eyebrow>
        <div className="mt-12 space-y-16">
          {BEAT_COPY.map((b, i) => (
            <div key={b.title} className="text-center">
              <h3 className="kl-serif text-[clamp(28px,3.4vw,44px)] font-semibold">{b.title}</h3>
              <p className="mx-auto mt-3 max-w-md text-[var(--kl-mid)]">{b.body}</p>
              {i > 0 && <Stage className="mt-8 p-[clamp(16px,4vw,48px)]">{renderStage(i, PIPELINE.length)}</Stage>}
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section ref={rootRef} className="border-t border-[var(--kl-paper-2)]">
      <div className="engine-pin kl-pad-x flex min-h-[100dvh] flex-col justify-center bg-[var(--kl-bg)] py-16">
        <div className="mx-auto w-full max-w-[1200px]">
          <div className="flex items-center justify-center gap-3">
            <Eyebrow>One-to-many publishing engine</Eyebrow>
            <span className="flex gap-1.5" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span key={i} className={cn('h-1.5 rounded-full transition-all duration-300', i === beat ? 'kl-sheen w-6' : 'w-1.5 bg-[var(--kl-paper-2)]')} />
              ))}
            </span>
          </div>
          <div className="mt-5 text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={beat}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <h2 className="kl-h2">{BEAT_COPY[beat].title}</h2>
                <p className="mx-auto mt-4 max-w-xl text-[17px] text-[var(--kl-mid)]">{BEAT_COPY[beat].body}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          <Stage className="mt-10 p-[clamp(16px,3vw,40px)]" glows={['var(--kl-indigo)', '#D9A648']}>
            {renderStage(beat, pipelineLit)}
          </Stage>
          {chips}
          <p className="mt-4 text-center text-sm text-[var(--kl-low)]">Tap a chip to replay any format’s micro-motion.</p>
        </div>
      </div>
    </section>
  )
}
