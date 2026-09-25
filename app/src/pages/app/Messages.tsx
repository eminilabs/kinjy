import { useCallback, useEffect, useRef, useState } from 'react'
import { Lock, MessageSquare, Plus, Send, ShieldOff, Wifi, WifiOff } from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import MemberAvatar from '@/components/social/MemberAvatar'
import { useApi } from '@/hooks/useApi'
import { useRealtime } from '@/hooks/useRealtime'
import { useAuth } from '@/hooks/useAuth'
import { ApiError, kaluta, type Conversation, type Message, type PersonBrief } from '@/lib/api'
import { cn } from '@/lib/utils'

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })

/** What to call a thread: its title, or simply the other people in it. */
function titleOf(conversation: Conversation, others: string[]): string {
  if (conversation.title) return conversation.title
  const names = others
    .map((id) => conversation.profiles?.[id]?.display_name)
    .filter((name): name is string => Boolean(name))
  if (names.length) return names.join(', ')
  // Only when the profile could not be resolved at all — better a short id than
  // an empty row, but it should be rare enough to notice.
  return others[0] ? `@${others[0].slice(0, 12)}` : 'Conversation'
}

export default function Messages() {
  const { user } = useAuth()
  const conversations = useApi<{ items: Conversation[] }>(() => kaluta.messages.conversations(), [])
  const [activeId, setActiveId] = useState<string | null>(null)
  // The socket callback is created once; a ref keeps it reading the live value.
  const activeIdRef = useRef<string | null>(null)
  activeIdRef.current = activeId
  const [messages, setMessages] = useState<Message[]>([])
  const [loadingThread, setLoadingThread] = useState(false)
  const [draft, setDraft] = useState('')
  const [peer, setPeer] = useState('')
  const [composing, setComposing] = useState(false)
  const [results, setResults] = useState<Array<PersonBrief & { user_id: string }>>([])
  const [searched, setSearched] = useState(false)
  // Kept apart from `error`, which renders in the thread pane on the right —
  // a refusal to *start* a conversation belongs next to the person you clicked,
  // not in a column you are not looking at. That is why clicking someone who
  // only accepts connections appeared to do nothing at all.
  const [startError, setStartError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const openThread = useCallback(async (conversationId: string) => {
    setActiveId(conversationId)
    setLoadingThread(true)
    setError(null)
    try {
      const page = await kaluta.messages.list(conversationId)
      setMessages(page.items)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the conversation')
    } finally {
      setLoadingThread(false)
    }
  }, [])

  useEffect(() => {
    const first = conversations.data?.items[0]
    if (first && !activeId) void openThread(first.id)
  }, [conversations.data, activeId, openThread])

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft.trim() || !activeId) return
    const text = draft.trim()
    setDraft('')
    try {
      const created = await kaluta.messages.send(activeId, text)
      setMessages((current) => [
        ...current,
        {
          id: created.id,
          sender_id: user!.id,
          encrypted: false,
          ciphertext_b64: null,
          body: text,
          kind: 'text',
          created_at: created.created_at,
        },
      ])
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send')
      setDraft(text)
    }
  }

  /** Open (or reuse) a thread with this member. */
  const startWith = async (userId: string) => {
    setError(null)
    setStartError(null)
    try {
      const created = await kaluta.messages.start([userId])
      setPeer('')
      setResults([])
      setSearched(false)
      setComposing(false)
      conversations.reload()
      void openThread(created.id)
    } catch (err) {
      // Usually their `who_can_message` setting refusing. The server's sentence
      // already says what to do next, so it is shown verbatim rather than
      // flattened into "could not start".
      setStartError(err instanceof ApiError ? err.message : 'Could not start the conversation')
    }
  }

  // Debounced: a request per keystroke would be a request per keystroke, and
  // the last one to arrive is not necessarily the last one typed.
  useEffect(() => {
    const query = peer.trim()
    if (query.length < 2) {
      setResults([])
      setSearched(false)
      return
    }
    const timer = window.setTimeout(() => {
      void kaluta.people
        .search(query)
        .then((r) => {
          setResults(r.items)
          setSearched(true)
        })
        .catch(() => {
          setResults([])
          setSearched(true)
        })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [peer])

  // Live delivery. Messages for the open thread land straight in it; anything
  // else just refreshes the conversation list so its ordering stays truthful.
  const { connected } = useRealtime((event) => {
    if (event.type !== 'message') return
    if (event.conversation_id === activeIdRef.current && event.message_id) {
      setMessages((current) =>
        current.some((m) => m.id === event.message_id)
          ? current
          : [
              ...current,
              {
                id: event.message_id!,
                sender_id: event.sender_id ?? '',
                encrypted: Boolean(event.encrypted),
                ciphertext_b64: null,
                body: event.body ?? null,
                kind: 'text',
                created_at: event.created_at ?? new Date().toISOString(),
              },
            ],
      )
    }
    conversations.reload()
  })

  const active = conversations.data?.items.find((c) => c.id === activeId)

  return (
    <AppShell
      title="Messages"
      subtitle="Private conversations between members."
      action={
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold',
            connected
              ? 'border-emerald-400/30 text-emerald-200'
              : 'border-amber-400/30 text-amber-200',
          )}
        >
          {connected ? <Wifi size={12} aria-hidden="true" /> : <WifiOff size={12} aria-hidden="true" />}
          {connected ? 'Live' : 'Reconnecting…'}
        </span>
      }
    >
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Conversations */}
        <div className="space-y-3">
          {/* Your conversations come first. Starting a new one is an action, so
              it is a button — not a form permanently occupying the top of the
              list. The member-id field is a stand-in until people search exists. */}
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-text-hi">Conversations</h2>
            <button
              type="button"
              onClick={() => setComposing((v) => !v)}
              aria-expanded={composing}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-text-mid transition-colors hover:border-gold/40 hover:text-gold-soft"
            >
              <Plus size={12} aria-hidden="true" />
              New
            </button>
          </div>

          {composing && (
            <div>
              <input
                id="peer-search"
                value={peer}
                onChange={(e) => setPeer(e.target.value)}
                placeholder="Search by name or @handle…"
                aria-label="Search for someone to message"
                autoFocus
                className="w-full rounded-full border border-white/10 bg-ink-2/60 px-3 py-2 text-xs text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none"
              />

              {peer.trim().length > 0 && peer.trim().length < 2 && (
                <p className="caption mt-1.5">Keep typing — two characters at least.</p>
              )}

              {results.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {results.map((person) => (
                    <li key={person.user_id}>
                      <button
                        type="button"
                        onClick={() => void startWith(person.user_id)}
                        className="flex w-full items-center gap-2.5 rounded-card-sm px-2 py-1.5 text-start transition-colors hover:bg-white/5"
                      >
                        <MemberAvatar
                          handle={person.handle}
                          displayName={person.display_name}
                          avatarUrl={person.avatar_url}
                          size={28}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-sm text-text-hi">{person.display_name}</span>
                          <span className="caption block truncate">@{person.handle}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {startError && (
                <p role="alert" className="mt-2 rounded-card-sm border border-amber-300/30 bg-amber-300/10 px-2.5 py-2 text-xs text-amber-100">
                  {startError}
                </p>
              )}

              {searched && peer.trim().length >= 2 && results.length === 0 && (
                <p className="caption mt-2">
                  Nobody found. Someone who turned off discovery in their privacy
                  settings will not appear here.
                </p>
              )}
            </div>
          )}

          {conversations.loading && <p className="text-sm text-text-low">Loading…</p>}
          {conversations.data?.items.length === 0 && (
            <p className="text-sm text-text-low">
              No conversations yet. Use “New” to start one.
            </p>
          )}

          <ul className="space-y-2">
            {(conversations.data?.items ?? []).map((conversation) => {
              const others = conversation.participants.filter((p) => p !== user?.id)
              return (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => void openThread(conversation.id)}
                    className={cn(
                      'w-full rounded-card-sm border p-3 text-start transition-colors',
                      activeId === conversation.id
                        ? 'border-gold/40 bg-gold/5'
                        : 'border-white/8 bg-ink-2/40 hover:border-white/15',
                    )}
                  >
                    <p className="flex items-center gap-2 truncate text-sm font-medium text-text-hi">
                      <span className="truncate">{titleOf(conversation, others)}</span>
                      {(conversation.unread ?? 0) > 0 && (
                        <span className="ms-auto shrink-0 rounded-full bg-gold px-1.5 py-0.5 text-[0.65rem] font-bold text-ink">
                          {conversation.unread}
                        </span>
                      )}
                    </p>
                    <p className="caption inline-flex items-center gap-1">
                      {conversation.encrypted ? (
                        <>
                          <Lock size={10} aria-hidden="true" /> encrypted
                        </>
                      ) : (
                        <>
                          <ShieldOff size={10} aria-hidden="true" /> plaintext
                        </>
                      )}
                      {' · '}
                      {when(conversation.last_message_at)}
                    </p>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>

        {/* Thread */}
        <div className="cloud-card flex min-h-[420px] flex-col p-5">
          {!active ? (
            <div className="m-auto text-center">
              <MessageSquare size={22} className="mx-auto text-text-low" aria-hidden="true" />
              <p className="mt-2 text-sm text-text-low">Pick a conversation.</p>
            </div>
          ) : (
            <>
              <header className="mb-3 border-b border-white/8 pb-3">
                <p className="text-sm font-semibold text-text-hi">
                  {active.title ?? `@${active.participants.filter((p) => p !== user?.id)[0]?.slice(0, 14)}`}
                </p>
                <p className="caption">
                  {active.encrypted
                    ? 'End-to-end encrypted — the server stores ciphertext only.'
                    : 'Plaintext conversation: no key exchange is implemented yet, so this thread is readable server-side.'}
                </p>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto">
                {loadingThread && <p className="text-sm text-text-low">Loading messages…</p>}
                {!loadingThread && messages.length === 0 && (
                  <p className="text-sm text-text-low">No messages yet.</p>
                )}
                {messages.map((message) => {
                  const mine = message.sender_id === user?.id
                  return (
                    <div key={message.id} className={cn('flex', mine && 'justify-end')}>
                      <div
                        className={cn(
                          'max-w-[75%] rounded-card-md px-3.5 py-2.5',
                          mine ? 'bg-gold/15 text-text-hi' : 'bg-white/6 text-text-mid',
                        )}
                      >
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {message.encrypted ? (
                            <span className="italic text-text-low">
                              Encrypted — only your device can read this.
                            </span>
                          ) : (
                            message.body
                          )}
                        </p>
                        <p className="caption mt-1 text-right">{when(message.created_at)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <form onSubmit={send} className="mt-4 flex gap-2 border-t border-white/8 pt-4">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Write a message…"
                  aria-label="Message"
                  className="w-full rounded-full border border-white/10 bg-ink-2/60 px-4 py-2.5 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!draft.trim()}
                  aria-label="Send"
                  className="shrink-0 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2.5 text-ink disabled:opacity-40"
                >
                  <Send size={15} aria-hidden="true" />
                </button>
              </form>
            </>
          )}
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-200">
              {error}
            </p>
          )}
        </div>
      </div>
    </AppShell>
  )
}
