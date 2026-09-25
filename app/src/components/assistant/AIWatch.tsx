import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Clock, GitPullRequest, Loader2, ShieldCheck, X, Zap } from 'lucide-react'
import { useRole } from './roleStore'
import type { WatchAdvisory, WatchStatus } from './watchData'
import { WATCH_ADVISORIES } from './watchData'

/**
 * AIWatch — the admin-only "AI Industry Watch" inbox (assistant.md §6 / B.3).
 * The assistant observes developments in AI and related industry practices and
 * notifies admins when something is worth adopting. Each advisory carries:
 * (1) what happened, (2) why we should adopt it, (3) why a codebase change is
 * required + proposed implementation/diff preview, (4) actions — Review diff /
 * Dismiss / Instruct to execute. Execution stages a change through
 * Queued → Executing → PR opened; a human merge is ALWAYS required.
 */

function StatusChip({ status }: { status: WatchStatus }) {
  if (status === 'queued')
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-2.5 py-1 text-[0.62rem] font-bold text-warning">
        <Clock size={10} aria-hidden="true" /> Queued
      </span>
    )
  if (status === 'executing')
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-info/30 bg-info/10 px-2.5 py-1 text-[0.62rem] font-bold text-info">
        <Loader2 size={10} className="animate-spin" aria-hidden="true" /> Executing
      </span>
    )
  if (status === 'pr-opened')
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-[0.62rem] font-bold text-success">
        <GitPullRequest size={10} aria-hidden="true" /> PR opened · awaiting your merge
      </span>
    )
  if (status === 'dismissed')
    return (
      <span className="rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-[0.62rem] font-bold text-text-low">
        Dismissed
      </span>
    )
  return (
    <span className="flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[0.62rem] font-bold text-gold-soft">
      <Zap size={10} aria-hidden="true" /> Development worth noting
    </span>
  )
}

export function AIWatchCard({ advisory, demo = false }: { advisory: WatchAdvisory; demo?: boolean }) {
  const [status, setStatus] = useState<WatchStatus>('new')
  const [diffOpen, setDiffOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // Simulated execution pipeline: Queued → Executing → PR opened.
  useEffect(() => {
    if (status !== 'queued' && status !== 'executing') return
    const id = setTimeout(
      () => setStatus((s) => (s === 'queued' ? 'executing' : 'pr-opened')),
      status === 'queued' ? 900 : 2400,
    )
    return () => clearTimeout(id)
  }, [status])

  const totalAdd = advisory.diff.reduce((n, d) => n + d.add, 0)
  const totalDel = advisory.diff.reduce((n, d) => n + d.del, 0)
  const actionable = status === 'new'

  return (
    <article className="rounded-card-md border border-white/15 bg-ink-2/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip status={status} />
        <span className="ms-auto font-mono text-[0.62rem] text-text-low">{advisory.branch}</span>
      </div>
      <h4 className="mt-2.5 text-sm font-bold leading-snug">{advisory.title}</h4>
      <p className="caption mt-1">{advisory.what}</p>

      <div className="mt-3 space-y-2 text-[0.78rem] leading-relaxed">
        <p>
          <span className="font-bold text-gold-soft">Why adopt: </span>
          <span className="text-text-mid">{advisory.whyAdopt}</span>
        </p>
        <p>
          <span className="font-bold text-sky">Why code changes are needed: </span>
          <span className="text-text-mid">{advisory.whyCode}</span>
        </p>
      </div>

      {/* Proposed codebase / diff preview */}
      <div className="mt-3 rounded-card-sm border border-white/10 bg-ink/70">
        <button
          type="button"
          onClick={() => setDiffOpen((v) => !v)}
          aria-expanded={diffOpen}
          className="flex w-full items-center justify-between px-3 py-2 text-start"
        >
          <span className="font-mono text-[0.66rem] text-text-mid">
            {advisory.branch} — {advisory.diff.length} files changed
            <span className="text-success"> +{totalAdd}</span>
            <span className="text-danger"> −{totalDel}</span>
          </span>
          <span className="text-[0.62rem] font-semibold text-gold-soft">{diffOpen ? 'Hide diff' : 'Review diff'}</span>
        </button>
        <AnimatePresence initial={false}>
          {diffOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden"
            >
              <div className="border-t border-white/10 px-3 py-2">
                {advisory.diff.map((d) => (
                  <p key={d.file} className="font-mono text-[0.64rem] leading-relaxed text-text-mid">
                    {d.file}
                    <span className="text-success"> +{d.add}</span>
                    <span className="text-danger"> −{d.del}</span>
                    {d.note && <span className="ms-2 rounded bg-gold/15 px-1.5 py-0.5 text-[0.56rem] text-gold-soft">{d.note}</span>}
                  </p>
                ))}
                <p className="mt-1.5 flex items-center gap-1.5 font-mono text-[0.62rem] text-success">
                  <ShieldCheck size={11} aria-hidden="true" /> {advisory.tests}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setDiffOpen(true)}
          disabled={!actionable && status !== 'pr-opened'}
          className="rounded-full cloud-glass px-3.5 py-1.5 text-[0.7rem] font-semibold text-text-hi transition-colors hover:text-gold-soft disabled:opacity-40"
        >
          Review diff
        </button>
        <button
          type="button"
          onClick={() => setStatus('dismissed')}
          disabled={!actionable}
          className="rounded-full cloud-glass px-3.5 py-1.5 text-[0.7rem] font-semibold text-text-mid transition-colors hover:text-text-hi disabled:opacity-40"
        >
          Dismiss
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={!actionable}
          className="ms-auto rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-1.5 text-[0.7rem] font-bold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:brightness-110 disabled:opacity-40"
        >
          Instruct to execute
        </button>
      </div>
      {status === 'pr-opened' && (
        <p className="mt-2.5 flex items-center gap-1.5 rounded-card-sm border border-success/25 bg-success/10 px-3 py-2 text-[0.7rem] text-success">
          <CheckCircle2 size={13} aria-hidden="true" />
          Pull request opened — reviewable code, never silent changes. Human merge approval is required.
        </p>
      )}

      {/* Confirmation modal */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/70 p-6 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label="Confirm execution"
            onClick={() => setConfirmOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="w-full max-w-sm rounded-card-lg cloud-glass bg-ink-2/95 p-6 shadow-cloud"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <h5 className="text-base font-bold">Instruct the assistant to execute?</h5>
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  aria-label="Cancel"
                  className="flex h-7 w-7 items-center justify-center rounded-full cloud-glass text-text-mid hover:text-text-hi"
                >
                  <X size={14} />
                </button>
              </div>
              <p className="caption mt-2">
                The assistant will apply <span className="font-mono text-gold-soft">{advisory.branch}</span> and open a
                pull request. Human merge approval is always required — it advises; you decide.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmOpen(false)}
                  className="flex-1 rounded-full cloud-glass px-4 py-2 text-sm font-semibold text-text-hi hover:text-gold-soft"
                >
                  Not yet
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfirmOpen(false)
                    setStatus('queued')
                  }}
                  className="flex-1 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-sm font-bold text-ink transition hover:brightness-110"
                >
                  Execute
                </button>
              </div>
              {demo && <p className="mt-3 text-center font-mono text-[0.6rem] text-text-low">simulated — sandbox only</p>}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  )
}

/** The ⚡ inbox listing (admin-only). */
export default function AIWatch() {
  const { canSeeAdmin } = useRole()

  if (!canSeeAdmin) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <ShieldCheck size={28} className="text-gold-soft" aria-hidden="true" />
        <p className="text-sm font-bold">AI Watch is scoped to administrators</p>
        <p className="caption max-w-[280px]">
          Industry advisories and execution controls never leak outside the admin role. Switch the role demo to{' '}
          <span className="text-gold-soft">Admin</span> to preview it.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3 p-4">
      <p className="caption px-1">
        It watches the frontier, so you don't have to. Advisories appear only when adoption would add real value to
        Kinjy — execution always produces reviewable code.
      </p>
      {WATCH_ADVISORIES.map((a) => (
        <AIWatchCard key={a.id} advisory={a} />
      ))}
    </div>
  )
}
