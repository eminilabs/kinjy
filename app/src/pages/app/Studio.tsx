import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import AppShell from '@/components/app/AppShell'
import CreatorPanel from '@/components/studio/CreatorPanel'
import ErrorLine from '@/components/studio/ErrorLine'
import StudioCompose, { type CreateInput } from '@/components/studio/StudioCompose'
import StudioHistory from '@/components/studio/StudioHistory'
import StudioResults from '@/components/studio/StudioResults'
import ScheduledPosts from '@/components/studio/ScheduledPosts'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta, type PublishJob } from '@/lib/api'

/**
 * The Creator Studio (blueprint module G): one piece of writing in, every format
 * it can really become out.
 *
 * Text comes back at once; a carousel, a narration or a video is a file a render
 * is still making, so the page reads the job again every few seconds until
 * nothing is waiting. What it will not do is pretend: a format the server cannot
 * make is listed with the engine's own reason, and the translations of the
 * stand-in AI are labelled Simulated and cannot be posted. The job being looked
 * at lives in the address (`?job=`), so a result can be linked to and survives a
 * reload.
 */
export default function Studio() {
  const [params, setParams] = useSearchParams()
  const jobId = params.get('job')
  const formats = useApi(() => kaluta.creators.formats(), [])
  const membership = useApi(() => kaluta.subscriptions.me(), [])
  const job = useApi<PublishJob | null>(() => (jobId ? kaluta.creators.job(jobId) : Promise.resolve(null)), [jobId])
  const currentJob = job.data?.job_id === jobId ? job.data : null
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const open = (id: string | null) => setParams(id ? { job: id } : {})

  // A render finishes in the background; ask again until none is left.
  const waiting = currentJob?.outputs.some((o) => o.status === 'queued' || o.status === 'running') ?? false
  useEffect(() => {
    if (!waiting) return
    const timer = window.setTimeout(job.reload, 2500)
    return () => window.clearTimeout(timer)
  }, [waiting, job.data, job.reload])

  // The history lists what is ready; refresh it once the last render lands.
  const wasWaiting = useRef(false)
  useEffect(() => {
    if (wasWaiting.current && !waiting) setVersion((n) => n + 1)
    wasWaiting.current = waiting
  }, [waiting])

  // A picture, player or voice whose ticket ran out fails to load; the job comes
  // back with new tickets. Rate-limited: a file that is really gone must not
  // turn this into a loop.
  const lastRefresh = useRef(0)
  const refreshTickets = () => {
    if (Date.now() - lastRefresh.current < 20_000) return
    lastRefresh.current = Date.now()
    job.reload()
  }

  const create = async (input: CreateInput) => {
    setBusy(true)
    setError(null)
    try {
      const made = await kaluta.creators.publish(input)
      setVersion((n) => n + 1)
      open(made.job_id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reach the Studio. Try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AppShell
      title="Creator Studio"
      subtitle="Write once. Get every format the Studio can really make — and see exactly what it made."
      aside={<CreatorPanel />}
    >
      <div className="space-y-5">
        {formats.data ? (
          <StudioCompose formats={formats.data} busy={busy} error={error ?? formats.error} refresh={version} onCreate={(i) => void create(i)} />
        ) : formats.error ? <ErrorLine text={formats.error} /> : <p role="status" className="text-sm text-text-mid">Loading Studio…</p>}

        {jobId && job.loading && !currentJob && (
          <p className="text-sm text-text-mid" role="status">
            Opening it…
          </p>
        )}
        {jobId && !job.loading && !currentJob && <ErrorLine text={job.error ?? 'That job could not be found.'} />}
        {currentJob && (
          <StudioResults key={currentJob.job_id} job={currentJob} formats={formats.data} onExpired={refreshTickets} onPublished={() => setVersion((n) => n + 1)} canSchedule={membership.data?.features.scheduled_posts ?? false} />
        )}
        {currentJob && job.error && (
          <div className="space-y-2">
            <ErrorLine text={job.error} />
            <button type="button" onClick={job.reload} className="text-sm text-text-hi underline">Refresh results</button>
          </div>
        )}

        <ScheduledPosts refresh={version} />

        <StudioHistory
          formats={formats.data}
          selected={jobId}
          refresh={version}
          onOpen={(id) => open(id)}
          onDeleted={(id) => {
            if (id === jobId) open(null)
          }}
        />
      </div>
    </AppShell>
  )
}
