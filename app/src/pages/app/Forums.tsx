import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ChevronRight, Landmark, MessageSquarePlus, Plus, Sparkles, UserRound } from 'lucide-react'
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
    'w-full rounded-xl border border-transparent bg-text-hi/[0.07] px-4 py-3 text-[0.95rem] text-text-hi placeholder:text-text-low focus:border-gold/50 focus:bg-transparent focus:outline-none'
  const label = 'mono-data mb-3 text-[0.7rem] font-bold uppercase tracking-[0.15em] text-gold-soft'
  const currentForum = forums.find((f) => f.id === forumId)

  return (
    <AppShell>
      <header className="mb-6">
        <p className="mono-data text-[0.72rem] font-bold uppercase tracking-[0.15em] text-gold-soft">Forums</p>
        <h1 className="mt-2 text-[clamp(38px,5vw,56px)] font-bold leading-[1.02] tracking-[-0.045em] text-text-hi">
          Ask. Answer. Learn.
        </h1>
        <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-text-low">
          Threaded discussion that nests by topic and by geography. Answers distil into a cited knowledge base.
        </p>
      </header>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-4">
          <form onSubmit={createForum} className="cloud-card p-5">
            <label className={cn(label, 'block')} htmlFor="forum-name">
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
                className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl bg-gradient-to-br from-gold-soft to-gold text-ink disabled:opacity-40"
              >
                <Plus size={17} />
              </button>
            </div>
          </form>

          <ul className="space-y-1">
            {forums.length === 0 && <li className="px-1 text-sm text-text-low">No forums yet.</li>}
            {forums.map((forum) => (
              <li key={forum.id}>
                <button
                  type="button"
                  onClick={() => void loadThreads(forum.id)}
                  aria-current={forumId === forum.id ? 'true' : undefined}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-start transition-colors',
                    forumId === forum.id ? 'bg-gold/15' : 'hover:bg-text-hi/[0.05]',
                  )}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky/15 text-sky">
                    <Landmark size={18} aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[0.95rem] font-semibold text-text-hi">{forum.name}</span>
                    <span className="block text-xs text-text-low">
                      {forum.threads_count} thread{forum.threads_count === 1 ? '' : 's'}
                      {forum.scope && ` · ${forum.scope}`}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0 space-y-5">
          {!forumId && (
            <div className="cloud-card px-6 py-14 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gold/15 text-gold-soft">
                <Landmark size={26} aria-hidden="true" />
              </span>
              <p className="mt-5 text-lg font-bold tracking-[-0.02em] text-text-hi">Pick a forum</p>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-text-low">
                Choose one on the left, or open a new one.
              </p>
            </div>
          )}

          {forumId && !open && (
            <>
              {currentForum && (
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <h2 className="text-2xl font-bold tracking-[-0.03em] text-text-hi">{currentForum.name}</h2>
                  <span className="text-sm text-text-low">
                    {threads.length} thread{threads.length === 1 ? '' : 's'}
                  </span>
                </div>
              )}

              <form onSubmit={createThread} className="cloud-card p-5 md:p-6">
                <h2 className="mb-4 flex items-center gap-2.5 text-[1.05rem] font-bold tracking-[-0.02em] text-text-hi">
                  <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-gold/15 text-gold-soft">
                    <MessageSquarePlus size={16} aria-hidden="true" />
                  </span>
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
                  className={cn(field, 'mt-2.5 resize-none')}
                />
                <button
                  type="submit"
                  disabled={!title.trim() || !body.trim()}
                  className="mt-4 rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-2.5 text-sm font-bold text-ink disabled:opacity-40"
                >
                  Post
                </button>
              </form>

              <ul className="space-y-3">
                {threads.length === 0 && (
                  <li className="cloud-card px-6 py-10 text-center">
                    <p className="text-base font-semibold text-text-hi">No threads yet</p>
                    <p className="mt-1 text-sm text-text-low">Start the first one above.</p>
                  </li>
                )}
                {threads.map((thread) => (
                  <li key={thread.id}>
                    <button
                      type="button"
                      onClick={() => void openThread(thread.id)}
                      className="cloud-card group flex w-full items-center gap-4 p-5 text-start transition-colors hover:border-gold/50"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[1.05rem] font-bold leading-snug tracking-[-0.015em] text-text-hi group-hover:text-gold-soft">
                          {thread.title}
                        </span>
                        <span className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-text-low">
                          <span className="rounded-full bg-text-hi/[0.07] px-2.5 py-0.5 font-semibold text-text-mid">
                            {thread.replies_count} repl{thread.replies_count === 1 ? 'y' : 'ies'}
                          </span>
                          <span>{thread.views_count} views</span>
                        </span>
                        {thread.ai_summary && (
                          <span className="mt-2.5 block rounded-xl bg-sky/10 px-3 py-2 text-[0.82rem] leading-relaxed text-sky">
                            AI summary: {thread.ai_summary}
                          </span>
                        )}
                      </span>
                      <ChevronRight size={18} className="shrink-0 text-text-low" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {open && (
            <article className="cloud-card p-5 md:p-7">
              <button
                type="button"
                onClick={() => setOpen(null)}
                className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-text-mid hover:text-gold-soft"
              >
                <ArrowLeft size={14} aria-hidden="true" />
                Back to threads
              </button>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h2 className="min-w-0 text-[clamp(24px,3vw,32px)] font-bold leading-tight tracking-[-0.035em] text-text-hi">{open.title}</h2>
                <button
                  type="button"
                  onClick={() => void summarise(open.id)}
                  disabled={summarising}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-sky/50 px-4 py-2 text-sm font-semibold text-sky hover:bg-sky/10 disabled:opacity-40"
                >
                  <Sparkles size={14} aria-hidden="true" />
                  {summarising ? 'Reading…' : 'Summarise'}
                </button>
              </div>
              <p className="mt-4 whitespace-pre-wrap text-base leading-relaxed text-text-mid">{open.body}</p>

              {summary && (
                <div className="mt-5 rounded-2xl bg-sky/10 p-4">
                  {summary.summarised ? (
                    <>
                      <p className="text-[0.95rem] leading-relaxed text-text-hi">{summary.summary}</p>
                      {/* Named, not hidden: a reader can only weigh a machine's
                          summary if they know a machine wrote it, how many
                          posts it stands on, and whether the provider was real. */}
                      <p className="mt-2 text-xs text-text-low">
                        AI summary of {summary.replies_counted} replies
                        {summary.provider && ` · ${summary.provider}`}
                        {summary.mock && ' · mock provider, no model key configured'}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-text-low">{summary.reason}</p>
                  )}
                </div>
              )}

              <h3 className="mt-7 flex items-center gap-2 border-t border-[var(--cloud-border)] pt-5 text-lg font-bold tracking-[-0.02em] text-text-hi">
                Replies
                <span className="mono-data rounded-full bg-text-hi/[0.07] px-2.5 py-0.5 text-xs font-semibold text-text-mid">
                  {open.replies.length}
                </span>
              </h3>
              <ul className="mt-4 space-y-3">
                {open.replies.length === 0 && <li className="text-sm text-text-low">No replies yet.</li>}
                {open.replies.map((r) => (
                  <li key={r.id} className="flex gap-3">
                    <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-text-hi/[0.08] text-text-low">
                      <UserRound size={16} />
                    </span>
                    <div className="min-w-0 flex-1 rounded-2xl bg-text-hi/[0.05] px-4 py-3">
                      <p className="mono-data text-xs font-semibold text-text-low">@{r.author_id.slice(0, 12)}</p>
                      <p className="mt-1 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-text-mid">{r.body}</p>
                    </div>
                  </li>
                ))}
              </ul>

              {!open.locked && (
                <form onSubmit={sendReply} className="mt-5 flex gap-2">
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
                    className="shrink-0 rounded-xl bg-gradient-to-br from-gold-soft to-gold px-6 text-sm font-bold text-ink disabled:opacity-40"
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
        <p role="alert" className="mt-5 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      )}
    </AppShell>
  )
}
