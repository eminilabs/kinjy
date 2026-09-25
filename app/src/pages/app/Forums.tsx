import { useCallback, useEffect, useState } from 'react'
import { Landmark, MessageSquarePlus, Plus, Sparkles } from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import { ApiError, kaluta, type Forum, type Thread, type ThreadDetail } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function Forums() {
  const [forums, setForums] = useState<Forum[]>([])
  const [forumId, setForumId] = useState<string | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [open, setOpen] = useState<ThreadDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof kaluta.forums.summary>> | null>(null)
  const [summarising, setSummarising] = useState(false)

  const summarise = async (threadId: string) => {
    setSummarising(true)
    setSummary(null)
    try {
      setSummary(await kaluta.forums.summary(threadId))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'The summariser is unavailable')
    } finally {
      setSummarising(false)
    }
  }

  const [forumName, setForumName] = useState('')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [reply, setReply] = useState('')

  const loadForums = useCallback(async () => {
    try {
      const result = await kaluta.forums.list()
      setForums(result.items)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load forums')
    }
  }, [])

  const loadThreads = useCallback(async (id: string) => {
    setForumId(id)
    setOpen(null)
    try {
      const result = await kaluta.forums.threads(id)
      setThreads(result.items)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load threads')
    }
  }, [])

  useEffect(() => {
    void loadForums()
  }, [loadForums])

  const createForum = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!forumName.trim()) return
    try {
      const created = await kaluta.forums.create({ name: forumName.trim() })
      setForumName('')
      await loadForums()
      void loadThreads(created.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the forum')
    }
  }

  const createThread = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!forumId || !title.trim() || !body.trim()) return
    try {
      await kaluta.forums.createThread(forumId, { title: title.trim(), body: body.trim() })
      setTitle('')
      setBody('')
      void loadThreads(forumId)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not post the thread')
    }
  }

  const openThread = async (threadId: string) => {
    try {
      setOpen(await kaluta.forums.thread(threadId))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not open the thread')
    }
  }

  const sendReply = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!open || !reply.trim()) return
    try {
      await kaluta.forums.reply(open.id, reply.trim())
      setReply('')
      await openThread(open.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reply')
    }
  }

  const field =
    'w-full rounded-card-sm border border-white/10 bg-ink-2/60 px-3 py-2 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none'

  return (
    <AppShell
      title="Forums"
      subtitle="Threaded discussion that nests by topic and by geography. Answers distil into a cited knowledge base."
    >
      <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
        <div className="space-y-3">
          <form onSubmit={createForum} className="cloud-card p-4">
            <label className="caption mb-1.5 block" htmlFor="forum-name">
              Open a forum
            </label>
            <div className="flex gap-2">
              <input
                id="forum-name"
                value={forumName}
                onChange={(e) => setForumName(e.target.value)}
                placeholder="Cassava growers"
                className={field}
              />
              <button
                type="submit"
                disabled={!forumName.trim()}
                aria-label="Create forum"
                className="shrink-0 rounded-full bg-white/8 px-3 text-text-mid disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
            </div>
          </form>

          <ul className="space-y-1.5">
            {forums.length === 0 && <li className="text-sm text-text-low">No forums yet.</li>}
            {forums.map((forum) => (
              <li key={forum.id}>
                <button
                  type="button"
                  onClick={() => void loadThreads(forum.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-card-sm border p-3 text-start transition-colors',
                    forumId === forum.id
                      ? 'border-gold/40 bg-gold/5'
                      : 'border-white/8 bg-ink-2/40 hover:border-white/15',
                  )}
                >
                  <Landmark size={14} className="shrink-0 text-text-low" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-text-hi">{forum.name}</span>
                    <span className="caption">
                      {forum.threads_count} thread{forum.threads_count === 1 ? '' : 's'}
                      {forum.scope && ` · ${forum.scope}`}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4">
          {!forumId && <p className="text-sm text-text-low">Pick a forum, or open one.</p>}

          {forumId && !open && (
            <>
              <form onSubmit={createThread} className="cloud-card p-5">
                <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-text-hi">
                  <MessageSquarePlus size={15} className="text-gold" aria-hidden="true" />
                  Start a thread
                </h2>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Title"
                  className={field}
                />
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={3}
                  placeholder="What do you want to discuss?"
                  className={cn(field, 'mt-2 resize-none')}
                />
                <button
                  type="submit"
                  disabled={!title.trim() || !body.trim()}
                  className="mt-3 rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2 text-sm font-bold text-ink disabled:opacity-40"
                >
                  Post
                </button>
              </form>

              <ul className="space-y-2">
                {threads.length === 0 && <li className="text-sm text-text-low">No threads yet.</li>}
                {threads.map((thread) => (
                  <li key={thread.id}>
                    <button
                      type="button"
                      onClick={() => void openThread(thread.id)}
                      className="w-full rounded-card-sm border border-white/8 bg-ink-2/40 p-4 text-start transition-colors hover:border-gold/30"
                    >
                      <p className="text-sm font-semibold text-text-hi">{thread.title}</p>
                      <p className="caption mt-1">
                        {thread.replies_count} repl{thread.replies_count === 1 ? 'y' : 'ies'} ·{' '}
                        {thread.views_count} views
                      </p>
                      {thread.ai_summary && (
                        <p className="caption mt-1.5 text-sky">AI summary: {thread.ai_summary}</p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {open && (
            <article className="cloud-card p-5">
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="caption mb-3 text-gold-soft hover:underline"
              >
                ← Back to threads
              </button>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-text-hi">{open.title}</h2>
                <button
                  type="button"
                  onClick={() => void summarise(open.id)}
                  disabled={summarising}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-sky/40 px-3 py-1.5 text-xs font-semibold text-sky transition-colors hover:bg-sky/10 disabled:opacity-40"
                >
                  <Sparkles size={12} aria-hidden="true" />
                  {summarising ? 'Reading…' : 'Summarise'}
                </button>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-text-mid">{open.body}</p>

              {summary && (
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
                {open.replies.length === 0 && <li className="text-sm text-text-low">No replies yet.</li>}
                {open.replies.map((r) => (
                  <li key={r.id} className="rounded-card-sm bg-ink-2/40 p-3">
                    <p className="caption">@{r.author_id.slice(0, 12)}</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-text-mid">{r.body}</p>
                  </li>
                ))}
              </ul>

              {!open.locked && (
                <form onSubmit={sendReply} className="mt-4 flex gap-2">
                  <input
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Reply…"
                    aria-label="Reply"
                    className={field}
                  />
                  <button
                    type="submit"
                    disabled={!reply.trim()}
                    className="shrink-0 rounded-full bg-white/8 px-4 text-sm font-semibold text-text-mid disabled:opacity-40"
                  >
                    Send
                  </button>
                </form>
              )}
            </article>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-200">
          {error}
        </p>
      )}
    </AppShell>
  )
}
