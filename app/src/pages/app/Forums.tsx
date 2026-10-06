import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Eye,
  Landmark,
  Lock,
  MessageSquare,
  MessageSquarePlus,
  Pin,
  Plus,
  Search,
  Sparkles,
  Send,
  X,
} from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import MemberAvatar from '@/components/social/MemberAvatar'
import { ApiError, kaluta, type Forum, type Thread, type ThreadDetail } from '@/lib/api'
import { cn } from '@/lib/utils'

/** Responsive media query hook to isolate mobile navigation flows cleanly. */
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false))
  useEffect(() => {
    const list = window.matchMedia(query)
    const update = () => setMatches(list.matches)
    update()
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [query])
  return matches
}

/** Relative time formatting for clean, mobile-compact timestamps. */
function ago(iso?: string | null): string {
  if (!iso) return ''
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function Forums() {
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  const [forums, setForums] = useState<Forum[]>([])
  const [forumId, setForumId] = useState<string | null>(null)
  const [threads, setThreads] = useState<Thread[]>([])
  const [open, setOpen] = useState<ThreadDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [summary, setSummary] = useState<Awaited<ReturnType<typeof kaluta.forums.summary>> | null>(null)
  const [summarising, setSummarising] = useState(false)

  // Creation & search states
  const [forumSearch, setForumSearch] = useState('')
  const [forumName, setForumName] = useState('')
  const [isCreatingForum, setIsCreatingForum] = useState(false)
  const [isCreatingThread, setIsCreatingThread] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [reply, setReply] = useState('')

  const activeForum = useMemo(() => forums.find((f) => f.id === forumId), [forums, forumId])

  const filteredForums = useMemo(() => {
    if (!forumSearch.trim()) return forums
    const term = forumSearch.trim().toLowerCase()
    return forums.filter(
      (f) => f.name.toLowerCase().includes(term) || f.scope?.toLowerCase().includes(term),
    )
  }, [forums, forumSearch])

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
    setIsCreatingThread(false)
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
      setIsCreatingForum(false)
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
      setIsCreatingThread(false)
      void loadThreads(forumId)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not post the thread')
    }
  }

  const openThread = async (threadId: string) => {
    setSummary(null)
    try {
      setOpen(await kaluta.forums.thread(threadId))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not open the thread')
    }
  }

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

  const inputClass =
    'w-full rounded-2xl border border-white/10 bg-ink-2/60 px-4 py-3 text-sm text-text-hi placeholder:text-text-low focus:border-gold/50 focus:outline-none transition-colors'

  // Decide mobile view: 'thread' | 'threads' | 'forums'
  const showMobileForums = !isDesktop && !forumId && !open
  const showMobileThreads = !isDesktop && Boolean(forumId) && !open
  const showMobileThread = !isDesktop && Boolean(open)

  return (
    <AppShell
      title="Forums"
      subtitle="Threaded discussion that nests by topic and by geography. Answers distil into a cited knowledge base."
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          {/* ========================================================= */}
          {/* LEFT PANEL: Forum List (Always on desktop, conditional on mobile) */}
          {/* ========================================================= */}
          {(isDesktop || showMobileForums) && (
            <aside className="space-y-4">
              {/* Header card with action */}
              <div className="cloud-card space-y-3 p-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-text-hi">Communities & Topics</h2>
                  <button
                    type="button"
                    onClick={() => setIsCreatingForum(!isCreatingForum)}
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-white/8 text-text-mid transition-all hover:bg-white/12 active:scale-95"
                    aria-label={isCreatingForum ? 'Cancel' : 'Open new forum'}
                  >
                    {isCreatingForum ? <X size={16} /> : <Plus size={16} />}
                  </button>
                </div>

                {/* Form to open a new forum */}
                {isCreatingForum && (
                  <form onSubmit={createForum} className="space-y-2 pt-2 border-t border-white/8">
                    <label className="caption block" htmlFor="forum-name">
                      New forum title
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="forum-name"
                        value={forumName}
                        onChange={(e) => setForumName(e.target.value)}
                        placeholder="e.g. Agritech & Crops"
                        className={inputClass}
                        autoFocus
                      />
                      <button
                        type="submit"
                        disabled={!forumName.trim()}
                        className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-xl bg-gold px-4 text-xs font-bold text-ink transition-opacity disabled:opacity-40"
                      >
                        Create
                      </button>
                    </div>
                  </form>
                )}

                {/* Search bar */}
                <div className="relative">
                  <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-low" aria-hidden="true" />
                  <input
                    type="search"
                    value={forumSearch}
                    onChange={(e) => setForumSearch(e.target.value)}
                    placeholder="Filter forums…"
                    className={cn(inputClass, 'py-2.5 pl-9 text-xs')}
                  />
                </div>
              </div>

              {/* Forum items list */}
              <nav aria-label="Forums directory">
                <ul className="space-y-2">
                  {filteredForums.length === 0 && (
                    <li className="cloud-card p-6 text-center text-sm text-text-low">
                      No forums match your query.
                    </li>
                  )}
                  {filteredForums.map((forum) => {
                    const isSelected = forumId === forum.id
                    return (
                      <li key={forum.id}>
                        <button
                          type="button"
                          onClick={() => void loadThreads(forum.id)}
                          className={cn(
                            'group flex min-h-[56px] w-full items-center justify-between rounded-2xl border p-3.5 text-start transition-all active:scale-[0.99]',
                            isSelected
                              ? 'border-gold/50 bg-gold/10 shadow-sm'
                              : 'border-white/8 bg-ink-2/40 hover:border-white/20 hover:bg-ink-2/60',
                          )}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={cn(
                                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors',
                                isSelected ? 'bg-gold/20 text-gold' : 'bg-white/6 text-text-low group-hover:text-text-mid',
                              )}
                            >
                              <Landmark size={18} aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                              <span className="block truncate text-sm font-medium text-text-hi">
                                {forum.name}
                              </span>
                              <span className="caption flex items-center gap-1.5 text-text-low">
                                <span>{forum.threads_count} thread{forum.threads_count === 1 ? '' : 's'}</span>
                                {forum.scope && (
                                  <>
                                    <span>·</span>
                                    <span className="capitalize text-gold-soft">{forum.scope}</span>
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                          <ChevronRight
                            size={16}
                            className={cn('shrink-0 text-text-low transition-transform group-hover:translate-x-0.5', isSelected && 'text-gold')}
                            aria-hidden="true"
                          />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </nav>
            </aside>
          )}

          {/* ========================================================= */}
          {/* RIGHT PANEL: Dynamic Threads & Detail View */}
          {/* ========================================================= */}
          <main className="space-y-4">
            {/* Desktop empty selection placeholder */}
            {isDesktop && !forumId && (
              <div className="cloud-card flex min-h-[360px] flex-col items-center justify-center p-8 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/4 text-gold">
                  <Landmark size={26} aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold text-text-hi">Select a forum to join the discussion</h3>
                <p className="caption mt-1.5 max-w-sm text-text-mid">
                  Browse regional topics, ask questions to local experts, or start a new thread for your community.
                </p>
              </div>
            )}

            {/* ------------------------------------------------------- */}
            {/* THREADS LIST (Active forum, no single thread open) */}
            {/* ------------------------------------------------------- */}
            {forumId && !open && (isDesktop || showMobileThreads) && (
              <div className="space-y-4">
                {/* Forum banner & action bar */}
                <div className="cloud-card p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Mobile back button to forum list */}
                      {!isDesktop && (
                        <button
                          type="button"
                          onClick={() => {
                            setForumId(null)
                            setIsCreatingThread(false)
                          }}
                          className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl bg-white/8 text-text-mid transition-transform active:scale-95"
                          aria-label="Back to forums"
                        >
                          <ArrowLeft size={18} />
                        </button>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-text-hi truncate">
                            {activeForum?.name ?? 'Forum'}
                          </h2>
                          {activeForum?.scope && (
                            <span className="rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-[11px] font-medium text-gold">
                              {activeForum.scope}
                            </span>
                          )}
                        </div>
                        <p className="caption text-text-low mt-0.5">
                          {threads.length} discussion{threads.length === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsCreatingThread(!isCreatingThread)}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-gradient-to-r from-gold-soft to-gold px-4 py-2 text-xs font-bold text-ink shadow-sm transition-transform active:scale-95"
                    >
                      {isCreatingThread ? <X size={15} /> : <MessageSquarePlus size={15} />}
                      <span>{isCreatingThread ? 'Cancel' : 'New thread'}</span>
                    </button>
                  </div>

                  {/* Create thread form */}
                  {isCreatingThread && (
                    <form onSubmit={createThread} className="mt-4 pt-4 border-t border-white/8 space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gold">
                        Start a new conversation
                      </h3>
                      <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Thread title"
                        className={inputClass}
                        autoFocus
                      />
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows={4}
                        placeholder="Explain your thought or question clearly…"
                        className={cn(inputClass, 'resize-none')}
                      />
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsCreatingThread(false)}
                          className="min-h-[44px] rounded-xl px-4 text-xs font-semibold text-text-mid hover:bg-white/6"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={!title.trim() || !body.trim()}
                          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-gold px-5 text-xs font-bold text-ink transition-opacity disabled:opacity-40 active:scale-95"
                        >
                          <Send size={14} />
                          <span>Publish</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Threads listing */}
                <div className="space-y-3">
                  {threads.length === 0 && (
                    <div className="cloud-card p-8 text-center text-sm text-text-low">
                      No discussions posted yet. Be the first to start a conversation!
                    </div>
                  )}

                  {threads.map((thread) => (
                    <article key={thread.id}>
                      <button
                        type="button"
                        onClick={() => void openThread(thread.id)}
                        className="group flex w-full flex-col gap-3 rounded-2xl border border-white/8 bg-ink-2/40 p-4 text-start transition-all hover:border-gold/30 hover:bg-ink-2/60 active:scale-[0.99]"
                      >
                        {/* Top author row */}
                        <div className="flex items-center justify-between gap-2 w-full">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <MemberAvatar
                              handle={thread.author?.handle}
                              displayName={thread.author?.display_name}
                              avatarUrl={thread.author?.avatar_url}
                              size={28}
                            />
                            <div className="flex items-center gap-1.5 truncate text-xs">
                              <span className="font-medium text-text-hi truncate">
                                {thread.author?.display_name || thread.author?.handle || `@${thread.author_id.slice(0, 10)}`}
                              </span>
                              {thread.author?.handle && (
                                <span className="caption text-text-low truncate">@{thread.author.handle}</span>
                              )}
                              <span className="caption text-text-low">·</span>
                              <span className="caption text-text-low shrink-0">
                                {ago(thread.created_at || thread.last_activity_at)}
                              </span>
                            </div>
                          </div>

                          {thread.pinned && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] font-semibold text-gold">
                              <Pin size={10} /> Pinned
                            </span>
                          )}
                        </div>

                        {/* Title */}
                        <h3 className="text-base font-semibold leading-snug text-text-hi group-hover:text-gold transition-colors">
                          {thread.title}
                        </h3>

                        {/* AI summary badge preview if available */}
                        {thread.ai_summary && (
                          <div className="flex items-start gap-1.5 rounded-xl border border-sky-400/20 bg-sky-500/8 px-3 py-2 text-xs text-sky">
                            <Sparkles size={13} className="shrink-0 mt-0.5" aria-hidden="true" />
                            <p className="line-clamp-2 leading-relaxed">{thread.ai_summary}</p>
                          </div>
                        )}

                        {/* Footer counters */}
                        <div className="flex items-center gap-4 text-xs text-text-low pt-1 border-t border-white/6">
                          <span className="flex items-center gap-1.5">
                            <MessageSquare size={13} />
                            <span>{thread.replies_count} {thread.replies_count === 1 ? 'reply' : 'replies'}</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Eye size={13} />
                            <span>{thread.views_count} views</span>
                          </span>
                        </div>
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            )}

            {/* ------------------------------------------------------- */}
            {/* THREAD DETAIL VIEW (Single active thread open) */}
            {/* ------------------------------------------------------- */}
            {open && (isDesktop || showMobileThread) && (
              <article className="space-y-4">
                {/* Back button & thread header */}
                <div className="cloud-card p-4 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between gap-3 border-b border-white/8 pb-3">
                    <button
                      type="button"
                      onClick={() => setOpen(null)}
                      className="inline-flex min-h-[44px] items-center gap-2 rounded-xl px-2.5 text-xs font-semibold text-gold hover:bg-gold/10 transition-colors active:scale-95"
                    >
                      <ArrowLeft size={16} />
                      <span>Back to {activeForum?.name ?? 'threads'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => void summarise(open.id)}
                      disabled={summarising}
                      className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-2xl border border-sky-400/40 bg-sky-500/10 px-3.5 text-xs font-semibold text-sky transition-transform hover:bg-sky-500/15 active:scale-95 disabled:opacity-40"
                    >
                      <Sparkles size={14} className={cn(summarising && 'animate-spin')} aria-hidden="true" />
                      <span>{summarising ? 'Reading…' : 'Summarise with AI'}</span>
                    </button>
                  </div>

                  {/* Original poster info */}
                  <div className="flex items-center gap-3">
                    <MemberAvatar
                      handle={open.author?.handle}
                      displayName={open.author?.display_name}
                      avatarUrl={open.author?.avatar_url}
                      size={40}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text-hi">
                          {open.author?.display_name || open.author?.handle || `@${open.author_id.slice(0, 10)}`}
                        </span>
                        {open.author?.handle && (
                          <span className="caption text-text-low">@{open.author.handle}</span>
                        )}
                      </div>
                      <p className="caption text-text-low">{ago(open.created_at)}</p>
                    </div>
                  </div>

                  {/* Thread Title & Content */}
                  <div>
                    <h1 className="text-lg sm:text-xl font-bold leading-tight text-text-hi">
                      {open.title}
                    </h1>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text-mid">
                      {open.body}
                    </p>
                  </div>

                  {/* AI Summary Card */}
                  {summary && (
                    <div className="mt-4 rounded-2xl border border-sky-400/25 bg-sky-500/10 p-4">
                      {summary.summarised ? (
                        <>
                          <div className="flex items-center gap-2 text-xs font-bold text-sky mb-2">
                            <Sparkles size={14} />
                            <span>AI Synthesis</span>
                          </div>
                          <p className="text-sm leading-relaxed text-text-hi">{summary.summary}</p>
                          <p className="caption mt-2 text-sky/80">
                            Distilled from {summary.replies_counted} replies
                            {summary.provider && ` · ${summary.provider}`}
                            {summary.mock && ' · mock test provider'}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-sky/90">{summary.reason}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* --------------------------------------------------- */}
                {/* Replies section */}
                {/* --------------------------------------------------- */}
                <section aria-label="Thread replies" className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm font-bold text-text-hi">
                      Replies ({open.replies.length})
                    </h2>
                  </div>

                  {open.replies.length === 0 && (
                    <div className="cloud-card p-6 text-center text-sm text-text-low">
                      No replies yet. Share your thoughts or answer this inquiry.
                    </div>
                  )}

                  <ul className="space-y-3">
                    {open.replies.map((r) => (
                      <li
                        key={r.id}
                        className={cn(
                          'cloud-card p-4 space-y-2.5 transition-all',
                          r.accepted_answer && 'border-emerald-500/40 bg-emerald-500/5',
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <MemberAvatar
                              handle={r.author?.handle}
                              displayName={r.author?.display_name}
                              avatarUrl={r.author?.avatar_url}
                              size={32}
                            />
                            <div className="flex items-center gap-1.5 truncate text-xs">
                              <span className="font-medium text-text-hi truncate">
                                {r.author?.display_name || r.author?.handle || `@${r.author_id.slice(0, 10)}`}
                              </span>
                              {r.author?.handle && (
                                <span className="caption text-text-low truncate">@{r.author.handle}</span>
                              )}
                              <span className="caption text-text-low">·</span>
                              <span className="caption text-text-low shrink-0">{ago(r.created_at)}</span>
                            </div>
                          </div>

                          {r.accepted_answer && (
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                              <CheckCircle2 size={12} /> Solved
                            </span>
                          )}
                        </div>

                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-mid pl-1">
                          {r.body}
                        </p>
                      </li>
                    ))}
                  </ul>
                </section>

                {/* --------------------------------------------------- */}
                {/* Reply composer */}
                {/* --------------------------------------------------- */}
                <div className="cloud-card sticky bottom-4 z-10 p-3 sm:p-4 shadow-xl backdrop-blur-md">
                  {open.locked ? (
                    <div className="flex items-center justify-center gap-2 py-2 text-xs font-semibold text-text-low">
                      <Lock size={14} />
                      <span>This thread is locked against new replies.</span>
                    </div>
                  ) : (
                    <form onSubmit={sendReply} className="flex gap-2">
                      <input
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Write a helpful response…"
                        aria-label="Write a reply"
                        className={inputClass}
                      />
                      <button
                        type="submit"
                        disabled={!reply.trim()}
                        className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-2xl bg-gold px-4 text-sm font-bold text-ink transition-opacity disabled:opacity-40 active:scale-95"
                        aria-label="Send reply"
                      >
                        <Send size={16} />
                      </button>
                    </form>
                  )}
                </div>
              </article>
            )}
          </main>
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}
    </AppShell>
  )
}
