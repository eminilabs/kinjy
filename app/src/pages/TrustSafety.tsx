import { useState } from 'react'
import { AlertTriangle, Clock, Eye, Gavel, ShieldAlert } from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import { useApi } from '@/hooks/useApi'
import {
  ApiError,
  kaluta,
  type AppealItem,
  type ModerationOverview,
  type ReviewItem,
} from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * The Trust & Safety console.
 *
 * Two queues and the numbers that describe them. The numbers are the reason
 * this page is arranged the way it is: the overturn rate sits at the top, next
 * to the queue depth, because a reviewer who can see that a third of these
 * decisions are being overturned is being told something about the classifier,
 * not about the people appealing.
 *
 * The admin surface this replaces carried hard-coded figures — "4.2M items
 * screened / day", "96 open to humans" — which is worse than showing nothing,
 * because a fabricated queue depth looks exactly like a healthy one.
 *
 * Content is shown in the queue rather than linked from it. A reviewer who has
 * to open each item somewhere else works the queue slowly, and a queue nobody
 * works shows up as teenagers seeing an empty feed rather than as a backlog
 * anyone notices.
 */

const RATINGS = [
  'GENERAL',
  'TEEN_13_PLUS',
  'TEEN_16_PLUS',
  'ADULT_18_PLUS',
  'PROHIBITED',
] as const

function Stat({
  label,
  value,
  tone,
  hint,
}: {
  label: string
  value: string | number
  tone?: 'warn' | 'bad'
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-text-low/25 p-4">
      <p className="text-xs uppercase tracking-wide opacity-70">{label}</p>
      <p
        className={cn(
          'mt-1 text-2xl font-semibold tabular-nums',
          tone === 'warn' && 'text-warning',
          tone === 'bad' && 'text-danger',
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs opacity-60">{hint}</p> : null}
    </div>
  )
}

export default function TrustSafety() {
  const overview = useApi<ModerationOverview>(() => kaluta.trustSafety.overview(), [])
  const appeals = useApi(() => kaluta.trustSafety.appeals(), [])
  const review = useApi(() => kaluta.trustSafety.reviewQueue(), [])

  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  const reloadAll = () => {
    overview.reload()
    appeals.reload()
    review.reload()
  }

  const run = async (key: string, action: () => Promise<unknown>) => {
    setBusy(key)
    setError(null)
    try {
      await action()
      reloadAll()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work.')
    } finally {
      setBusy(null)
    }
  }

  const stats = overview.data
  const appealItems: AppealItem[] = appeals.data?.items ?? []
  const reviewItems: ReviewItem[] = review.data?.items ?? []

  // An admin who is not staff gets a 403 from every call above. Say so plainly
  // rather than rendering three empty queues that look like a quiet day.
  const forbidden =
    overview.error?.includes('403') ||
    overview.error?.toLowerCase().includes('forbidden') ||
    overview.error?.toLowerCase().includes('admin')

  return (
    <AppShell
      title="Trust & Safety"
      subtitle="The review queue, the appeals queue, and how often we turn out to be wrong."
    >
      <div className="space-y-8">
        {forbidden ? (
          <p role="alert" className="rounded-xl border border-warning/50 bg-warning/10 p-4 text-sm">
            This console is for Trust &amp; Safety staff. Your account does not have access.
          </p>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-lg border border-danger/50 bg-danger/10 p-3 text-sm">
            {error}
          </p>
        ) : null}

        {stats ? (
          <section aria-labelledby="ts-numbers">
            <h2 id="ts-numbers" className="sr-only">
              Current numbers
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Awaiting review"
                value={stats.pending_review}
                tone={stats.pending_review > 50 ? 'warn' : undefined}
                hint="Restricted until somebody looks"
              />
              <Stat
                label="Appeals open"
                value={stats.appeals.open}
                tone={stats.appeals.overdue > 0 ? 'warn' : undefined}
                hint={
                  stats.appeals.overdue > 0
                    ? `${stats.appeals.overdue} past their deadline`
                    : 'None overdue'
                }
              />
              <Stat
                label="Overturn rate"
                value={
                  stats.appeals.overturn_rate === null
                    ? '—'
                    : `${Math.round(stats.appeals.overturn_rate * 100)}%`
                }
                tone={
                  stats.appeals.overturn_rate !== null && stats.appeals.overturn_rate > 0.25
                    ? 'warn'
                    : undefined
                }
                hint={`of ${stats.appeals.answered} answered`}
              />
              <Stat
                label="Child-safety escalations"
                value={stats.child_safety_escalations}
                tone={stats.child_safety_escalations > 0 ? 'bad' : undefined}
                hint="Not handled on this page"
              />
            </div>
            <p className="mt-2 text-xs opacity-60">
              {stats.reports_24h} reports in the last 24 hours · {stats.reports_total} in
              total · {stats.classified_total} items classified
            </p>
          </section>
        ) : null}

        {stats && stats.child_safety_escalations > 0 ? (
          <p className="flex items-start gap-2 rounded-xl border border-danger/50 bg-danger/10 p-4 text-sm">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              {stats.child_safety_escalations} item
              {stats.child_safety_escalations === 1 ? '' : 's'} carry an exploitation signal.
              These are not appealable here and are not shown in either queue below — they
              go to the child-safety process, not to general review.
            </span>
          </p>
        ) : null}

        {/* --- Appeals ------------------------------------------------- */}
        <section aria-labelledby="ts-appeals" className="space-y-3">
          <h2 id="ts-appeals" className="flex items-center gap-2 text-lg font-semibold">
            <Gavel className="size-5 shrink-0" aria-hidden />
            Appeals
            <span className="text-sm font-normal opacity-70">({appealItems.length})</span>
          </h2>

          {appeals.loading ? <p className="text-sm opacity-70">Loading…</p> : null}
          {!appeals.loading && appealItems.length === 0 ? (
            <p className="rounded-xl border border-text-low/25 p-4 text-sm opacity-70">
              No open appeals.
            </p>
          ) : null}

          <ul className="space-y-3">
            {appealItems.map((a) => (
              <li
                key={a.id}
                className={cn(
                  'space-y-3 rounded-xl border p-4',
                  a.overdue ? 'border-warning/50 bg-warning/10' : 'border-text-low/25',
                )}
              >
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-text-low/30 px-2 py-0.5">
                    {a.content_kind ?? 'content'}
                  </span>
                  <span className="rounded-full border border-text-low/30 px-2 py-0.5">
                    {a.age_rating}
                  </span>
                  <span className="rounded-full border border-text-low/30 px-2 py-0.5">
                    {a.decided_by === 'automatic' ? 'decided automatically' : 'decided by a person'}
                  </span>
                  {a.overdue ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-warning/60 px-2 py-0.5 text-warning">
                      <Clock className="size-3 shrink-0" aria-hidden />
                      overdue
                    </span>
                  ) : (
                    <span className="opacity-60">
                      due {new Date(a.due_at).toLocaleDateString()}
                    </span>
                  )}
                </div>

                {a.body_snapshot ? (
                  <div>
                    <p className="text-xs uppercase tracking-wide opacity-70">
                      {a.action === 'refused_publication' ? 'What was refused' : 'The content'}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap rounded-lg border border-text-low/25 bg-text-low/10 p-3 text-sm text-text-hi">
                      {a.body_snapshot}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs opacity-60">
                    The content is no longer available to read.
                  </p>
                )}

                <div>
                  <p className="text-xs uppercase tracking-wide opacity-70">Their grounds</p>
                  <p className="mt-1 text-sm">{a.grounds || <span className="opacity-60">None given.</span>}</p>
                </div>

                <input
                  value={notes[a.id] ?? ''}
                  onChange={(e) => setNotes((n) => ({ ...n, [a.id]: e.target.value }))}
                  placeholder="Why — the appellant is shown this"
                  className="w-full rounded-lg border border-text-low/30 bg-transparent px-3 py-2 text-sm"
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy === a.id}
                    onClick={() =>
                      run(a.id, () =>
                        kaluta.trustSafety.decideAppeal(a.id, true, notes[a.id] || undefined),
                      )
                    }
                    className="rounded-lg bg-text-hi/10 px-3 py-1.5 text-sm hover:bg-text-hi/20 disabled:opacity-50"
                  >
                    Overturn — remove the restriction
                  </button>
                  <button
                    type="button"
                    disabled={busy === a.id}
                    onClick={() =>
                      run(a.id, () =>
                        kaluta.trustSafety.decideAppeal(a.id, false, notes[a.id] || undefined),
                      )
                    }
                    className="rounded-lg px-3 py-1.5 text-sm underline opacity-80 disabled:opacity-50"
                  >
                    Uphold
                  </button>
                </div>
                <p className="text-xs opacity-60">
                  You cannot answer an appeal against a decision you made yourself.
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* --- Review queue -------------------------------------------- */}
        <section aria-labelledby="ts-review" className="space-y-3">
          <h2 id="ts-review" className="flex items-center gap-2 text-lg font-semibold">
            <Eye className="size-5 shrink-0" aria-hidden />
            Awaiting review
            <span className="text-sm font-normal opacity-70">
              ({review.data?.shown ?? 0} of {review.data?.pending ?? 0})
            </span>
          </h2>
          <p className="text-sm opacity-70">
            Everything here is restricted until it is rated, so a long queue costs reach
            rather than safety. Items carrying media cannot be rated by the classifier at
            all — there is no vision model — so they wait for a person.
          </p>

          {review.loading ? <p className="text-sm opacity-70">Loading…</p> : null}
          {!review.loading && reviewItems.length === 0 ? (
            <p className="rounded-xl border border-text-low/25 p-4 text-sm opacity-70">
              Nothing waiting.
            </p>
          ) : null}

          <ul className="space-y-3">
            {reviewItems.map((item) => (
              <li key={item.content_id} className="space-y-3 rounded-xl border border-text-low/25 p-4">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-text-low/30 px-2 py-0.5">
                    {item.content_kind}
                  </span>
                  <span className="rounded-full border border-text-low/30 px-2 py-0.5">
                    now {item.age_rating}
                  </span>
                  {item.media_count > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-text-low/30 px-2 py-0.5">
                      <AlertTriangle className="size-3 shrink-0" aria-hidden />
                      {item.media_count} media — unreadable by the classifier
                    </span>
                  ) : null}
                  {item.reports > 0 ? (
                    <span className="rounded-full border border-text-low/30 px-2 py-0.5">
                      {item.reports} report{item.reports === 1 ? '' : 's'}
                    </span>
                  ) : null}
                  <span className="opacity-60">
                    {item.classifier_source || 'unrated'} · confidence{' '}
                    {Math.round((item.confidence ?? 0) * 100)}%
                  </span>
                </div>

                <p className="whitespace-pre-wrap rounded-lg border border-text-low/25 bg-text-low/10 p-3 text-sm text-text-hi">
                  {item.body || <span className="opacity-60">No text — media only.</span>}
                </p>

                <div className="flex flex-wrap gap-2">
                  {RATINGS.map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      disabled={busy === item.content_id}
                      onClick={() =>
                        run(item.content_id, () =>
                          kaluta.trustSafety.rate(item.content_id, { age_rating: rating }),
                        )
                      }
                      className="rounded-lg border border-text-low/30 px-3 py-1.5 text-xs hover:bg-text-hi/10 disabled:opacity-50"
                    >
                      {rating.replace(/_/g, ' ').toLowerCase()}
                    </button>
                  ))}
                </div>
                <p className="text-xs opacity-60">
                  Your rating outranks the classifier and will not be re-rated automatically.
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </AppShell>
  )
}
