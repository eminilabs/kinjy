import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Flag, Power, ScrollText } from 'lucide-react'
import { Chip, SubSection } from './primitives'
import { cn } from '@/lib/utils'

type Stage = 1 | 10 | 100

interface Feature {
  key: string
  name: string
  stage: Stage
  note: string
}

const FEATURES: Feature[] = [
  { key: 'assistant-video-replies', name: 'Assistant video-clip replies', stage: 100, note: 'GA — all locales' },
  { key: 'edge-translation-drafts', name: 'On-device translation drafts', stage: 10, note: 'cohort: E2E chat users' },
  { key: 'family-heritage-restore-v2', name: 'Heritage photo restore v2', stage: 1, note: 'cohort: internal + 1%' },
]

const STAGES: Stage[] = [1, 10, 100]

/**
 * FeatureFlags (C2) — staged rollout board. Feature cards progress 1% → 10% → 100%
 * with kill-switch toggles; every flag change appends to the Assistant's knowledge
 * changelog so the assistant answers from live reality.
 */
export default function FeatureFlags() {
  const [killed, setKilled] = useState<string[]>([])
  const [log, setLog] = useState<string[]>([
    '09:12:44 assistant-video-replies → 100% · changelog #4,819 appended',
  ])

  const toggle = (f: Feature) => {
    const isKilled = killed.includes(f.key)
    setKilled((k) => (isKilled ? k.filter((x) => x !== f.key) : [...k, f.key]))
    const stamp = new Date().toISOString().slice(11, 19)
    setLog((l) =>
      [
        `${stamp} ${f.key} → ${isKilled ? 'RESTORED' : 'KILL SWITCH ENGAGED'} · changelog #${4820 + l.length} appended`,
        ...l,
      ].slice(0, 3),
    )
  }

  return (
    <SubSection
      id="feature-flags"
      eyebrow="C2 · Feature Flags + Staged Rollouts"
      title={
        <>
          <Flag size={19} className="me-2 inline text-gold" aria-hidden="true" />
          Ship to 1%. Prove it. Then 10%. Then everyone.
        </>
      }
      blurb="Every feature ships behind a flag with staged cohorts and an instant kill switch. Flag state is live configuration — changing it updates the Assistant's knowledge changelog within the same deploy tick."
    >
      <div className="grid gap-4 md:grid-cols-3">
        {FEATURES.map((f) => {
          const isKilled = killed.includes(f.key)
          const stageIdx = STAGES.indexOf(f.stage)
          return (
            <div
              key={f.key}
              className={cn(
                'rounded-card-md border p-4 transition-colors duration-200',
                isKilled ? 'border-danger/35 bg-danger/[0.06]' : 'border-white/8 bg-ink-3/50',
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="mono-data truncate text-[0.7rem] text-text-low">{f.key}</p>
                  <p className="mt-1 text-sm font-semibold leading-snug text-text-hi">{f.name}</p>
                </div>
                {/* kill switch */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={!isKilled}
                  aria-label={`Kill switch for ${f.name}`}
                  onClick={() => toggle(f)}
                  className={cn(
                    'relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 ease-cloud-ease',
                    isKilled ? 'border-danger/50 bg-danger/25' : 'border-success/40 bg-success/20',
                  )}
                >
                  <motion.span
                    layout
                    transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
                    className={cn(
                      'absolute top-0.5 h-[18px] w-[18px] rounded-full',
                      isKilled ? 'start-0.5 bg-danger' : 'start-[22px] bg-success',
                    )}
                  />
                </button>
              </div>

              {/* stage progress 1% → 10% → 100% */}
              <div className="mt-4 flex items-center gap-1" aria-label={`Rollout stage: ${f.stage}%`}>
                {STAGES.map((s, i) => (
                  <div key={s} className="flex flex-1 flex-col gap-1">
                    <div
                      className={cn(
                        'h-1.5 rounded-full transition-colors duration-300',
                        isKilled
                          ? 'bg-danger/30'
                          : i <= stageIdx
                            ? 'bg-gradient-to-r from-gold-soft to-gold'
                            : 'bg-white/10',
                      )}
                    />
                    <span
                      className={cn(
                        'mono-data text-[0.62rem]',
                        isKilled ? 'text-danger/70' : i <= stageIdx ? 'text-gold-soft' : 'text-text-low',
                      )}
                    >
                      {s}%
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="caption text-[0.72rem]">{isKilled ? 'rolled back — serving previous build' : f.note}</span>
                {isKilled ? (
                  <Chip tone="danger">
                    <Power size={10} aria-hidden="true" /> killed
                  </Chip>
                ) : (
                  <Chip tone={f.stage === 100 ? 'success' : 'gold'}>{f.stage === 100 ? 'GA' : `${f.stage}% live`}</Chip>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Assistant knowledge changelog */}
      <div className="mt-4 rounded-card-md border border-sky/25 bg-sky/[0.05] p-4">
        <p className="caption flex items-center gap-2 font-bold uppercase tracking-[0.14em] text-sky">
          <ScrollText size={13} aria-hidden="true" /> Assistant knowledge changelog · live
        </p>
        <div className="mono-data mt-2 space-y-1.5 text-[0.72rem] text-text-mid" aria-live="polite">
          <AnimatePresence initial={false}>
            {log.map((entry) => (
              <motion.p
                key={entry}
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="text-gold">›</span> {entry}
              </motion.p>
            ))}
          </AnimatePresence>
        </div>
        <p className="mt-2 text-[0.72rem] text-text-low">
          Flip a kill switch above — the Assistant's "what's new" answers update in the same tick.
        </p>
      </div>
    </SubSection>
  )
}
