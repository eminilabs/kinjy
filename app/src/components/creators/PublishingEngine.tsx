import { useRef, useState } from 'react'
import { pinLength } from '@/lib/pinLength'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { AnimatePresence, motion } from 'framer-motion'
import { Clapperboard, FileText, Images, Languages, Mic, Newspaper, Sparkles, Video } from 'lucide-react'
import { ModeChip } from '@/components/ui-kit'
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
            <span key={w} className="block h-1.5 rounded-full bg-white/15" style={{ width: `${w}%` }} />
          ))}
        </div>
      )
    case 'short':
      return (
        <div className="mx-auto mt-2 flex aspect-[9/16] w-12 items-center justify-center rounded-card-sm bg-gradient-to-b from-indigo/60 to-ink-3">
          <Clapperboard size={14} className="text-gold-soft" aria-hidden="true" />
        </div>
      )
    case 'long':
      return (
        <div className="mt-3">
          <div className="h-14 rounded-card-sm bg-gradient-to-r from-indigo-deep via-indigo/50 to-ink-3" />
          <div className="mt-2 h-1 rounded-full bg-white/15">
            <div className="h-full w-2/3 rounded-full bg-gold" />
          </div>
          <p className="mono-data mt-1 text-[0.6rem] text-text-low">08:12 / 12:08</p>
        </div>
      )
    case 'audio':
      return (
        <div className="mt-3 flex h-10 items-end justify-center gap-[3px]" aria-hidden="true">
          {[0.5, 0.9, 0.6, 1, 0.7, 0.85, 0.55, 0.95, 0.65, 0.8, 0.5, 0.75].map((h, i) => (
            <motion.span
              key={i}
              className="w-[3px] rounded-full bg-sky"
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
          {['from-gold/60 to-coral/50', 'from-indigo/70 to-sky/40', 'from-ink-3 to-indigo-deep', 'from-gold-soft/50 to-gold/40'].map(
            (g) => (
              <span key={g} className={cn('h-12 flex-1 rounded-card-sm bg-gradient-to-br', g)} />
            ),
          )}
        </div>
      )
    case 'newsletter':
      return (
        <div className="mt-2">
          <div className="rounded-t-r-sm bg-gold/20 px-2 py-1">
            <p className="font-display text-[0.65rem] italic text-gold-soft">The Msasani Letter</p>
          </div>
          <div className="space-y-1 rounded-b-r-sm border border-white/10 p-2">
            {[100, 80, 90].map((w) => (
              <span key={w} className="block h-1 rounded-full bg-white/15" style={{ width: `${w}%` }} />
            ))}
          </div>
        </div>
      )
    case 'translations':
      return (
        <div className="mt-2 flex flex-wrap gap-1" aria-hidden="true">
          {['EN', 'SW', 'FR', '中文', '+N'].map((l) => (
            <span key={l} className="mono-data rounded-full border border-sky/40 px-1.5 py-0.5 text-[0.6rem] text-sky">
              {l}
            </span>
          ))}
        </div>
      )
  }
}

function FormatCard({ id, label, icon: Icon, className }: { id: FormatId; label: string; icon: typeof FileText; className?: string }) {
  return (
    <div className={cn('cloud-card w-[150px] shrink-0 p-3', className)}>
      <div className="flex items-center gap-1.5">
        <Icon size={14} className="text-gold" aria-hidden="true" />
        <p className="text-xs font-semibold text-text-hi">{label}</p>
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

  const stage = (
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
            className="cloud-card w-72 p-5 text-center"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo/25 px-3 py-1 text-xs font-semibold text-sky">
              <Sparkles size={12} aria-hidden="true" /> one idea
            </span>
            <p className="font-display mt-3 text-xl italic text-text-hi">“Sunrise over Msasani Bay”</p>
            <p className="mono-data mt-2 text-[0.68rem] text-text-low">draft · 06:14 EAT</p>
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
                  className="cloud-card w-48 p-4"
                  initial={{ opacity: 0, x: -30 - i * 8, y: 20, rotate: -3 }}
                  animate={{ opacity: 1, x: 0, y: i % 2 === 0 ? 0 : 14, rotate: (i - 1.5) * 1.5 }}
                  transition={{ delay: i * 0.1, duration: 0.5, ease: EASE }}
                >
                  <p className="mono-data text-[0.68rem] text-gold-soft">{l.code} · voice-preserved</p>
                  <p className="mt-1.5 text-sm leading-snug text-text-hi/90">{l.text}</p>
                </motion.div>
              ))}
            </div>
            {/* pipeline strip — 7 steps light in sequence */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Translation pipeline">
              {PIPELINE.map((step, i) => (
                <div key={step} className="flex items-center gap-2">
                  <span
                    className={cn(
                      'mono-data rounded-full border px-3 py-1.5 text-[0.7rem] transition-all duration-300',
                      i < pipelineLit
                        ? 'border-gold/60 bg-gold/15 text-gold-soft shadow-gold-ring'
                        : 'border-white/10 bg-white/[0.03] text-text-low',
                    )}
                  >
                    {step}
                  </span>
                  {i < PIPELINE.length - 1 && (
                    <span className={cn('h-px w-3', i < pipelineLit - 1 ? 'bg-gold' : 'bg-white/15')} aria-hidden="true" />
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
    <div className="mt-8 flex flex-wrap justify-center gap-2">
      {FORMATS.map((f) => (
        <ModeChip
          key={f.id}
          label={f.label}
          icon={<f.icon size={13} aria-hidden="true" />}
          active={freePick === f.id}
          onClick={() => setFreePick((cur) => (cur === f.id ? null : f.id))}
        />
      ))}
    </div>
  )

  if (reduced) {
    // Reduced motion: three static frames with captions
    return (
      <section ref={rootRef} className="noise-overlay bg-ink px-6 py-24 md:py-32">
        <div className="mx-auto max-w-container">
          <p className="eyebrow text-center text-sky">One-to-Many Publishing Engine</p>
          <div className="mt-12 space-y-16">
            {BEAT_COPY.map((b, i) => (
              <div key={b.title} className="text-center">
                <h3 className="h3 text-gold-soft">{b.title}</h3>
                <p className="mx-auto mt-2 max-w-md text-text-mid">{b.body}</p>
                <div className="mt-6">{i === 0 ? null : stage}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    )
  }

  return (
    <section ref={rootRef} className="noise-overlay bg-ink">
      <div className="engine-pin flex min-h-[100dvh] flex-col justify-center px-6 py-16">
        <div className="mx-auto w-full max-w-container">
          <p className="eyebrow text-center text-sky">One-to-Many Publishing Engine</p>
          <div className="mt-4 text-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={beat}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -14 }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <h2 className="h2">{BEAT_COPY[beat].title}</h2>
                <p className="mx-auto mt-2 max-w-xl text-text-mid">{BEAT_COPY[beat].body}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="mt-10">{stage}</div>
          {chips}
          <p className="caption mt-4 text-center">Tap a chip to replay any format’s micro-motion.</p>
        </div>
      </div>
    </section>
  )
}
