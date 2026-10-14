import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Check, Copy, Loader2, Mail, Send } from 'lucide-react'
import ProvenanceBadge from '@/components/graveyard/ProvenanceBadge'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { ApiError, kaluta, type CreatorFormats, type NewsletterIssue, type PublishJob, type PublishOutput } from '@/lib/api'
import ErrorLine from './ErrorLine'
import { articleHtml, labelOf, languageName, soonest, when } from './format'
import MediaPreview from './MediaPreview'

const ghost =
  'inline-flex items-center gap-1.5 rounded-full border border-text-low/40 px-3.5 py-1.5 text-xs font-semibold text-text-mid hover:border-gold/40 hover:text-text-hi disabled:opacity-40'
const primary =
  'inline-flex items-center justify-center gap-1.5 rounded-full bg-gold-soft px-4 py-1.5 text-xs font-bold text-ink disabled:opacity-40'

/** The kind of post each format becomes. A short video is posted as a Short: choosing that surface is the author's call, and choosing the format is that call. */
const POST_FORMAT: Record<string, string> = {
  article: 'article',
  carousel: 'carousel',
  audio: 'audio',
  short_video: 'short',
  long_video: 'video',
}

const SPOKEN = ['audio', 'short_video', 'long_video']

/** What goes in the box before posting: the whole text for words, a headline for files that carry their own content. */
const startingDraft = (output: PublishOutput): string =>
  output.media.length > 0 ? (output.text ?? '').split('\n')[0] : (output.text ?? '')

/**
 * Sending a Studio newsletter to the people who asked for it.
 *
 * Only people who confirmed their address by e-mail are ever written to; the creator sees how many there are,
 * never who. Sending asks for a second click that says what is about to happen - it cannot be taken back - and
 * then follows the send until it is over, because "sent" is a claim and "4 of 12" is a fact.
 */
function NewsletterSend({ outputId }: { outputId: number }) {
  const { user } = useAuth()
  const state = useApi(() => kaluta.creators.newsletter.subscribers(), [])
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [issue, setIssue] = useState<NewsletterIssue | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const going = issue !== null && (issue.status === 'queued' || issue.status === 'sending')
  useEffect(() => {
    if (!issue || !going) return
    const timer = window.setTimeout(async () => {
      try {
        setIssue(await kaluta.creators.newsletter.issue(issue.id))
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not follow the send')
      }
    }, 1500)
    return () => window.clearTimeout(timer)
  }, [issue, going])

  if (state.loading && !state.data) return null
  const info = state.data
  if (!info) return state.error ? <ErrorLine text={state.error} className="mt-2" /> : null
  if (!info.sending_allowed) {
    return <p className="mt-2 text-xs text-text-mid">Newsletter sending requires a confirmed adult account. You can still copy your newsletter text.</p>
  }

  const page = user?.handle ? `${window.location.origin}/newsletter/${user.handle}` : null
  const copyPage = async () => {
    if (!page) return
    try {
      await navigator.clipboard.writeText(page)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Your browser would not let the page copy. Select the link and copy it.')
    }
  }
  const send = async () => {
    setBusy(true)
    setError(null)
    try {
      setIssue(await kaluta.creators.newsletter.send({ output_id: outputId }))
      setConfirming(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send it')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 space-y-2 rounded-card-sm border border-text-low/25 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-text-hi">
        <Mail size={12} aria-hidden="true" /> Your newsletter list
      </p>
      <p className="text-xs text-text-mid">
        {info.confirmed} confirmed {info.confirmed === 1 ? 'subscriber' : 'subscribers'}
        {info.waiting_for_confirmation > 0 ? ` · ${info.waiting_for_confirmation} not confirmed yet` : ''}
      </p>
      <button type="button" onClick={state.reload} disabled={state.loading || going} className={ghost}>Refresh subscribers</button>

      {page && (
        <p className="text-xs text-text-mid">
          Where readers sign up:{' '}
          <button type="button" onClick={() => void copyPage()} className="font-semibold text-text-hi underline">
            {copied ? 'Copied' : 'copy the link'}
          </button>{' '}
          <span className="break-all">({page})</span>
        </p>
      )}

      {!info.plan_allowed ? (
        <p className="text-xs text-text-mid">Sending newsletters needs a paid Basic or Premium plan. <Link to="/subscription" className="font-semibold text-text-hi underline">Manage subscription</Link></p>
      ) : !info.can_send ? (
        <p className="text-xs text-text-mid">This server cannot send e-mail yet. Readers cannot subscribe until e-mail is configured. You can copy the newsletter text.</p>
      ) : issue ? (
        <p className="flex items-center gap-2 text-sm text-text-hi" role="status">
          {going && <Loader2 size={14} className="animate-spin" aria-hidden="true" />}
          {going
            ? `Sending… ${issue.sent + issue.failed + issue.skipped} of ${issue.recipients}`
            : issue.status === 'sent'
              ? `Sent to ${issue.sent} ${issue.sent === 1 ? 'person' : 'people'}.`
              : issue.status === 'partial'
                ? `Sent to ${issue.sent}; ${issue.failed} could not be reached.`
                : (issue.error ?? 'It could not be sent.')}
          {!going && issue.skipped > 0 ? ` ${issue.skipped} left out (they unsubscribed meanwhile, or the send was interrupted).` : ''}
        </p>
      ) : info.confirmed === 0 ? (
        <p className="text-xs text-text-mid">Nobody has confirmed yet. Share the sign-up link above.</p>
      ) : confirming ? (
        <div className="space-y-2">
          <p className="text-xs text-text-hi">
            This goes out now to {info.confirmed} {info.confirmed === 1 ? 'person' : 'people'} and cannot be taken back. Every mail has
            a link to leave in one click.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => void send()} disabled={busy} className={primary}>
              <Send size={12} aria-hidden="true" /> {busy ? 'Sending…' : 'Send it now'}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={ghost}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={ghost}>
          <Send size={12} aria-hidden="true" /> Send to {info.confirmed} {info.confirmed === 1 ? 'subscriber' : 'subscribers'}…
        </button>
      )}
      {error && <ErrorLine text={error} />}
    </div>
  )
}

/**
 * One thing the engine made. A creator can read it, copy it, or post it — as
 * they edited it, with the label it was made under.
 *
 * A newsletter is not offered as a post: it is written for an inbox, with a
 * subject and a footer. It is sent from here to the people who asked for it
 * (NewsletterSend), or copied into whatever the creator prefers.
 *
 * A carousel, narration or video is a file a render is still making when the
 * card first appears: it says so, and the page reads the job again until it is
 * done. What is posted is the file, with a caption the creator writes.
 */
function OutputCard({
  output,
  formats,
  onExpired,
  onPublished,
  canSchedule,
}: {
  output: PublishOutput
  formats: CreatorFormats | null
  onExpired: () => void
  onPublished: () => void
  canSchedule: boolean
}) {
  const [copied, setCopied] = useState(false)
  const [posting, setPosting] = useState(false)
  const [draft, setDraft] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [later, setLater] = useState(false)
  const [at, setAt] = useState('')
  const [busy, setBusy] = useState(false)
  const [posted, setPosted] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const text = output.text ?? ''
  const label = labelOf(formats, output.target)
  const isFile = output.media.length > 0
  const waiting = output.status === 'queued' || output.status === 'running'
  const canPost = output.status === 'ready' && output.target !== 'newsletter' && !output.simulated

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Your browser would not let the page copy. Select the text and copy it.')
    }
  }

  const post = async () => {
    setBusy(true)
    setError(null)
    try {
      await kaluta.posts.create({
        body: output.target === 'article' ? articleHtml(draft) : draft.trim(),
        format: POST_FORMAT[output.target] ?? 'text',
        visibility,
        lang: output.lang,
        provenance: output.provenance,
        ...(later && at ? { scheduled_for: new Date(at).toISOString() } : {}),
        ...(isFile
          ? {
              media: output.media.map((m) => ({
                media_id: m.id,
                url: m.url,
                kind: m.kind,
                alt_text: m.alt || null,
                width: m.width,
                height: m.height,
                duration_seconds: m.seconds,
              })),
            }
          : {}),
      })
      setPosted(later && at ? `Scheduled for ${new Date(at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}.` : 'Posted.')
      setPosting(false)
      onPublished()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not post it')
    } finally {
      setBusy(false)
    }
  }

  return (
    <li className="rounded-card-md border border-text-low/25 bg-text-low/5 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-text-hi">
          {label} · {languageName(formats, output.lang)}
        </h3>
        {output.status === 'ready' && <ProvenanceBadge value={output.provenance} />}
        {output.simulated && (
          <span className="rounded-full border border-warning/60 bg-warning/10 px-2 py-0.5 text-[0.65rem] font-semibold text-text-hi">Simulated</span>
        )}
      </div>

      {waiting ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-text-mid" role="status">
          <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          {output.status === 'running' ? 'Making it…' : 'Waiting its turn…'}
          {output.target.endsWith('video') ? ' A video can take a minute or two.' : ''}
        </p>
      ) : output.status !== 'ready' ? (
        <p className="mt-2 text-sm text-text-mid">
          {output.status === 'unsupported' ? 'Not available' : 'Could not be made'}
          {output.error ? ` — ${output.error}` : ''}
        </p>
      ) : (
        <>
          <MediaPreview target={output.target} media={output.media} label={`${label}, ${languageName(formats, output.lang)}`} onExpired={onExpired} />

          {SPOKEN.includes(output.target) && (
            <p className="mt-2 text-xs text-text-mid">Read by a synthetic voice — clear, but plainly a machine.</p>
          )}

          {output.target !== 'carousel' && (
            <div
              className={`mt-3 overflow-auto whitespace-pre-wrap break-words rounded-card-sm bg-text-low/5 p-3 text-sm text-text-mid ${isFile ? 'max-h-40' : 'max-h-64'}`}
              tabIndex={0}
              aria-label={`${label} text`}
            >
              {text}
            </div>
          )}

          {output.simulated && (
            <p className="mt-2 text-xs text-text-mid">
              Made by the stand-in AI: the language is marked on the text, not translated into it. It cannot be posted.
            </p>
          )}
          {output.target === 'newsletter' && !output.simulated && <NewsletterSend outputId={output.id} />}

          {posting ? (
            <div className="mt-3 space-y-2">
              <label className="block text-xs text-text-mid">
                {isFile ? 'The words that go with it — change them if you like' : 'What will be posted — change it if you like'}
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={isFile ? 3 : 6}
                  maxLength={20000}
                  className="mt-1 w-full resize-y rounded-card-sm border border-text-low/40 bg-text-low/5 px-3 py-2 text-sm text-text-hi focus:border-gold/40 focus:outline-none"
                />
              </label>
              {output.target === 'short_video' && <p className="text-xs text-text-mid">It will appear in Shorts.</p>}
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-text-mid">
                  Who sees it
                  <select
                    value={visibility}
                    onChange={(e) => setVisibility(e.target.value)}
                    className="rounded-card-sm border border-text-low/40 bg-text-low/5 px-2 py-1 text-xs text-text-hi"
                  >
                    <option value="public">Everyone</option>
                    <option value="followers">My followers</option>
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs text-text-mid">
                  <input type="checkbox" checked={later && canSchedule} disabled={!canSchedule} onChange={(e) => setLater(e.target.checked)} />
                  Publish later
                </label>
                {!canSchedule && <Link to="/subscription" className="text-xs text-text-mid underline">Scheduling needs Basic or Premium</Link>}
                {later && (
                  <input
                    type="datetime-local"
                    value={at}
                    min={soonest()}
                    onChange={(e) => setAt(e.target.value)}
                    aria-label="When to publish"
                    className="rounded-card-sm border border-text-low/40 bg-text-low/5 px-2 py-1 text-xs text-text-hi"
                  />
                )}
                <button
                  type="button"
                  onClick={() => void post()}
                  disabled={busy || (!isFile && !draft.trim()) || (later && !at)}
                  className={primary}
                >
                  <Send size={12} aria-hidden="true" /> {busy ? 'Posting…' : later ? 'Schedule it' : 'Post it'}
                </button>
                <button type="button" onClick={() => setPosting(false)} className={ghost}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {text && (
                <button type="button" onClick={() => void copy()} className={ghost}>
                  {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
                  {copied ? 'Copied' : 'Copy text'}
                </button>
              )}
              {canPost && !posted && (
                <button
                  type="button"
                  onClick={() => {
                    setDraft(startingDraft(output))
                    setPosting(true)
                  }}
                  className={ghost}
                >
                  <Send size={12} aria-hidden="true" /> Post it…
                </button>
              )}
              {posted && <span className="text-xs text-success">{posted}</span>}
            </div>
          )}
        </>
      )}
      {error && <ErrorLine text={error} className="mt-2" />}
    </li>
  )
}

/** What a job made, in the order it was asked for, with the text it was made from. */
export default function StudioResults({
  job,
  formats,
  onExpired,
  onPublished,
  canSchedule,
}: {
  job: PublishJob
  formats: CreatorFormats | null
  onExpired: () => void
  onPublished: () => void
  canSchedule: boolean
}) {
  const made = job.outputs.filter((o) => o.status === 'ready').length
  const making = job.outputs.filter((o) => o.status === 'queued' || o.status === 'running').length
  return (
    <section className="space-y-3" aria-label="Results">
      <header>
        <h2 className="text-sm font-semibold text-text-hi">
          {made} {made === 1 ? 'piece' : 'pieces'} made
          {making > 0 && <span className="font-normal text-text-mid"> · {making} on the way</span>}{' '}
          <span className="font-normal text-text-mid">· {when(job.created_at)}</span>
        </h2>
        {job.source_text && (
          <p className="mt-0.5 line-clamp-2 text-xs text-text-mid">From: {job.source_text}</p>
        )}
      </header>
      <ul className="space-y-3">
        {job.outputs.map((o) => (
          <OutputCard key={o.id} output={o} formats={formats} onExpired={onExpired} onPublished={onPublished} canSchedule={canSchedule} />
        ))}
      </ul>
    </section>
  )
}
