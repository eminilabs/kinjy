import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Heart, MapPin, MessageCircle, UserCheck, Users2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, CLOUD_EASE, LINE_EASE } from '@/components/platform/shared'
import { POSTS } from './data'
import { useToasts } from './Toast'
import { Provenance, Seal } from './kit'
import { Eyebrow, Stage } from '@/components/landing/PageKit'

/** Gold callout numeral with a circle that draws in (SVG stroke, 600ms). */
function Callout({ n, delay = 0 }: { n: number; delay?: number }) {
  const reduced = useReducedMotion()
  return (
    <span className="relative inline-flex h-7 w-7 shrink-0 items-center justify-center" aria-hidden="true">
      <svg viewBox="0 0 32 32" className="absolute inset-0">
        <motion.circle
          cx="16"
          cy="16"
          r="14"
          fill="none"
          stroke="#D9A648"
          strokeWidth="1.8"
          strokeLinecap="round"
          initial={reduced ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, amount: 0.65 }}
          transition={{ duration: 0.6, ease: LINE_EASE, delay }}
        />
      </svg>
      <span className="kl-mono text-[11px] font-semibold text-[var(--kl-gold-deep)]">{n}</span>
    </span>
  )
}

const REASONS = [
  { id: 'follow', icon: UserCheck, text: 'You follow Demo K.', weight: '0.42' },
  { id: 'engaged', icon: Heart, text: 'You engaged with similar posts', weight: '0.35' },
  { id: 'nearby', icon: MapPin, text: 'Popular within 20 km of you', weight: '0.23' },
]

/** The receipt's torn edge: a row of small teeth cut out of the paper. */
const TEETH = {
  WebkitMaskImage:
    'radial-gradient(circle at 8px 0, transparent 6px, #000 6.5px) top / 16px 51% repeat-x, radial-gradient(circle at 8px 100%, transparent 6px, #000 6.5px) bottom / 16px 51% repeat-x',
  maskImage:
    'radial-gradient(circle at 8px 0, transparent 6px, #000 6.5px) top / 16px 51% repeat-x, radial-gradient(circle at 8px 100%, transparent 6px, #000 6.5px) bottom / 16px 51% repeat-x',
}

/** Section 3 — "Why am I seeing this?": every recommendation printed with its receipt. */
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
    <section className="kl-pad-x py-[clamp(72px,9vw,120px)]" aria-label="Why am I seeing this — transparency controls">
      <div className="kl-split gap-[clamp(40px,6vw,96px)]">
        {/* Copy */}
        <div className="min-w-0">
          <Eyebrow>Radical transparency</Eyebrow>
          <h2 className="kl-h2 mt-5">Every recommendation carries its receipt.</h2>
          <p className="kl-lead mt-6">
            Recommended posts always explain themselves, and your feedback immediately shapes what
            comes next. No shadows, no guesses — the reasons sit one tap away on every single card.
          </p>
          <ol className="mt-10 max-w-[460px] border-t border-[var(--kl-paper-2)]">
            {[
              ['Reason chips', 'name the exact signals used'],
              ['“Show less”', 'dims the signal instantly — and persists'],
              ['“Change my algorithm”', 'walks you straight to the marketplace'],
            ].map(([lead, rest], i) => (
              <motion.li
                key={lead}
                className="flex items-center gap-4 border-b border-[var(--kl-paper-2)] py-4 text-[15px]"
                initial={reduced ? false : { opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.7 }}
                transition={{ duration: 0.4, ease: CLOUD_EASE, delay: i * 0.1 }}
              >
                <Callout n={i + 1} delay={i * 0.2} />
                <span>
                  <span className="font-semibold">{lead}</span> <span className="text-[var(--kl-mid)]">{rest}</span>
                </span>
              </motion.li>
            ))}
          </ol>
        </div>

        {/* The post, and its receipt printed beneath it */}
        <Stage className="min-w-0 px-[clamp(16px,4vw,48px)] py-[clamp(28px,4vw,48px)]" glows={['var(--kl-coral)', 'var(--kl-sky)']}>
          <div className="mx-auto max-w-[420px]">
            <div className="rounded-2xl bg-[var(--kl-surface)] p-4 shadow-[0_24px_48px_-30px_var(--kl-shadow)]">
              <div className="flex items-center gap-3">
                <Avatar index={post.avatar} size={40} name={post.author} className="!border-transparent" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 font-semibold">
                    {post.author} <Seal />
                  </p>
                  <p className="kl-mono text-[11px] text-[var(--kl-low)]">{post.time} · {post.location}</p>
                </div>
                <span className="kl-sheen rounded-full px-2.5 py-1 text-[10.5px] font-bold">Recommended</span>
              </div>
              <p className="mt-3 text-[15px] leading-relaxed text-[var(--kl-mid)]">{post.text}</p>
              <div className={cn('mt-3 flex h-36 items-end justify-end rounded-xl bg-gradient-to-br p-2', post.media)}>
                <Provenance kind={post.provenance} />
              </div>
              <div className="mt-3 flex items-center gap-5 text-xs text-[var(--kl-low)]">
                <span className="flex items-center gap-1.5"><Heart size={13} /> {post.engagement.toLocaleString()}</span>
                <span className="flex items-center gap-1.5"><MessageCircle size={13} /> {Math.round(post.engagement / 14)}</span>
                <span className="flex items-center gap-1.5"><Users2 size={13} /> Shared 214×</span>
              </div>
            </div>

            <motion.div
              initial={reduced ? false : { opacity: 0, y: -18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6, ease: CLOUD_EASE }}
              className="relative z-10 mx-auto -mt-3 w-[92%] drop-shadow-[0_24px_30px_var(--kl-shadow)]"
              role="dialog"
              aria-label="Why you're seeing this post"
            >
              <div className="bg-[var(--kl-surface)] px-5 pb-6 pt-7" style={TEETH}>
                <div className="flex items-baseline justify-between">
                  <p className="kl-mono text-[11px] uppercase tracking-[.14em] text-[var(--kl-gold-deep)]">Why you're seeing this</p>
                  <p className="kl-mono text-[10px] text-[var(--kl-low)]">#{post.id.toUpperCase()}</p>
                </div>

                {/* ① Reasons, as receipt lines */}
                <ul className="mt-4 border-y border-dashed border-[var(--kl-dash)] py-2">
                  {REASONS.map((r) => {
                    const gone = dismissed.has(r.id)
                    return (
                      <li
                        key={r.id}
                        className={cn(
                          'flex items-center gap-2 py-1.5 text-[13px] transition-opacity duration-300',
                          gone && 'line-through opacity-40',
                          dimmed === r.id && 'opacity-40',
                        )}
                      >
                        <r.icon size={13} className="shrink-0 text-[var(--kl-gold-deep)]" />
                        <span className="min-w-0">{r.text}</span>
                        <span aria-hidden="true" className="mx-1 min-w-4 flex-1 border-b border-dotted border-[var(--kl-dash)]" />
                        <span className="kl-mono text-[11px] text-[var(--kl-low)]">{r.weight}</span>
                        {!gone ? (
                          <button
                            type="button"
                            onClick={() => setDismissed((s) => new Set(s).add(r.id))}
                            aria-label={`Dismiss reason: ${r.text}`}
                            className="grid h-5 w-5 place-items-center rounded-full text-[var(--kl-low)] hover:bg-[var(--kl-paper)] hover:text-[var(--kl-ink)]"
                          >
                            <X size={11} />
                          </button>
                        ) : (
                          <span className="h-5 w-5" />
                        )}
                      </li>
                    )
                  })}
                </ul>

                {/* ② and ③ */}
                <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={showLess}
                    className="rounded-full border border-[var(--kl-paper-2)] px-4 py-2.5 text-sm font-semibold transition-colors hover:border-[var(--kl-gold)] hover:text-[var(--kl-gold-deep)]"
                  >
                    Show less like this
                  </button>
                  <button
                    type="button"
                    onClick={onChangeAlgorithm}
                    className="kl-sheen rounded-full px-4 py-2.5 text-sm font-bold transition hover:brightness-105"
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
                      className="mt-3 text-center text-xs text-[var(--kl-low)]"
                    >
                      Feedback applied instantly — it persists across every device you use.
                    </motion.p>
                  )}
                </AnimatePresence>
                <p className="kl-mono mt-4 text-center text-[10px] uppercase tracking-[.2em] text-[var(--kl-low)]">No black boxes · Kinjy</p>
              </div>
            </motion.div>
          </div>
        </Stage>
      </div>
    </section>
  )
}
