import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Baby, GraduationCap, UserRound, ShieldCheck, EyeOff, Ban, Clock, Scale, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Mode {
  id: string
  icon: typeof Baby
  name: string
  tagline: string
  shield: string
  ring: string
  points: { icon: typeof Check; text: string }[]
  preview: { chips: string[]; note: string }
}

const MODES: Mode[] = [
  {
    id: 'child',
    icon: Baby,
    name: 'Child-safe public browsing',
    tagline: 'The strictest possible space.',
    shield: 'text-success',
    ring: 'border-success/40 bg-success/10',
    points: [
      { icon: ShieldCheck, text: 'Strictest content filters across every surface' },
      { icon: Ban, text: 'No DMs from strangers — ever' },
      { icon: EyeOff, text: 'No ads personalization, no behavioral tracking' },
      { icon: Scale, text: 'COPPA-aware by design: under-13s get a walled, read-mostly public space' },
    ],
    preview: {
      chips: ['Following', 'Local'],
      note: 'Feed contains only reviewed, age-rated public content. Messaging and ads modules are hidden entirely.',
    },
  },
  {
    id: 'teen',
    icon: GraduationCap,
    name: 'Teen mode',
    tagline: 'Discovery, with guardrails.',
    shield: 'text-sky',
    ring: 'border-sky/40 bg-sky/10',
    points: [
      { icon: ShieldCheck, text: 'Balanced discovery with filtered recommendations' },
      { icon: Clock, text: 'Time-well-spent nudges, gentle by default' },
      { icon: Ban, text: 'No adult-content surfaces, restricted DM requests' },
      { icon: EyeOff, text: 'Ads personalization off by default' },
    ],
    preview: {
      chips: ['Following', 'For You', 'Trending', 'Local'],
      note: 'The For You feed runs a guardrailed algorithm: no engagement-maximizing loops, and "Why am I seeing this?" on every recommendation.',
    },
  },
  {
    id: 'adult',
    icon: UserRound,
    name: 'Adult mode',
    tagline: 'The full platform, within the law.',
    shield: 'text-indigo',
    ring: 'border-indigo/40 bg-indigo/10',
    points: [
      { icon: ShieldCheck, text: 'Every legal surface, every module' },
      { icon: Check, text: 'Every control documented and user-adjustable' },
      { icon: Scale, text: 'Lawful-content boundaries enforced transparently' },
      { icon: Clock, text: 'Optional time-well-spent tools' },
    ],
    preview: {
      chips: ['Following', 'For You', 'Circles', 'Trending', 'Topics', 'Global'],
      note: 'Full feed modes and the complete Algorithm Marketplace — every control visible, every decision appealable.',
    },
  },
]

/**
 * AgeModes — three age-appropriate space cards (COPPA-aware child-safe, teen, adult).
 * Cards flip in (rotateY); selecting one crossfades its mini feed preview into a
 * shared preview window.
 */
export default function AgeModes() {
  const [activeId, setActiveId] = useState('child')
  const active = MODES.find((m) => m.id === activeId) ?? MODES[0]

  return (
    <section aria-labelledby="age-heading" className="twilight-field noise-overlay py-24">
      <div className="mx-auto max-w-container px-6">
        <p className="eyebrow text-gold">Age-appropriate spaces</p>
        <h2 id="age-heading" className="h2 mt-3 max-w-2xl">
          Different ages, different worlds — one account system.
        </h2>

        <div className="mt-12 grid gap-8 lg:grid-cols-[1.15fr_1fr]">
          {/* Mode cards */}
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3" style={{ perspective: 1200 }}>
            {MODES.map((mode, i) => (
              <motion.button
                key={mode.id}
                type="button"
                onClick={() => setActiveId(mode.id)}
                aria-pressed={activeId === mode.id}
                initial={{ opacity: 0, rotateY: 90 }}
                whileInView={{ opacity: 1, rotateY: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.6, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  'cloud-card p-5 text-start transition-colors duration-200',
                  activeId === mode.id && 'shadow-gold-ring border-gold/40',
                )}
              >
                <span className={cn('inline-flex h-11 w-11 items-center justify-center rounded-full border', mode.ring, mode.shield)}>
                  <mode.icon size={19} strokeWidth={1.9} />
                </span>
                <p className="mt-3 text-sm font-bold leading-snug text-text-hi">{mode.name}</p>
                <p className="caption mt-1">{mode.tagline}</p>
                <ul className="mt-3 space-y-2">
                  {mode.points.map((p) => (
                    <li key={p.text} className="flex gap-2 text-[0.78rem] leading-snug text-text-mid">
                      <p.icon size={13} className={cn('mt-0.5 shrink-0', mode.shield)} aria-hidden="true" />
                      {p.text}
                    </li>
                  ))}
                </ul>
              </motion.button>
            ))}
          </div>

          {/* Shared preview window */}
          <div className="cloud-card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-white/8 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
              <span className="mono-data ms-2 text-[0.68rem] text-text-low">
                kaluta.app · {active.id} mode preview
              </span>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="p-5"
              >
                <div className="flex flex-wrap gap-2">
                  {active.preview.chips.map((chip, i) => (
                    <span
                      key={chip}
                      className={cn(
                        'rounded-full px-3.5 py-1.5 text-[0.78rem] font-semibold',
                        i === 0
                          ? 'bg-gradient-to-br from-gold-soft to-gold text-ink'
                          : 'border border-white/14 bg-white/5 text-text-mid',
                      )}
                    >
                      {chip}
                    </span>
                  ))}
                </div>
                {/* mini feed mock */}
                <div className="mt-4 space-y-3">
                  {[0.9, 0.7, 0.5].map((o, i) => (
                    <div key={i} className="rounded-card-sm border border-white/8 bg-white/[0.04] p-3.5" style={{ opacity: o }}>
                      <div className="flex items-center gap-2.5">
                        <span className="h-7 w-7 rounded-full bg-gradient-to-br from-indigo to-sky/60" />
                        <span className="h-2 w-24 rounded-full bg-white/15" />
                        <span className="mono-data ms-auto text-[0.62rem] text-success">✓ reviewed</span>
                      </div>
                      <div className="mt-3 space-y-1.5">
                        <span className="block h-2 w-full rounded-full bg-white/10" />
                        <span className="block h-2 w-4/5 rounded-full bg-white/10" />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="caption mt-4 border-t border-white/8 pt-3">{active.preview.note}</p>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
