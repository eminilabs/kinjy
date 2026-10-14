import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta, type CreatorFormats } from '@/lib/api'
import { cn } from '@/lib/utils'
import ErrorLine from './ErrorLine'
import { labelOf, when } from './format'

const ghost =
  'inline-flex items-center gap-1.5 rounded-full border border-text-low/40 px-3 py-1 text-xs font-semibold text-text-mid hover:border-gold/40 hover:text-text-hi disabled:opacity-40'

/**
 * Everything the creator has made, newest first. The engine used to produce
 * results and show none of them; this is where they are kept.
 */
export default function StudioHistory({
  formats,
  selected,
  refresh,
  onOpen,
  onDeleted,
}: {
  formats: CreatorFormats | null
  selected: string | null
  refresh: number
  onOpen: (jobId: string) => void
  onDeleted: (jobId: string) => void
}) {
  const [shown, setShown] = useState(10)
  const jobs = useApi(() => kaluta.creators.jobs({ limit: shown }), [shown, refresh])
  const [confirm, setConfirm] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const items = jobs.data?.items ?? []
  const total = jobs.data?.total ?? 0

  const remove = async (jobId: string) => {
    setError(null)
    try {
      await kaluta.creators.deleteJob(jobId)
      setConfirm(null)
      onDeleted(jobId)
      jobs.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete it')
    }
  }

  return (
    <section className="cloud-card p-5" aria-label="History">
      <h2 className="text-sm font-semibold text-text-hi">
        What you have made{total ? ` (${total})` : ''}
      </h2>
      {jobs.loading && !jobs.data && <p className="mt-2 text-sm text-text-mid">Loading…</p>}
      {jobs.data && items.length === 0 && (
        <p className="mt-2 text-sm text-text-mid">Nothing yet. What you create appears here, so you can come back to it.</p>
      )}
      <ul className="mt-3 space-y-2">
        {items.map((j) => (
          <li
            key={j.job_id}
            className={cn('rounded-card-sm border p-3', selected === j.job_id ? 'border-gold/50 bg-gold/10' : 'border-text-low/25')}
          >
            <p className="line-clamp-2 text-sm text-text-hi">{j.source_snippet || 'Untitled'}</p>
            <p className="mt-0.5 text-xs text-text-mid">
              {when(j.created_at)} · {[...new Set(j.targets)].map((t) => labelOf(formats, t)).join(', ')} ·{' '}
              {j.ready} made{j.pending ? `, ${j.pending} on the way` : ''}{j.unsupported ? `, ${j.unsupported} not available` : ''}{j.failed ? `, ${j.failed} failed` : ''}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {confirm === j.job_id ? (
                <>
                  <span className="text-xs text-text-mid">Delete it and what it made?</span>
                  <button type="button" onClick={() => void remove(j.job_id)} className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white hover:bg-red-700">
                    Yes, delete
                  </button>
                  <button type="button" onClick={() => setConfirm(null)} className={ghost}>
                    Keep it
                  </button>
                </>
              ) : (
                <>
                  <button type="button" onClick={() => onOpen(j.job_id)} aria-current={selected === j.job_id ? 'true' : undefined} className={ghost}>
                    Open
                  </button>
                  <button type="button" onClick={() => setConfirm(j.job_id)} aria-label={`Delete: ${j.source_snippet.slice(0, 40) || 'untitled'}`} className={ghost}>
                    <Trash2 size={12} aria-hidden="true" /> Delete
                  </button>
                </>
              )}
            </div>
          </li>
        ))}
      </ul>
      {items.length < total && (
        <button type="button" onClick={() => setShown((n) => n + 10)} disabled={jobs.loading} className={cn(ghost, 'mt-3')}>
          Show more ({total - items.length} more)
        </button>
      )}
      {(error ?? jobs.error) && <ErrorLine text={(error ?? jobs.error) as string} className="mt-2" />}
    </section>
  )
}
