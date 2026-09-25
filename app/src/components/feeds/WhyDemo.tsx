import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Heart, MapPin, MessageCircle, UserCheck, Users2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProvenanceTag, VerifiedBadge } from '@/components/ui-kit'
import { Avatar, CLOUD_EASE, LINE_EASE } from '@/components/platform/shared'
import { POSTS } from './data'
import { useToasts } from './Toast'

/** Gold callout numeral with a circle that draws in (SVG stroke, 600ms). */
function Callout({ n, delay = 0 }: { n: number; delay?: number }) {
  const reduced = useReducedMotion()
  return (
    <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center" aria-hidden="true">
      <svg viewBox="0 0 32 32" className="absolute inset-0">
        <motion.circle
          cx="16"
          cy="16"
          r="14"
          fill="none"
          stroke="#D9A648"
          strokeWidth="1.6"
          strokeLinecap="round"
          initial={reduced ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, amount: 0.65 }}
          transition={{ duration: 0.6, ease: LINE_EASE, delay }}
        />
      </svg>
      <span className="mono-data text-xs font-semibold text-gold-soft">{n}</span>
    </span>
  )
}

const REASONS = [
  { id: 'follow', icon: UserCheck, text: 'Because you follow Demo K.' },
  { id: 'engaged', icon: Heart, text: 'You engaged with similar posts' },
  { id: 'nearby', icon: MapPin, text: 'Popular within 20 km of you' },
]

/** Section 3 — "Why am I seeing this?" transparency triad, permanently open. */
export default function WhyDemo({ onChangeAlgorithm }: { onChangeAlgorithm: () => void }) {
  const post = POSTS[0]
  const { push } = useToasts()
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [dimmed, setDimmed] = useState<string | null>(null)
  const reduced = useReducedMotion()

  const showLess = () => {
    const target = REASONS.find((r) => !dismissed.has(r.id) && r.id !== 'follow')?.id ?? 'engaged'
    setDimmed(target)
    push("Got it — we'll tune this down", {
      actions: [{ label: 'Undo', onClick: () => setDimmed(null) }],
    })
  }

  return (
    <section className="px-6 py-24 md:py-32" aria-label="Why am I seeing this — transparency controls">
      <div className="mx-auto max-w-container">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Demo: post + permanently open popover */}
          <div className="relative mx-auto w-full max-w-lg">
            {/* Post card */}
            <div className="cloud-card p-5">
              <div className="flex items-center gap-3">
                <Avatar index={post.avatar} size={44} name={post.author} />
                <div className="flex-1">
                  <p className="flex items-center gap-1.5 font-bold text-text-hi">
                    {post.author} <VerifiedBadge size={16} />
                  </p>
                  <p className="mono-data text-[0.68rem] text-text-low">{post.time} · {post.location}</p>
                </div>
                <span className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-2.5 py-1 text-[0.62rem] font-bold text-ink">
                  Recommended
                </span>
              </div>
              <p className="mt-3 leading-relaxed text-text-mid">{post.text}</p>
              <div className={cn('mt-3 flex h-40 items-end justify-end rounded-card-sm bg-gradient-to-br p-2.5', post.media)}>
                <ProvenanceTag kind={post.provenance} />
              </div>
              <div className="mt-3 flex items-center gap-5 text-text-low">
                <span className="flex items-center gap-1.5 text-xs"><Heart size={13} /> {post.engagement.toLocaleString()}</span>
                <span className="flex items-center gap-1.5 text-xs"><MessageCircle size={13} /> {Math.round(post.engagement / 14)}</span>
                <span className="flex items-center gap-1.5 text-xs"><Users2 size={13} /> Shared 214×</span>
              </div>
            </div>

            {/* Permanently-open popover */}
            <motion.div
              initial={reduced ? false : { opacity: 0, scale: 0.96 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.65 }}
              transition={{ duration: 0.24, ease: CLOUD_EASE }}
              className="cloud-glass relative z-10 mx-auto -mt-6 w-[92%] rounded-card-md bg-ink-2/95 p-5 shadow-cloud-hover"
              role="dialog"
              aria-label="Why you're seeing this post"
            >
              <p className="eyebrow text-gold">Why you're seeing this</p>

              {/* ① Reason chips */}
              <div className="mt-4 flex items-start gap-3">
                <Callout n={1} delay={0} />
                <ul className="flex flex-1 flex-wrap gap-2">
                  {REASONS.map((r) => {
                    const gone = dismissed.has(r.id)
                    return (
                      <li
                        key={r.id}
                        className={cn(
                          'flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs transition-all duration-300',
                          gone
                            ? 'border-white/10 bg-white/[0.03] text-text-low line-through opacity-50'
                            : dimmed === r.id
                              ? 'border-sky/15 bg-sky/5 text-sky/50'
                              : 'border-sky/30 bg-sky/10 text-sky',
                        )}
                      >
                        <r.icon size={12} />
                        {r.text}
                        {!gone && (
                          <button
                            type="button"
                            onClick={() => setDismissed((s) => new Set(s).add(r.id))}
                            aria-label={`Dismiss reason: ${r.text}`}
                            className="rounded-full p-0.5 hover:bg-white/10"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </div>

              {/* ② Show less like this */}
              <div className="mt-4 flex items-center gap-3">
                <Callout n={2} delay={0.2} />
                <button
                  type="button"
                  onClick={showLess}
                  className="cloud-glass flex-1 rounded-full px-4 py-2.5 text-sm font-semibold text-text-hi transition-colors hover:border-gold/40 hover:text-gold-soft"
                >
                  Show less like this
                </button>
              </div>

              {/* ③ Change my algorithm */}
              <div className="mt-4 flex items-center gap-3">
                <Callout n={3} delay={0.4} />
                <button
                  type="button"
                  onClick={onChangeAlgorithm}
                  className="flex-1 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2.5 text-sm font-bold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:brightness-110"
                >
                  Change my algorithm
                </button>
              </div>

              <AnimatePresence>
                {dimmed && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 text-[0.72rem] text-text-low"
                  >
                    Feedback applied instantly — it persists across every device you use.
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Copy */}
          <div className="max-w-lg">
            <p className="eyebrow text-gold">Radical Transparency</p>
            <h3 className="h2 mt-4">Every recommendation carries its receipt.</h3>
            <p className="body-lg mt-5 text-text-mid">
              Recommended posts always explain themselves, and your feedback immediately shapes what
              comes next. No shadows, no guesses — the reasons sit one tap away on every single card.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                'Reason chips name the exact signals used',
                '“Show less” dims the signal instantly — and persists',
                '“Change my algorithm” walks you straight to the marketplace',
              ].map((t, i) => (
                <motion.li
                  key={t}
                  className="flex items-center gap-3 text-sm text-text-mid"
                  initial={reduced ? false : { opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.7 }}
                  transition={{ duration: 0.4, ease: CLOUD_EASE, delay: i * 0.1 }}
                >
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-gold" />
                  {t}
                </motion.li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
