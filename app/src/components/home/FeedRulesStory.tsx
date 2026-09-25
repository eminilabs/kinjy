import { useRef, useState } from 'react'
import { pinLength } from '@/lib/pinLength'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { AnimatePresence, motion } from 'framer-motion'
import { ModeChip, ProvenanceTag, WhyAmISeeingThis } from '@/components/ui-kit'
import { cn } from '@/lib/utils'

gsap.registerPlugin(ScrollTrigger)

const FEED_MODES = ['Following', 'For You', 'Circles', 'Friends', 'Local', 'Country', 'Global', 'Topics', 'Trending', 'New']

const ALGORITHMS = [
  'Chronological', 'Friends First', 'Family First', 'Local News', 'Business',
  'Technology', 'Entertainment', 'Learning', 'Politics', 'Positive Content',
  'Long-form', 'Video Only', 'Audio Only', 'New Creators', 'Global Discovery',
]

type Post = {
  id: string
  author: string
  avatarPos: string
  time: string
  text: string
  family?: boolean
  translated?: boolean
  aiAssisted?: boolean
}

const POSTS: Record<string, Post> = {
  demo: {
    id: 'demo', author: 'Demo K.', avatarPos: '0% 0%', time: '2 min',
    text: 'Sunrise over Msasani Bay — the dhows were out early today.', family: false,
  },
  juma: {
    id: 'juma', author: 'Juma M.', avatarPos: '33% 0%', time: '1 hr',
    text: 'My grandmother just verified our family tree back to 1890. Habari ya leo?',
    family: true, translated: true,
  },
  neema: {
    id: 'neema', author: 'Neema T.', avatarPos: '66% 0%', time: '3 hr',
    text: 'New short film: how we restored my father’s 1968 wedding photo with Heritage AI.',
    aiAssisted: true,
  },
}

const ORDERS: string[][] = [
  ['demo', 'juma', 'neema'], // Following — strict reverse-chron
  ['neema', 'demo', 'juma'], // For You
  ['juma', 'demo', 'neema'], // Family First
]

const BEAT_COPY = [
  {
    title: 'Ten modes. One tap.',
    body: 'Switch from the algorithmic firehose to a strict reverse-chronological Following feed — timestamps in plain sight, no hidden ranking.',
  },
  {
    title: 'Every recommendation, explained.',
    body: '“Why am I seeing this?” opens on any post: the real reasons, plus one-tap controls to see less — or change the algorithm entirely.',
  },
  {
    title: 'Fifteen algorithms. Yours to choose.',
    body: 'Pick Family First, Local News or Positive Content from the Algorithm Marketplace — or install one published by an independent developer.',
  },
]

function Avatar({ pos, className }: { pos: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('inline-block h-9 w-9 shrink-0 rounded-full border border-white/15 bg-cover', className)}
      style={{ backgroundImage: 'url(/avatars-set.jpg)', backgroundSize: '400% 300%', backgroundPosition: pos }}
    />
  )
}

/** Left column: the mock feed that FLIP-reorders per beat. */
function FeedStack({ beat }: { beat: number }) {
  const order = ORDERS[beat]
  return (
    <div className="space-y-4">
      {order.map((id, idx) => {
        const p = POSTS[id]
        return (
          <motion.article
            key={p.id}
            layout="position"
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="cloud-card p-4"
          >
            <div className="flex items-center gap-3">
              <Avatar pos={p.avatarPos} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {p.author}
                  {p.family && (
                    <svg width={13} height={13} aria-label="family post" className="ms-1.5 inline-block" style={{ verticalAlign: '-1px' }}>
                      <use href="/icon-modules.svg#mod-family" />
                    </svg>
                  )}
                </p>
                <p className={cn('mono-data text-[0.7rem]', beat === 0 ? 'text-gold-soft' : 'text-text-low')}>
                  {p.time} ago
                </p>
              </div>
              {p.aiAssisted && <ProvenanceTag kind="ai-assisted" />}
            </div>
            <p className="mt-3 text-sm leading-relaxed text-text-hi/90">{p.text}</p>
            {p.translated && (
              <button type="button" className="mt-2 rounded-full border border-sky/30 bg-sky/10 px-2.5 py-1 text-[0.7rem] font-semibold text-sky">
                Translate · AI
              </button>
            )}
            {beat === 1 && idx === 0 && (
              <div className="mt-3">
                <WhyAmISeeingThis
                  forceOpen
                  reasons={['Because you follow Demo', 'Popular in Dar es Salaam']}
                />
              </div>
            )}
          </motion.article>
        )
      })}
    </div>
  )
}

/** Right column: chips / popover context / algorithm marketplace per beat. */
function ControlsPanel({ beat }: { beat: number }) {
  return (
    <div className="cloud-card p-5">
      <p className="eyebrow text-gold mb-4">Feed modes</p>
      <div className="flex flex-wrap gap-2">
        {FEED_MODES.map((m) => (
          <ModeChip key={m} label={m} active={(beat === 0 && m === 'Following') || (beat >= 1 && m === 'For You')} />
        ))}
      </div>
      <AnimatePresence>
        {beat === 2 && (
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 border-t border-white/10 pt-5"
          >
            <p className="eyebrow text-sky mb-4">Algorithm Marketplace</p>
            <div className="flex max-h-56 flex-wrap gap-2 overflow-y-auto pe-1">
              {ALGORITHMS.map((a) => (
                <ModeChip key={a} label={a} active={a === 'Family First'} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {beat === 2 && (
        <p className="mono-data mt-4 text-[0.72rem] text-gold-soft">
          ✓ Family First active — verified relatives rank above everything
        </p>
      )}
    </div>
  )
}

/**
 * Section 4 — Pinned story: "Your feed. Your rules." (220vh).
 * GSAP owns the pin + beat progress; Framer Motion owns the feed FLIP.
 */
export default function FeedRulesStory() {
  const rootRef = useRef<HTMLElement>(null)
  const [beat, setBeat] = useState(0)

  // useGSAP, not useEffect: a passive effect's cleanup runs AFTER React has
  // already removed this node, so GSAP's revert would come too late to undo the
  // pin's DOM re-parenting — and React's removeChild then throws.
  useGSAP(() => {
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: root,
        start: 'top top',
        end: pinLength(2.2),
        pin: true,
        scrub: true,
        onUpdate: (self) => {
          const b = Math.min(2, Math.floor(self.progress * 3))
          setBeat((cur) => (cur === b ? cur : b))
        },
      })
    }, root)
    return () => ctx.revert()
  }, { dependencies: [] })

  return (
    <section ref={rootRef} className="noise-overlay relative overflow-hidden bg-ink-2/30 px-6 py-24">
      <div className="mx-auto max-w-container">
        <p className="eyebrow text-gold">Your feed. Your rules.</p>
        <div className="mt-8 grid items-start gap-10 lg:grid-cols-2">
          <FeedStack beat={beat} />
          <div className="space-y-6">
            <ControlsPanel beat={beat} />
            <AnimatePresence mode="wait">
              <motion.div
                key={beat}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="cloud-card p-5"
              >
                <h3 className="h3">{BEAT_COPY[beat].title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-mid">{BEAT_COPY[beat].body}</p>
                <div className="mt-4 flex gap-1.5" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className={cn('h-1 rounded-full transition-all duration-300', i === beat ? 'w-6 bg-gold' : 'w-2 bg-white/20')} />
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
