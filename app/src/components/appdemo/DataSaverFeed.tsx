import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AudioLines, CloudOff, Download, MessageSquareText, Play, Send, Signal, Wifi,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { avatarStyle } from './theme'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const SNAP: [number, number, number, number] = [0.34, 1.56, 0.64, 1]

interface DemoPost {
  id: string
  author: string
  avatar: number
  meta: string
  text: string
  media?: { src: string; alt: string; bytes: string; savedBytes: string; kind: 'photo' | 'video' }
  audio?: { title: string; bytes: string }
}

const DEMO_POSTS: DemoPost[] = [
  {
    id: 'ds-photo', author: 'Amara Jelani', avatar: 1, meta: '@amara.j · 2h · Family',
    text: 'Three generations, one veranda. Grandma finally saw the restored album — she cried, then laughed, then made chai.',
    media: { src: '/family-archive-1.jpg', alt: 'Three generations of a family on a veranda', bytes: '1.2 MB', savedBytes: '18 KB text', kind: 'photo' },
  },
  {
    id: 'ds-audio', author: 'Kito Beats', avatar: 5, meta: '@kitobeats · 4h · Public',
    text: 'Couldn’t upload the video tonight — so here’s the track, audio-first. Video lands when I’m on Wi-Fi.',
    audio: { title: 'Matatu Rain (demo) · 3:42', bytes: '640 KB audio' },
  },
  {
    id: 'ds-video', author: 'Kigoma Forum', avatar: 8, meta: 'f/kigoma · 6h · Forums',
    text: 'Market day highlights from the lakeside stalls — full clip inside.',
    media: { src: '/marketplace-hero.jpg', alt: 'Lakeside market stalls at twilight', bytes: '2.8 MB', savedBytes: '22 KB text', kind: 'video' },
  },
]

/** Media that collapses to a byte-labeled placeholder in Data Saver mode. */
function MediaBlock({ post, saver }: { post: DemoPost; saver: boolean }) {
  const [loaded, setLoaded] = useState(false)
  const m = post.media!
  const showImage = !saver || loaded

  return (
    <div className="relative mt-3 overflow-hidden rounded-card-md">
      <AnimatePresence mode="wait" initial={false}>
        {showImage ? (
          <motion.div
            key="img"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE }}
            className="relative"
          >
            <img src={m.src} alt={m.alt} className="aspect-[16/9] w-full object-cover" loading="lazy" />
            {m.kind === 'video' && (
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/60 backdrop-blur-sm">
                  <Play size={18} className="ms-0.5 text-gold-soft" aria-hidden="true" />
                </span>
              </span>
            )}
            {saver && loaded && (
              <span className="absolute bottom-2.5 end-2.5 rounded-full bg-ink/70 px-2.5 py-1 font-mono text-[0.62rem] text-gold-soft backdrop-blur-sm">
                {m.bytes} loaded on demand
              </span>
            )}
          </motion.div>
        ) : (
          <motion.button
            key="placeholder"
            type="button"
            onClick={() => setLoaded(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
            className="cloud-glass flex w-full flex-col items-center gap-2 rounded-card-md py-7 text-text-mid transition-colors hover:border-gold/40 hover:text-gold-soft"
            aria-label={`Load ${m.kind === 'video' ? 'video' : 'photo'}, ${m.bytes}`}
          >
            <Download size={18} aria-hidden="true" />
            <span className="text-xs font-bold">Tap to load {m.kind}</span>
            <span className="mono-data text-[0.65rem] text-text-low">{m.bytes} · skipped in Data Saver</span>
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}

function AudioBlock({ post, saver }: { post: DemoPost; saver: boolean }) {
  const a = post.audio!
  return (
    <div className={cn('mt-3 flex items-center gap-3 rounded-card-md border p-3', saver ? 'border-sky/35 bg-sky/10' : 'border-white/10 bg-white/5')}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky/20 text-sky">
        <AudioLines size={16} aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-bold text-text-hi">{a.title}</p>
        {/* waveform */}
        <div className="mt-1.5 flex items-center gap-[3px]" aria-hidden="true">
          {[6, 10, 14, 9, 16, 12, 7, 13, 15, 8, 11, 5].map((h, i) => (
            <span key={i} style={{ height: `${h}px` }} className="w-[3px] rounded-full bg-sky/60" />
          ))}
        </div>
      </div>
      <span className="mono-data shrink-0 text-[0.62rem] text-sky">{saver ? a.bytes : 'stream'}</span>
    </div>
  )
}

/** B2 — Data Saver toggle that visibly transforms the demo feed. */
export default function DataSaverFeed() {
  const [saver, setSaver] = useState(false)

  return (
    <section className="noise-overlay relative bg-ink px-6 py-24 md:py-28">
      <div className="mx-auto max-w-container">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-12 max-w-2xl"
        >
          <p className="eyebrow text-gold">Offline-first &amp; low-bandwidth</p>
          <h3 className="h3 mt-3 font-display text-3xl font-medium">
            One toggle. <span className="text-gold-grad">The feed transforms.</span>
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-text-mid">
            Data Saver re-renders the same feed text-first: media waits for a tap, audio leads, drafts queue
            for the next connection — and SMS/USSD keeps members in the loop with no data at all.
          </p>
        </motion.div>

        <div className="mx-auto max-w-2xl">
          {/* shell bar with toggle */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{ duration: 0.5, ease: EASE }}
            className="cloud-card flex flex-wrap items-center gap-3 rounded-b-none border-b-0 p-4"
          >
            <span className={cn('flex h-9 w-9 items-center justify-center rounded-full transition-colors', saver ? 'bg-gold/20 text-gold-soft' : 'bg-white/10 text-text-mid')}>
              {saver ? <CloudOff size={15} aria-hidden="true" /> : <Wifi size={15} aria-hidden="true" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-text-hi">Data Saver</p>
              <p className="mono-data text-[0.65rem] text-text-low">
                {saver ? 'ON · est. 4.0 MB saved this session' : 'off · full media'}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={saver}
              aria-label="Toggle Data Saver"
              onClick={() => setSaver((v) => !v)}
              className={cn(
                'relative h-7 w-12 rounded-full transition-colors duration-300',
                saver ? 'bg-gradient-to-br from-gold-soft to-gold' : 'bg-white/15',
              )}
            >
              <motion.span
                layout="position"
                transition={{ duration: 0.25, ease: SNAP }}
                className={cn('absolute top-1 h-5 w-5 rounded-full shadow', saver ? 'end-1 bg-ink' : 'start-1 bg-text-mid')}
              />
            </button>
          </motion.div>

          {/* offline compose queue chip */}
          <AnimatePresence>
            {saver && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="overflow-hidden"
              >
                <div className="cloud-glass flex items-center gap-2.5 border-x border-b border-t-0 px-4 py-2.5">
                  <Send size={12} className="shrink-0 text-warning" aria-hidden="true" />
                  <p className="flex-1 text-xs font-semibold text-text-mid">
                    <span className="text-gold-soft">2 posts queued</span> — will send when you’re back online
                  </p>
                  <span className="mono-data rounded-full bg-warning/15 px-2 py-0.5 text-[0.62rem] font-semibold text-warning">offline queue</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* the transformed feed */}
          <div className="cloud-card rounded-t-none border-t-0 p-4">
            <div className="space-y-4">
              {DEMO_POSTS.map((p) => (
                <motion.article
                  key={p.id}
                  layout="position"
                  transition={{ duration: 0.45, ease: EASE }}
                  className={cn('rounded-card-md border p-4 transition-colors duration-300', saver ? 'border-white/10 bg-white/[0.04]' : 'border-white/10 bg-white/[0.07]')}
                >
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-9 shrink-0 rounded-full bg-cover ring-1 ring-gold/30" style={avatarStyle(p.avatar)} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-text-hi">{p.author}</p>
                      <p className="truncate text-xs text-text-low">{p.meta}</p>
                    </div>
                    {saver && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.4, ease: SNAP }}
                        className="rounded-full bg-gold/15 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-gold-soft"
                      >
                        text-first
                      </motion.span>
                    )}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-text-hi">{p.text}</p>
                  {p.media && <MediaBlock key={`${p.id}-${saver ? 's' : 'f'}`} post={p} saver={saver} />}
                  {p.audio && <AudioBlock post={p} saver={saver} />}
                  <div className="mt-3 flex gap-2 border-t border-white/10 pt-3">
                    {(saver ? ['Like', 'Comment', 'Save · 0 KB'] : ['Like · 214', 'Comment · 38', 'Share', 'Save']).map((a) => (
                      <span key={a} className="rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-text-mid">{a}</span>
                    ))}
                  </div>
                </motion.article>
              ))}
            </div>

            {/* SMS / USSD fallback note */}
            <AnimatePresence>
              {saver && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ delay: 0.15, duration: 0.4, ease: EASE }}
                  className="mt-4 flex items-start gap-3 rounded-card-md border border-sky/30 bg-sky/[0.08] p-4"
                >
                  <MessageSquareText size={16} className="mt-0.5 shrink-0 text-sky" aria-hidden="true" />
                  <p className="text-xs leading-relaxed text-text-mid">
                    <span className="font-bold text-text-hi">No data at all?</span> Dial{' '}
                    <span className="mono-data text-sky">*384*88#</span> to read your top posts by USSD, or get
                    your Family circle digest by SMS — free on partner networks.
                  </p>
                  <Signal size={14} className="ms-auto mt-0.5 shrink-0 text-sky/60" aria-hidden="true" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
