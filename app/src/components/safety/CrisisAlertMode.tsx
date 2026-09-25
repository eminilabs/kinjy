import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BellRing,
  Building2,
  Check,
  HeartHandshake,
  House,
  MapPin,
  Users,
  Waves,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ArcButton, ProvenanceTag } from '@/components/ui-kit'
import { EASE, useReducedMotion } from './motion-utils'

const BASE_SAFE_COUNT = 12847

const FEEDS = [
  { icon: MapPin, label: 'Kigoma City feed', reach: '412k reached', delay: 0 },
  { icon: Building2, label: 'Kigoma-Ujiji District feed', reach: '188k reached', delay: 0.15 },
  { icon: House, label: 'Kibirizi Neighborhood feed', reach: '9.4k reached', delay: 0.3 },
]

/**
 * CrisisAlertMode — geographic crisis alert demo (B4). A verified flood alert
 * for Kigoma with a live "I'm safe" check-in counter, family-circle
 * notification preview, and city/district/neighborhood distribution feeds.
 */
export default function CrisisAlertMode() {
  const reduced = useReducedMotion()
  const [markedSafe, setMarkedSafe] = useState(false)
  const safeCount = BASE_SAFE_COUNT + (markedSafe ? 1 : 0)

  return (
    <section aria-labelledby="crisis-heading" className="px-6 py-24">
      <div className="mx-auto max-w-container">
        <div className="max-w-2xl">
          <p className="eyebrow text-coral">Crisis &amp; Community Alert Mode</p>
          <h2 id="crisis-heading" className="h2 mt-3">
            When it matters most, Kinjy switches to{' '}
            <span className="font-display italic text-gold-grad">crisis mode.</span>
          </h2>
          <p className="body-lg mt-4 text-text-mid">
            Verified local alerts cut through the feed — from city to district to your own street —
            and one tap tells everyone who loves you that you're okay.
          </p>
        </div>

        <div className="mt-14 grid items-start gap-8 lg:grid-cols-[1.15fr_1fr]">
          {/* Alert card */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ duration: 0.7, ease: EASE }}
            className="cloud-card overflow-hidden"
          >
            {/* Alert header */}
            <div className="border-b border-white/10 bg-coral/[0.08] px-5 py-4">
              <div className="flex flex-wrap items-center gap-3">
                <motion.span
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-coral/20"
                  animate={reduced ? undefined : { scale: [1, 1.08, 1] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Waves size={18} className="text-coral" aria-hidden="true" />
                </motion.span>
                <div>
                  <p className="text-sm font-bold text-text-hi">
                    Flood alert — Kigoma Region
                  </p>
                  <p className="caption">Issued 14 min ago · Tanzania Meteorological Authority</p>
                </div>
                <div className="ms-auto">
                  <ProvenanceTag kind="verified" />
                </div>
              </div>
            </div>

            <div className="p-5">
              <p className="text-sm leading-relaxed text-text-hi">
                Heavy rainfall expected to continue for 48 hours. Lake Tanganyika shoreline
                communities in Kigoma-Ujiji should move to higher ground. Shelters are open at
                Kibirizi Primary School and the District Hall.
              </p>

              {/* Check-in row */}
              <div className="mt-5 flex flex-wrap items-center gap-4 rounded-card-md border border-white/10 bg-ink-3/60 p-4">
                <div aria-live="polite">
                  <p className="mono-data text-[0.65rem] uppercase tracking-wider text-text-low">
                    Marked safe in your area
                  </p>
                  <p className="mono-data mt-1 text-2xl font-semibold text-gold-soft">
                    {safeCount.toLocaleString()}
                    <AnimatePresence>
                      {markedSafe && (
                        <motion.span
                          key="bump"
                          initial={reduced ? false : { opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.4, ease: EASE }}
                          className="ms-2 text-sm text-success"
                        >
                          +1 you
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </p>
                </div>
                <ArcButton
                  size="sm"
                  variant={markedSafe ? 'ghost' : 'gold'}
                  className={cn('ms-auto', markedSafe && 'border-success/50 text-success')}
                  onClick={() => setMarkedSafe((v) => !v)}
                  aria-pressed={markedSafe}
                >
                  {markedSafe ? (
                    <>
                      <Check size={15} aria-hidden="true" /> You're marked safe
                    </>
                  ) : (
                    <>
                      <HeartHandshake size={15} aria-hidden="true" /> I'm safe
                    </>
                  )}
                </ArcButton>
              </div>

              {/* Family-circle notification preview */}
              <AnimatePresence>
                {markedSafe && (
                  <motion.div
                    initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                    transition={{ duration: 0.5, ease: EASE }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 flex items-start gap-3 rounded-card-md border border-success/35 bg-success/[0.07] p-4">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-soft to-gold">
                        <BellRing size={14} className="text-ink" aria-hidden="true" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-text-hi">
                          Family Circle notified
                        </p>
                        <p className="caption mt-0.5">
                          “Demo marked themselves safe during the Kigoma flood alert.” — sent to
                          Mama Neema, Uncle Juma, and 5 family members across 2 countries.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Distribution feeds */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ duration: 0.7, delay: 0.12, ease: EASE }}
            className="cloud-card p-5"
          >
            <p className="mono-data flex items-center gap-2 text-[0.7rem] uppercase tracking-wider text-text-low">
              <Users size={13} className="text-sky" aria-hidden="true" /> Alert distribution
            </p>
            <p className="caption mt-2">
              One verified alert, cascaded through every geographic layer — no rumor required.
            </p>
            <ul className="mt-5 space-y-3">
              {FEEDS.map((feed, i) => (
                <motion.li
                  key={feed.label}
                  initial={reduced ? false : { opacity: 0, x: 24 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.5, delay: feed.delay, ease: EASE }}
                  className="relative flex items-center gap-3 rounded-card-md border border-white/10 bg-ink-3/60 p-3.5"
                >
                  {/* connecting arc between feed layers */}
                  {i < FEEDS.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute start-[1.95rem] top-full h-3 w-px bg-gradient-to-b from-gold/60 to-gold/20"
                    />
                  )}
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo/25">
                    <feed.icon size={15} className="text-sky" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text-hi">{feed.label}</p>
                    <p className="caption">{feed.reach}</p>
                  </div>
                  <span className="mono-data ms-auto text-[0.65rem] text-success">delivered</span>
                </motion.li>
              ))}
            </ul>
            <p className="caption mt-5 border-t border-white/10 pt-4">
              Crisis alerts always carry a verified-source badge and are pinned above every feed in
              the affected area until the all-clear.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
