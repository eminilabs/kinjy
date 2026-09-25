import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { GitMerge, RefreshCw } from 'lucide-react'
import { INGEST_LOG, KB_LAST_SYNC, KB_VERSION } from './knowledgeBase'

/**
 * SelfUpdate — "Knowledge sync" indicator (assistant.md B.3 / Section 5).
 * Shows KB version + last codebase sync; the popover simulates the changelog
 * ingestion pipeline that keeps the assistant's knowledge current whenever
 * the website codebase and features change.
 */

const PIPELINE = [
  'Code change merged',
  'Changelog & feature docs generated',
  'Knowledge re-ingested',
  'Answers & demo clips refreshed',
  'Admins notified',
]

export default function SelfUpdate({ align = 'end' }: { align?: 'start' | 'end' }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`Knowledge synced to ${KB_VERSION}, last sync ${KB_LAST_SYNC}. Open changelog.`}
        className="flex items-center gap-1.5 rounded-full border border-success/25 bg-success/10 px-2.5 py-1 text-[0.62rem] font-semibold text-success transition-colors hover:border-success/45"
      >
        <RefreshCw size={10} aria-hidden="true" />
        Synced to {KB_VERSION} · {KB_LAST_SYNC}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className={`absolute top-8 z-30 w-80 rounded-card-md cloud-glass bg-ink-2/95 p-4 shadow-cloud ${
              align === 'end' ? 'end-0' : 'start-0'
            }`}
            role="dialog"
            aria-label="Knowledge ingestion changelog"
          >
            <p className="eyebrow text-gold-soft">Changelog ingestion</p>
            <p className="caption mt-1.5">
              Every merged release regenerates the changelog, re-ingests this knowledge base and re-renders
              affected answers and demo clips. Answer-quality evals gate deployment.
            </p>

            <ol className="mt-3 space-y-1">
              {PIPELINE.map((stage, i) => (
                <li key={stage} className="flex items-center gap-2 text-[0.68rem] text-text-mid">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-gold/40 font-mono text-[0.55rem] text-gold-soft">
                    {i + 1}
                  </span>
                  {stage}
                  {i < PIPELINE.length - 1 && <GitMerge size={9} className="ms-auto text-text-low" aria-hidden="true" />}
                </li>
              ))}
            </ol>

            <div className="mt-3 rounded-card-sm border border-white/10 bg-ink/70 p-2.5">
              <p className="mb-1.5 font-mono text-[0.6rem] uppercase tracking-widest text-text-low">ingest.log</p>
              {INGEST_LOG.map((line) => (
                <p key={line} className="font-mono text-[0.6rem] leading-relaxed text-text-mid">
                  <span className="text-success">✓</span> {line}
                </p>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
