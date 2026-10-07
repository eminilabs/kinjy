import { useState } from 'react'
import {
  ArrowBigDown,
  ArrowBigUp,
  CheckCircle2,
  Copy,
  Lock,
  LockOpen,
  Pencil,
  Pin,
  PinOff,
  Trash2,
  Sparkles,
} from 'lucide-react'
import { ApiError, kaluta, type Thread, type ThreadDetail } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const field =
  'w-full rounded-card-sm border border-white/10 bg-ink-2/60 px-3 py-2 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none'

const badge = 'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold'
const modButton =
  'inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-text-mid hover:border-gold/40 hover:text-text-hi disabled:opacity-40'

interface Props {
  thread: ThreadDetail
  /** Other threads of the same forum, offered as the original of a duplicate. */
  siblings: Thread[]
  onBack: () => void
  onOpenThread: (id: string) => void
  /** Re-fetch the thread (and the list behind it) after a change. */
  onReload: () => Promise<void>
  onChange: (thread: ThreadDetail) => void
  onError: (message: string) => void
  /** The thread was deleted: leave it and refresh the list behind it. */
  onDeleted: () => Promise<void> | void
}

const linkButton = 'inline-flex items-center gap-1 text-xs font-semibold hover:underline disabled:opacity-40'

export default function ThreadView({
  thread,
  siblings,
  onBack,
  onOpenThread,
  onReload,
  onChange,
  onError,
  onDeleted,
}: Props) {
  const { user } = useAuth()
  const [reply, setReply] = useState('')
  const [busy, setBusy] = useState(false)
  const [originalId, setOriginalId] = useState('')
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof kaluta.forums.summary>> | null>(null)
  const [summarising, setSummarising] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const others = siblings.filter((t) => t.id !== thread.id)
  const canAccept = thread.can_moderate || (!!user && user.id === thread.author_id)

  // One wrapper for every write: shows the API's own message, then re-syncs.
  const act = async (fn: () => Promise<unknown>, fallback: string) => {
    setBusy(true)
    try {
      await fn()
      await onReload()
    } catch (err) {
      onError(err instanceof ApiError ? err.message : fallback)
    } finally {
      setBusy(false)
    }
  }

  const summarise = async () => {
    setSummarising(true)
    setSummary(null)
    setSummaryError(null)
    try {
      setSummary(await kaluta.forums.summary(thread.id))
    } catch (err) {
      setSummaryError(err instanceof ApiError ? err.message : 'The summariser is unavailable right now')
    } finally {
      setSummarising(false)
    }
  }

  const vote = async (replyId: string, current: number, value: 1 | -1) => {
    // Voting the same way again takes the vote back.
    const next = current === value ? 0 : value
    try {
      const result = await kaluta.forums.vote(thread.id, replyId, next)
      onChange({
        ...thread,
        replies: thread.replies.map((r) =>
          r.id === replyId ? { ...r, score: result.score, my_vote: result.my_vote } : r,
        ),
      })
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not record the vote')
    }
  }

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!reply.trim()) return
    await act(async () => {
      await kaluta.forums.reply(thread.id, reply.trim())
      setReply('')
    }, 'Could not reply')
  }

  const isAuthor = !!user && user.id === thread.author_id
  // A locked thread is closed to edits too, except for its moderators.
  const canEditThread = isAuthor && (!thread.locked || thread.can_moderate)
  const [editingThread, setEditingThread] = useState(false)
  const [threadDraft, setThreadDraft] = useState({ title: '', body: '' })
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null)
  const [replyDraft, setReplyDraft] = useState('')

  const saveThread = async (event: React.FormEvent) => {
    event.preventDefault()
    await act(async () => {
      await kaluta.forums.editThread(thread.id, { title: threadDraft.title.trim(), body: threadDraft.body })
      setEditingThread(false)
    }, 'Could not save the thread')
  }

  const deleteThread = async () => {
    if (!window.confirm('Delete this thread? It disappears for everyone and cannot be restored.')) return
    setBusy(true)
    try {
      await kaluta.forums.deleteThread(thread.id)
      await onDeleted()
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Could not delete the thread')
    } finally {
      setBusy(false)
    }
  }

  const saveReply = async (event: React.FormEvent, replyId: string) => {
    event.preventDefault()
    await act(async () => {
      await kaluta.forums.editReply(thread.id, replyId, replyDraft)
      setEditingReplyId(null)
    }, 'Could not save the reply')
  }

  const deleteReply = async (replyId: string) => {
    if (!window.confirm('Delete this reply? It disappears for everyone and cannot be restored.')) return
    await act(() => kaluta.forums.deleteReply(thread.id, replyId), 'Could not delete the reply')
  }

  const markDuplicate = async () => {
    if (!originalId) return
    await act(() => kaluta.forums.markDuplicate(thread.id, originalId), 'Could not mark the duplicate')
    setOriginalId('')
  }

  return (
    <article className="cloud-card p-5">
      <button type="button" onClick={onBack} className="caption mb-3 text-gold-soft hover:underline">
        ← Back to threads
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap gap-1.5">
            {thread.pinned && (
              <span className={cn(badge, 'border-gold/40 text-gold-soft')}>
                <Pin size={10} aria-hidden="true" /> Pinned
              </span>
            )}
            {thread.locked && (
              <span className={cn(badge, 'border-white/15 text-text-mid')}>
                <Lock size={10} aria-hidden="true" /> Locked
              </span>
            )}
            {thread.duplicate_of && (
              <span className={cn(badge, 'border-sky/40 text-sky')}>
                <Copy size={10} aria-hidden="true" /> Duplicate
              </span>
            )}
          </div>
          <h2 className="text-lg font-semibold text-text-hi">{thread.title}</h2>
        </div>
        <button
          type="button"
          onClick={() => void summarise()}
          disabled={summarising}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-sky/40 px-3 py-1.5 text-xs font-semibold text-sky hover:bg-sky/10 disabled:opacity-40"
        >
          <Sparkles size={12} aria-hidden="true" />
          {summarising ? 'Reading…' : summary || summaryError ? 'Summarise again' : 'Summarise'}
        </button>
      </div>

      {thread.duplicate_of && (
        <button
          type="button"
          onClick={() => onOpenThread(thread.duplicate_of!.id)}
          className="mt-3 block w-full rounded-card-sm border border-sky/30 bg-sky/8 p-3 text-start text-sm text-text-hi hover:border-sky/50"
        >
          <span className="caption">Duplicate of: </span>
          {thread.duplicate_of.title}
        </button>
      )}

      {/* The original post: its content sits right under the title, set apart
          from the replies below, with its own actions in a fixed row. */}
      <section className="mt-4 rounded-card-sm border border-white/10 bg-ink-2/40 p-4" aria-label="Original post">
        {editingThread ? (
          <form onSubmit={saveThread} className="space-y-3">
            <label className="block">
              <span className="caption mb-1 block">Title</span>
              <input
                value={threadDraft.title}
                onChange={(e) => setThreadDraft({ ...threadDraft, title: e.target.value })}
                minLength={3}
                maxLength={300}
                required
                className={field}
              />
            </label>
            <label className="block">
              <span className="caption mb-1 block">Content</span>
              <textarea
                value={threadDraft.body}
                onChange={(e) => setThreadDraft({ ...threadDraft, body: e.target.value })}
                rows={6}
                required
                className={field}
              />
            </label>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy || threadDraft.title.trim().length < 3 || !threadDraft.body.trim()}
                className={modButton}
              >
                Save
              </button>
              <button type="button" onClick={() => setEditingThread(false)} disabled={busy} className={modButton}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <p className="caption mb-2">Content</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-hi/90">{thread.body}</p>
            {(canEditThread || isAuthor || thread.can_moderate) && (
              <div className="mt-3 flex justify-end gap-3 border-t border-white/8 pt-2">
                {canEditThread && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setThreadDraft({ title: thread.title, body: thread.body })
                      setEditingThread(true)
                    }}
                    className={cn(linkButton, 'text-gold-soft')}
                  >
                    <Pencil size={11} aria-hidden="true" /> Edit
                  </button>
                )}
                {(isAuthor || thread.can_moderate) && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void deleteThread()}
                    className={cn(linkButton, 'text-red-300')}
                  >
                    <Trash2 size={11} aria-hidden="true" /> Delete
                  </button>
                )}
              </div>
            )}
          </>
        )}
      </section>

      {thread.can_moderate && (
        <div className="mt-3 rounded-card-sm border border-white/8 bg-ink-2/40 p-3">
          <p className="caption mb-2">Moderation</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void act(
                  () => (thread.pinned ? kaluta.forums.unpin(thread.id) : kaluta.forums.pin(thread.id)),
                  'Could not change the pin',
                )
              }
              className={modButton}
            >
              {thread.pinned ? <PinOff size={12} aria-hidden="true" /> : <Pin size={12} aria-hidden="true" />}
              {thread.pinned ? 'Unpin' : 'Pin'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void act(
                  () => (thread.locked ? kaluta.forums.unlock(thread.id) : kaluta.forums.lock(thread.id)),
                  'Could not change the lock',
                )
              }
              className={modButton}
            >
              {thread.locked ? <LockOpen size={12} aria-hidden="true" /> : <Lock size={12} aria-hidden="true" />}
              {thread.locked ? 'Unlock' : 'Lock'}
            </button>
            {thread.duplicate_of ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void act(() => kaluta.forums.unmarkDuplicate(thread.id), 'Could not unmark')}
                className={modButton}
              >
                <Copy size={12} aria-hidden="true" /> Not a duplicate
              </button>
            ) : (
              <span className="inline-flex items-center gap-2">
                <select
                  value={originalId}
                  onChange={(e) => setOriginalId(e.target.value)}
                  aria-label="Original thread"
                  className="max-w-[200px] rounded-card-sm border border-white/10 bg-ink-2/60 px-2 py-1.5 text-xs text-text-hi"
                >
                  <option value="">Original thread…</option>
                  {others.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={busy || !originalId}
                  onClick={() => void markDuplicate()}
                  className={modButton}
                >
                  <Copy size={12} aria-hidden="true" /> Mark duplicate
                </button>
              </span>
            )}
          </div>
        </div>
      )}

      {summarising && (
        <div className="mt-3 rounded-card-sm border border-sky/25 bg-sky/8 p-3" role="status">
          <p className="caption animate-pulse">Reading the discussion…</p>
        </div>
      )}

      {/* The stored digest shows before any click; a fresh one replaces it. */}
      {!summarising && !summary && !summaryError && thread.ai_summary && (
        <div className="mt-3 rounded-card-sm border border-sky/25 bg-sky/8 p-3">
          <p className="text-sm text-text-hi">{thread.ai_summary}</p>
          <p className="caption mt-1.5">AI summary · written by a machine, may miss detail</p>
        </div>
      )}

      {summaryError && !summarising && (
        <div className="mt-3 rounded-card-sm border border-red-400/30 bg-red-400/5 p-3" role="alert">
          <p className="caption text-red-300">{summaryError}</p>
        </div>
      )}

      {summary && !summarising && (
        <div className="mt-3 rounded-card-sm border border-sky/25 bg-sky/8 p-3">
          {summary.summarised ? (
            <>
              <p className="text-sm text-text-hi">{summary.summary}</p>
              {/* Named, not hidden: a reader can only weigh a machine's
                  summary if they know a machine wrote it, how many
                  posts it stands on, and whether the provider was real. */}
              <p className="caption mt-1.5">
                AI summary of {summary.replies_counted} replies
                {summary.provider && ` · ${summary.provider}`}
                {summary.mock && ' · mock provider, no model key configured'}
              </p>
            </>
          ) : (
            <p className="caption">{summary.reason}</p>
          )}
        </div>
      )}

      <ul className="mt-5 space-y-3 border-t border-white/8 pt-4">
        {thread.replies.length === 0 && <li className="text-sm text-text-low">No replies yet.</li>}
        {thread.replies.map((r) => {
          const own = !!user && user.id === r.author_id
          const accepted = r.accepted_answer || r.id === thread.accepted_reply_id
          return (
            <li
              key={r.id}
              className={cn(
                'flex gap-3 rounded-card-sm p-3',
                accepted ? 'border border-gold/50 bg-gold/5' : 'bg-ink-2/40',
              )}
            >
              <div className="flex shrink-0 flex-col items-center">
                <button
                  type="button"
                  onClick={() => void vote(r.id, r.my_vote, 1)}
                  disabled={own}
                  aria-label="Upvote"
                  aria-pressed={r.my_vote === 1}
                  title={own ? "You can't vote on your own reply" : undefined}
                  className={cn(
                    'rounded text-text-low hover:text-text-hi disabled:opacity-30 disabled:hover:text-text-low',
                    r.my_vote === 1 && 'text-gold',
                  )}
                >
                  <ArrowBigUp size={20} />
                </button>
                <span className="text-sm font-semibold text-text-hi">{r.score}</span>
                <button
                  type="button"
                  onClick={() => void vote(r.id, r.my_vote, -1)}
                  disabled={own}
                  aria-label="Downvote"
                  aria-pressed={r.my_vote === -1}
                  title={own ? "You can't vote on your own reply" : undefined}
                  className={cn(
                    'rounded text-text-low hover:text-text-hi disabled:opacity-30 disabled:hover:text-text-low',
                    r.my_vote === -1 && 'text-red-300',
                  )}
                >
                  <ArrowBigDown size={20} />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="caption">@{r.author_id.slice(0, 12)}</p>
                  {accepted && (
                    <span className={cn(badge, 'border-gold/50 text-gold-soft')}>
                      <CheckCircle2 size={11} aria-hidden="true" /> Accepted answer
                    </span>
                  )}
                </div>
                {editingReplyId === r.id ? (
                  <form onSubmit={(e) => void saveReply(e, r.id)} className="mt-1 space-y-2">
                    <textarea
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      aria-label="Edit reply"
                      rows={3}
                      required
                      className={field}
                    />
                    <div className="flex gap-2">
                      <button type="submit" disabled={busy || !replyDraft.trim()} className={modButton}>
                        Save
                      </button>
                      <button type="button" onClick={() => setEditingReplyId(null)} disabled={busy} className={modButton}>
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-text-mid">
                    {r.body}
                    {r.edited && <span className="caption ms-1.5">(edited)</span>}
                  </p>
                )}
                {editingReplyId !== r.id && (own || thread.can_moderate) && (
                  <div className="mt-2 flex gap-3">
                    {own && (!thread.locked || thread.can_moderate) && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setReplyDraft(r.body)
                          setEditingReplyId(r.id)
                        }}
                        className={cn(linkButton, 'text-gold-soft')}
                      >
                        <Pencil size={11} aria-hidden="true" /> Edit
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void deleteReply(r.id)}
                      className={cn(linkButton, 'text-red-300')}
                    >
                      <Trash2 size={11} aria-hidden="true" /> Delete
                    </button>
                  </div>
                )}
                {canAccept && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void act(
                        () => (accepted ? kaluta.forums.unaccept(thread.id, r.id) : kaluta.forums.accept(thread.id, r.id)),
                        'Could not update the answer',
                      )
                    }
                    className="mt-2 text-xs font-semibold text-gold-soft hover:underline disabled:opacity-40"
                  >
                    {accepted ? 'Remove mark' : 'Mark as answer'}
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {thread.locked && !thread.can_moderate ? (
        <p className="mt-4 inline-flex items-center gap-2 text-sm text-text-low">
          <Lock size={13} aria-hidden="true" /> This thread is locked. New replies are closed.
        </p>
      ) : (
        <form onSubmit={sendReply} className="mt-4 flex gap-2">
          <input
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={thread.locked ? 'Reply as a moderator…' : 'Reply…'}
            aria-label="Reply"
            className={field}
          />
          <button
            type="submit"
            disabled={!reply.trim() || busy}
            className="shrink-0 rounded-full bg-white/8 px-4 text-sm font-semibold text-text-mid disabled:opacity-40"
          >
            Send
          </button>
        </form>
      )}
    </article>
  )
}
