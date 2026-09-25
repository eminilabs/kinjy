import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, ChevronRight, Clapperboard, Flame, Play, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import { avatarStyle } from './theme'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const SNAP: [number, number, number, number] = [0.34, 1.56, 0.64, 1]

interface Series {
  id: string
  title: string
  creator: string
  avatar: number
  episode: number
  total: number
  streak: number
  nextTitle: string
  accent: string
}

const SEED_SERIES: Series[] = [
  { id: 's-harvest', title: 'Balcony Harvests', creator: 'Urban Farming KE', avatar: 8, episode: 4, total: 12, streak: 9, nextTitle: 'Ep 5 · “Compost in a bucket”', accent: '#3FB27F' },
  { id: 's-beats', title: 'Matatu Sounds', creator: 'Kito Beats', avatar: 5, episode: 2, total: 8, streak: 6, nextTitle: 'Ep 3 · “Rain on tin roofs”', accent: '#8FB8E8' },
  { id: 's-roots', title: 'Finding Our Roots', creator: 'Naliaka Wekesa', avatar: 3, episode: 7, total: 10, streak: 14, nextTitle: 'Ep 8 · “The 1962 letters”', accent: '#D9A648' },
]

/** B6 — serialized content rail: episodic cards, streaks, next-episode habit loop. */
export default function SeriesRail() {
  const [series, setSeries] = useState(SEED_SERIES)
  const [notice, setNotice] = useState<string | null>(null)
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (noticeTimer.current) clearTimeout(noticeTimer.current) }, [])

  const flashNotice = (text: string) => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    setNotice(text)
    noticeTimer.current = setTimeout(() => setNotice(null), 4500)
  }

  const playNext = (id: string) => {
    setSeries((ss) =>
      ss.map((s) => (s.id === id && s.episode < s.total ? { ...s, episode: s.episode + 1 } : s)),
    )
    const s = series.find((x) => x.id === id)
    if (s && s.episode + 1 < s.total) {
      flashNotice(`Episode ${s.episode + 2} of “${s.title}” is queued up next — we’ll notify you when it drops.`)
    } else if (s) {
      flashNotice(`Season finale watched! “${s.title}” returns with Season 2 soon.`)
    }
  }

  return (
    <section className="noise-overlay relative bg-ink-2/20 px-6 py-24 md:py-28">
      <div className="mx-auto max-w-container">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.6, ease: EASE }}
          className="mb-12 max-w-2xl"
        >
          <p className="eyebrow text-gold">Serialized content &amp; habit loops</p>
          <h3 className="h3 mt-3 font-display text-3xl font-medium">
            Stories that <span className="text-gold-grad">come back to you.</span>
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-text-mid">
            Creators publish in seasons and episodes. Kinjy tracks where you stopped, lines up the next
            episode and celebrates creator streaks — healthy rituals, not infinite scroll.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{ duration: 0.65, ease: EASE }}
          className="cloud-card relative overflow-hidden p-5"
        >
          <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo/25 text-sky">
              <Clapperboard size={15} aria-hidden="true" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-bold text-text-hi">Your series rail</p>
              <p className="text-xs text-text-low">In your feed · picks up where you left off</p>
            </div>
            {/* new-episode notification */}
            <AnimatePresence>
              {notice && (
                <motion.div
                  initial={{ opacity: 0, y: -14, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.97 }}
                  transition={{ duration: 0.4, ease: SNAP }}
                  role="status"
                  className="absolute end-4 top-16 z-20 flex max-w-xs items-start gap-2.5 rounded-card-md bg-ink-3 p-3.5 shadow-cloud-hover ring-1 ring-gold/35"
                >
                  <Bell size={14} className="mt-0.5 shrink-0 text-gold-soft" aria-hidden="true" />
                  <p className="text-xs leading-relaxed text-text-hi">{notice}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* horizontally scrollable rail */}
          <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {series.map((s, idx) => {
              const pct = s.episode / s.total
              return (
                <motion.article
                  key={s.id}
                  layout="position"
                  initial={{ opacity: 0, x: 32 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-5%' }}
                  transition={{ delay: idx * 0.1, duration: 0.55, ease: EASE }}
                  className="cloud-glass w-[290px] shrink-0 rounded-card-md p-4"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="h-9 w-9 shrink-0 rounded-full bg-cover ring-1 ring-gold/30" style={avatarStyle(s.avatar)} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-text-hi">{s.title}</p>
                      <p className="truncate text-xs text-text-low">{s.creator}</p>
                    </div>
                    {/* creator streak badge */}
                    <motion.span
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + idx * 0.1, duration: 0.45, ease: SNAP }}
                      className="flex items-center gap-1 rounded-full bg-coral/15 px-2 py-1 text-[0.62rem] font-bold text-coral"
                      title={`${s.creator} has published ${s.streak} weeks in a row`}
                    >
                      <Flame size={11} aria-hidden="true" /> {s.streak}w
                    </motion.span>
                  </div>

                  {/* episode progress */}
                  <div className="mt-4">
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="mono-data text-[0.7rem] font-semibold" style={{ color: s.accent }}>
                        Episode {s.episode} of {s.total}
                      </span>
                      <span className="mono-data text-[0.62rem] text-text-low">{Math.round(pct * 100)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                      <motion.span
                        layout="position"
                        animate={{ scaleX: pct }}
                        transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
                        style={{ background: s.accent, transformOrigin: 'left' }}
                        className="block h-full w-full rounded-full"
                      />
                    </div>
                  </div>

                  {/* next episode + action */}
                  <div className="mt-3.5 flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-xs text-text-mid">
                      <span className="font-bold text-text-hi">Up next:</span> {s.episode < s.total ? s.nextTitle : 'Season complete'}
                    </p>
                  </div>
                  <motion.button
                    type="button"
                    onClick={() => playNext(s.id)}
                    disabled={s.episode >= s.total}
                    whileTap={{ scale: 0.96 }}
                    className={cn(
                      'mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-colors',
                      s.episode >= s.total
                        ? 'cursor-default bg-white/5 text-text-low'
                        : 'bg-gradient-to-br from-gold-soft to-gold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] hover:brightness-110',
                    )}
                  >
                    {s.episode >= s.total ? (
                      <>Awaiting new season</>
                    ) : (
                      <><Play size={12} aria-hidden="true" /> Play next episode <SkipForward size={12} aria-hidden="true" /></>
                    )}
                  </motion.button>
                </motion.article>
              )
            })}

            {/* end-of-rail affordance */}
            <div className="flex w-16 shrink-0 items-center justify-center">
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-text-low">
                <ChevronRight size={16} aria-hidden="true" />
              </span>
            </div>
          </div>

          <p className="caption mt-4 border-t border-white/10 pt-3">
            Tap “Play next episode” — the rail advances, progress persists, and a notification queues the
            following drop. Streak badges reward creators for consistency, not volume.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
