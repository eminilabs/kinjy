import { useState } from 'react'
import { CheckCircle2, Clock, MinusCircle, ShieldQuestion, XCircle } from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta, type MyDecision } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * What moderation has done to this account, and how to contest it.
 *
 * The staff console shipped before this page did, which is the wrong way round
 * and worth saying plainly: for a while the platform could restrict somebody
 * and review the restriction, while the person restricted had no way to see
 * that any of it had happened. Someone whose reach quietly drops and is told
 * nothing concludes they have been shadowbanned — and, more importantly, the
 * ones who really have been restricted cannot tell the difference.
 *
 * So the page says what happened, in the member's own words rather than the
 * database's: `restricted_by_rating` is not an explanation, it is a column
 * value. What it never does is explain *which* rule or phrase triggered a
 * refusal, because that is a guide to rewording it.
 */

const ACTIONS: Record<
  MyDecision['action'],
  { title: string; body: string; severe?: boolean }
> = {
  refused_publication: {
    title: 'This was not published',
    body: 'Nobody saw it. It never went out.',
    severe: true,
  },
  restricted_by_rating: {
    title: 'This was rated for adults',
    body: 'It is published and adults can see it. Members under 18 cannot.',
  },
  restricted_by_reports: {
    title: 'This was paused after reports',
    body:
      'Other members reported it, so it is waiting for someone to look. Adults can still see it in the meantime.',
  },
  human_review: {
    title: 'A reviewer rated this',
    body: 'A person looked at it and decided how it should be rated.',
  },
}

const STATUS: Record<
  NonNullable<MyDecision['appeal']>['status'],
  { label: string; icon: typeof Clock; tone: string }
> = {
  open: { label: 'Waiting for a reviewer', icon: Clock, tone: 'text-warning' },
  upheld: { label: 'Reviewed — the decision stands', icon: MinusCircle, tone: 'text-text-mid' },
  overturned: { label: 'Overturned — the restriction is gone', icon: CheckCircle2, tone: 'text-success' },
}

export default function Moderation() {
  const decisions = useApi<{ items: MyDecision[] }>(() => kaluta.moderation.myDecisions(), [])
  const [grounds, setGrounds] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const appeal = async (decision: MyDecision) => {
    setBusy(decision.id)
    setError(null)
    try {
      await kaluta.moderation.appeal(decision.id, grounds[decision.id] ?? '')
      setGrounds((g) => ({ ...g, [decision.id]: '' }))
      decisions.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work. Try again.')
    } finally {
      setBusy(null)
    }
  }

  const items = decisions.data?.items ?? []

  return (
    <AppShell
      title="Moderation"
      subtitle="Anything that has been restricted on this account, and how to ask for another look."
    >
      <div className="space-y-6">
        {error ? (
          <p role="alert" className="rounded-lg border border-danger/50 bg-danger/10 p-3 text-sm">
            {error}
          </p>
        ) : null}

        {decisions.loading ? <p className="text-sm text-text-mid">Loading…</p> : null}

        {/* "Nothing has been restricted" and "we could not check" must not look
            alike. Showing the reassuring one when the call failed is the same
            mistake as a dashboard inventing a queue depth: the member reads it
            as an answer when it is an absence of one. */}
        {!decisions.loading && decisions.error ? (
          <div className="rounded-xl border border-warning/50 bg-warning/10 p-4">
            <p className="text-sm text-text-hi">
              We could not check this right now — this is not the same as nothing being
              restricted.
            </p>
            <button
              type="button"
              onClick={() => decisions.reload()}
              className="mt-2 rounded-lg bg-text-hi/10 px-3 py-1.5 text-sm text-text-hi transition-colors hover:bg-text-hi/20"
            >
              Try again
            </button>
          </div>
        ) : null}

        {!decisions.loading && !decisions.error && items.length === 0 ? (
          <div className="rounded-xl border border-text-low/25 p-6 text-center">
            <ShieldQuestion className="mx-auto size-6 text-text-low" aria-hidden />
            <p className="mt-2 text-sm text-text-hi">Nothing has been restricted on this account.</p>
            <p className="mt-1 text-xs text-text-mid">
              If something you posted is not reaching people, it is not because of moderation.
            </p>
          </div>
        ) : null}

        <ul className="space-y-4">
          {items.map((d) => {
            const meta = ACTIONS[d.action] ?? {
              title: 'This was restricted',
              body: 'Something about this was limited.',
            }
            const status = d.appeal ? STATUS[d.appeal.status] : null
            const StatusIcon = status?.icon

            return (
              <li
                key={d.id}
                className={cn(
                  'space-y-3 rounded-xl border p-4',
                  meta.severe ? 'border-danger/40' : 'border-text-low/25',
                )}
              >
                <div>
                  <h2 className="text-base font-semibold text-text-hi">{meta.title}</h2>
                  <p className="mt-1 text-sm text-text-mid">{meta.body}</p>
                  <p className="mt-2 text-xs text-text-low">
                    {d.content_kind === 'comment' ? 'A comment' : 'A post'} ·{' '}
                    {new Date(d.created_at).toLocaleDateString()} ·{' '}
                    {d.decided_by === 'automatic'
                      ? 'decided automatically'
                      : 'decided by a reviewer'}
                  </p>
                </div>

                {status && StatusIcon ? (
                  <div className="rounded-lg border border-text-low/25 bg-text-low/10 p-3">
                    <p className={cn('flex items-center gap-2 text-sm font-medium', status.tone)}>
                      <StatusIcon className="size-4 shrink-0" aria-hidden />
                      {status.label}
                    </p>
                    {d.appeal?.reviewer_note ? (
                      <p className="mt-1.5 text-sm text-text-mid">“{d.appeal.reviewer_note}”</p>
                    ) : null}
                    {d.appeal?.status === 'open' ? (
                      <p className="mt-1.5 text-xs text-text-low">
                        You will be told when this has been looked at.
                      </p>
                    ) : null}
                  </div>
                ) : d.appealable ? (
                  <div className="space-y-2">
                    <label
                      htmlFor={`grounds-${d.id}`}
                      className="block text-xs uppercase tracking-wide text-text-mid"
                    >
                      Ask for another look
                    </label>
                    <textarea
                      id={`grounds-${d.id}`}
                      rows={2}
                      maxLength={2000}
                      value={grounds[d.id] ?? ''}
                      onChange={(e) => setGrounds((g) => ({ ...g, [d.id]: e.target.value }))}
                      placeholder="Why do you think this was wrong?"
                      className="w-full rounded-lg border border-text-low/30 bg-transparent px-3 py-2 text-sm text-text-hi"
                    />
                    <button
                      type="button"
                      disabled={busy === d.id}
                      onClick={() => appeal(d)}
                      className="rounded-lg bg-text-hi/10 px-3 py-1.5 text-sm text-text-hi transition-colors hover:bg-text-hi/20 disabled:opacity-50"
                    >
                      Send for review
                    </button>
                    <p className="text-xs text-text-low">
                      A different person than the one who decided will read it. You can do this
                      once.
                    </p>
                  </div>
                ) : (
                  <p className="flex items-start gap-2 text-xs text-text-mid">
                    <XCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    {/* No detail about why: this branch is reached by child-safety
                        escalations, and explaining the boundary explains how to sit
                        just outside it next time. */}
                    This one cannot be reviewed here. Contact support if you think it is wrong.
                  </p>
                )}
              </li>
            )
          })}
        </ul>

        {items.length > 0 ? (
          <p className="text-xs text-text-low">
            Ratings decide who can see something, not whether it exists. Restricted is not
            deleted.
          </p>
        ) : null}
      </div>
    </AppShell>
  )
}
