import { useState } from 'react'
import { Link } from 'react-router'
import { FileText, ShieldCheck } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta, type DeathReviewItem } from '@/lib/api'
import { formatDate } from './format'
import { TICKET_REFRESH_MS, useEvery } from './useEvery'

const ghost =
  'inline-flex items-center gap-1.5 rounded-full border border-text-low/40 px-3.5 py-1.5 text-xs font-semibold text-text-mid hover:border-gold/40 hover:text-text-hi disabled:opacity-40'
const primary =
  'inline-flex items-center justify-center gap-1.5 rounded-full bg-gold-soft px-4 py-1.5 text-xs font-bold text-ink disabled:opacity-40'

/**
 * Kinjy staff only: deaths reported with evidence, waiting for a decision.
 * Taking one under review shows the family that someone is looking, and
 * stops a second reviewer from repeating the work.
 */
export default function DeathReviewQueue() {
  const queue = useApi<{ items: DeathReviewItem[] }>(() => kaluta.memorials.reviewQueue(), [])
  // The links to the evidence are five-minute tickets; a queue is left open.
  useEvery(queue.reload, TICKET_REFRESH_MS)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const act = async (id: string, action: () => Promise<unknown>) => {
    setBusy(id)
    setError(null)
    try {
      await action()
      queue.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the decision')
    } finally {
      setBusy(null)
    }
  }

  const items = queue.data?.items ?? []
  return (
    <section className="cloud-card p-5" aria-label="Death verifications">
      <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-text-hi">
        <ShieldCheck size={15} className="text-gold" aria-hidden="true" />
        Death verifications{items.length ? ` (${items.length})` : ''}
      </h2>
      <p className="mt-1 text-xs text-text-mid">Kinjy staff only. Read the evidence before deciding.</p>
      {queue.data && items.length === 0 && <p className="mt-3 text-sm text-text-mid">Nothing is waiting.</p>}
      <ul className="mt-3 space-y-3">
        {items.map((m) => (
          <li key={m.id} className="rounded-card-sm border border-text-low/25 p-3">
            <p className="text-sm font-semibold text-text-hi">
              <Link to={`/memorial/${m.qr_code}`} className="underline-offset-2 hover:underline">
                {m.full_name}
              </Link>
              <span className="font-normal text-text-mid">
                {' '}· died {formatDate(m.death_date) ?? 'date not given'} · {m.death_status === 'under_review' ? 'under review' : 'reported'}
              </span>
            </p>
            {m.reports.map((r) => (
              <div key={r.id} className="mt-2 rounded-card-sm bg-text-low/5 p-2 text-sm">
                <p className="text-text-hi">{r.evidence}</p>
                <p className="mt-1 text-xs text-text-mid">
                  From {r.reported_by}, {formatDate(r.created_at)}
                  {r.document_url && (
                    <>
                      {' '}·{' '}
                      <a href={r.document_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-text-hi underline underline-offset-2">
                        <FileText size={11} aria-hidden="true" /> document
                      </a>
                    </>
                  )}
                </p>
              </div>
            ))}
            <div className="mt-2 flex flex-wrap gap-2">
              {m.death_status === 'reported' && (
                <button type="button" disabled={busy === m.id} onClick={() => void act(m.id, () => kaluta.memorials.startReview(m.id))} className={ghost}>
                  Take under review
                </button>
              )}
              <button type="button" disabled={busy === m.id} onClick={() => void act(m.id, () => kaluta.memorials.decideDeath(m.id, 'verified'))} className={primary}>
                Verify
              </button>
              <button type="button" disabled={busy === m.id} onClick={() => void act(m.id, () => kaluta.memorials.decideDeath(m.id, 'rejected'))} className={ghost}>
                Not enough evidence
              </button>
            </div>
          </li>
        ))}
      </ul>
      {(error ?? queue.error) && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error ?? queue.error}
        </p>
      )}
    </section>
  )
}
