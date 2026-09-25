import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Zap, GitBranch, FlaskConical, GitPullRequest, Check, X, Mic, Cpu, Stamp } from 'lucide-react'
import { ArcButton } from '@/components/ui-kit'
import { cn } from '@/lib/utils'

interface Advisory {
  id: string
  icon: typeof Mic
  title: string
  summary: string
  whyAdopt: string
  whyCode: string
  branch: string
  tests: string[]
}

const ADVISORIES: Advisory[] = [
  {
    id: 'AW-042',
    icon: Mic,
    title: 'Voice-consent verification APIs matured',
    summary:
      'Three providers now offer real-time voice-consent attestation with liveness proofs, reaching production-grade accuracy (99.2%) across 40 languages.',
    whyAdopt:
      'Kinjy records voice for dubbing and voice-preserving translation. Verifiable consent closes the biggest legal gap before scaling AI dubbing to creator voices.',
    whyCode:
      'Consent must be enforced at the gateway level — the translation/dubbing pipeline needs a consent gate before any voice model is invoked. This is a codebase change, not a policy memo.',
    branch: 'feat/voice-consent-gate',
    tests: ['consent-gate.spec.ts — 14 passing', 'dub-pipeline.e2e.ts — 6 passing', 'sandbox: 0 regressions'],
  },
  {
    id: 'AW-043',
    icon: Cpu,
    title: 'On-device small models now rival cloud for translation drafts',
    summary:
      'Sub-2B-parameter translation models now match cloud quality for draft translations in the 30 highest-traffic language pairs, at zero marginal cost.',
    whyAdopt:
      'Routing drafts on-device is a privacy win (messages never leave the device) and a cost win (est. −38% translation gateway spend) — directly aligned with the E2E-chat privacy commitment.',
    branch: 'feat/edge-translation-routing',
    whyCode:
      'The provider-independent gateway needs a new routing class (on-device) with quality/latency heuristics per language pair. Router logic lives in the codebase.',
    tests: ['router-edge.spec.ts — 22 passing', 'latency-bench.ts — p95 41ms', 'sandbox: 0 regressions'],
  },
  {
    id: 'AW-044',
    icon: Stamp,
    title: 'Provenance watermarking standard (C2PA) adoption accelerating',
    summary:
      'C2PA media signing is now supported by major camera manufacturers and two browser engines, making cryptographic content credentials interoperable at scale.',
    whyAdopt:
      'Kinjy already labels provenance (Original Upload → AI Generated). C2PA signing makes those labels tamper-evident and portable across platforms — strengthening the "Verified Source" tier.',
    branch: 'feat/c2pa-media-signing',
    whyCode:
      'Signing and verification must happen in the media ingestion pipeline and the ProvenanceTag renderer. Both are code paths.',
    tests: ['c2pa-sign.spec.ts — 11 passing', 'provenance-render.spec.ts — 8 passing', 'sandbox: 0 regressions'],
  },
]

/**
 * AiWatchSection — the assistant's AI industry watch inbox: advisories with reason to
 * adopt, proposed branch + sandbox tests, and an "Instruct to execute" flow that ends
 * at a human-merge pull request.
 */
export default function AiWatchSection() {
  const [activeId, setActiveId] = useState(ADVISORIES[0].id)
  const [readIds, setReadIds] = useState<string[]>([ADVISORIES[0].id])
  const [confirming, setConfirming] = useState(false)
  const [executed, setExecuted] = useState<string[]>([])
  const [dismissed, setDismissed] = useState<string[]>([])

  const active = ADVISORIES.find((a) => a.id === activeId) ?? ADVISORIES[0]

  const open = (id: string) => {
    setActiveId(id)
    setReadIds((r) => (r.includes(id) ? r : [...r, id]))
  }

  const execute = () => {
    setExecuted((e) => [...e, active.id])
    setConfirming(false)
  }

  return (
    <section aria-labelledby="aiwatch-heading" className="border-t border-white/8 px-5 py-10 md:px-8">
      <p className="eyebrow text-gold">Kinjy Assistant · Admin operations</p>
      <h2 id="aiwatch-heading" className="h3 mt-2 flex items-center gap-2 text-xl">
        <Zap size={20} className="text-gold" aria-hidden="true" /> AI Watch inbox
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-text-mid">
        The assistant observes AI industry developments and brings worthwhile ones to the admin —
        with a reason to adopt, a proposed implementation, and sandbox tests. Humans always merge.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-[300px_1fr]">
        {/* Inbox */}
        <div className="space-y-2">
          {ADVISORIES.filter((a) => !dismissed.includes(a.id)).map((a, i) => {
            const unread = !readIds.includes(a.id)
            return (
              <motion.button
                key={a.id}
                type="button"
                initial={{ opacity: 0, x: -18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                onClick={() => open(a.id)}
                aria-pressed={activeId === a.id}
                className={cn(
                  'relative w-full rounded-card-md border p-4 text-start transition-colors duration-200',
                  activeId === a.id
                    ? 'border-gold/45 bg-gold/[0.08]'
                    : 'border-white/8 bg-ink-3/50 hover:border-white/20',
                )}
              >
                {unread && (
                  <span
                    className="absolute end-3 top-3 h-2 w-2 rounded-full bg-gold shadow-[0_0_8px_rgba(217,166,72,0.8)]"
                    aria-label="unread"
                  />
                )}
                <span className="mono-data block text-[0.68rem] text-text-low">{a.id}</span>
                <span className="mt-1 flex items-start gap-2 text-sm font-semibold leading-snug text-text-hi">
                  <a.icon size={15} className="mt-0.5 shrink-0 text-sky" aria-hidden="true" />
                  {a.title}
                </span>
                {executed.includes(a.id) && (
                  <span className="mono-data mt-2 inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[0.65rem] text-success">
                    <GitPullRequest size={10} aria-hidden="true" /> PR opened
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>

        {/* Detail panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="rounded-card-md border border-white/8 bg-ink-3/50 p-5"
          >
            <p className="mono-data text-[0.7rem] uppercase tracking-[0.14em] text-text-low">
              Development · {active.id}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-text-hi">{active.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-mid">{active.summary}</p>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-card-sm border border-white/8 bg-ink-2 p-3.5">
                <p className="caption font-bold uppercase tracking-[0.14em] text-gold-soft">Why adopt</p>
                <p className="mt-1.5 text-sm text-text-mid">{active.whyAdopt}</p>
              </div>
              <div className="rounded-card-sm border border-white/8 bg-ink-2 p-3.5">
                <p className="caption font-bold uppercase tracking-[0.14em] text-sky">Why codebase execution</p>
                <p className="mt-1.5 text-sm text-text-mid">{active.whyCode}</p>
              </div>
            </div>

            {/* Proposed branch + sandbox tests */}
            <div className="mt-3 rounded-card-sm border border-white/8 bg-ink-2 p-3.5">
              <p className="mono-data flex items-center gap-2 text-[0.75rem] text-gold-soft">
                <GitBranch size={13} aria-hidden="true" /> {active.branch}
              </p>
              <ul className="mono-data mt-2 space-y-1 text-[0.72rem] text-text-low">
                {active.tests.map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <FlaskConical size={11} className="text-success" aria-hidden="true" /> {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <ArcButton variant="ghost" size="sm" type="button">
                Review diff
              </ArcButton>
              <ArcButton
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setDismissed((d) => [...d, active.id])}
                className="text-text-low"
              >
                Dismiss
              </ArcButton>
              {executed.includes(active.id) ? (
                <span className="mono-data inline-flex items-center gap-2 rounded-full border border-success/35 bg-success/10 px-4 py-2 text-[0.78rem] text-success">
                  <GitPullRequest size={14} aria-hidden="true" /> Pull request opened · awaiting human merge
                </span>
              ) : (
                <ArcButton variant="gold" size="sm" type="button" onClick={() => setConfirming(true)}>
                  <Zap size={14} aria-hidden="true" /> Instruct to execute
                </ArcButton>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Confirmation modal */}
      <AnimatePresence>
        {confirming && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/80 p-6 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm AI Watch execution"
            onClick={() => setConfirming(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-card-lg border border-white/12 bg-ink-2 p-6 shadow-cloud"
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="h3 text-lg">Instruct the assistant to execute?</h3>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setConfirming(false)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/12 text-text-mid hover:text-text-hi"
                >
                  <X size={15} />
                </button>
              </div>
              <p className="mt-2 text-sm text-text-mid">
                The assistant will implement <span className="mono-data text-gold-soft">{active.branch}</span> on a
                sandbox branch, run its test suite, and open a pull request.{' '}
                <strong className="text-text-hi">A human always reviews and merges.</strong>
              </p>
              <div className="mt-5 flex justify-end gap-2.5">
                <ArcButton variant="ghost" size="sm" type="button" onClick={() => setConfirming(false)}>
                  Cancel
                </ArcButton>
                <ArcButton variant="gold" size="sm" type="button" onClick={execute}>
                  <Check size={14} aria-hidden="true" /> Confirm execution
                </ArcButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}
