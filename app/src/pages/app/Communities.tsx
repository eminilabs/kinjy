import { useState } from 'react'
import { Globe, Lock, Plus, Search, UsersRound } from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import MemberQueue from '@/components/community/MemberQueue'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta, type Community } from '@/lib/api'
import { cn } from '@/lib/utils'

const KIND_META: Record<string, { label: string; icon: typeof Globe; tone: string }> = {
  public: { label: 'Public', icon: Globe, tone: 'text-text-mid' },
  private: { label: 'Private · approval needed', icon: Lock, tone: 'text-amber-200' },
  paid: { label: 'Paid', icon: Lock, tone: 'text-gold-soft' },
}

export default function Communities() {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const list = useApi(() => kaluta.communities.list({ q: search || undefined }), [search])

  const [name, setName] = useState('')
  const [kind, setKind] = useState('public')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [managing, setManaging] = useState<string | null>(null)

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    setCreating(true)
    setError(null)
    try {
      await kaluta.communities.create({ name: name.trim(), kind })
      setName('')
      list.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the community')
    } finally {
      setCreating(false)
    }
  }

  const join = async (community: Community) => {
    setNote(null)
    try {
      const result = await kaluta.communities.join(community.id)
      setNote(
        result.status === 'pending'
          ? `Request sent to ${community.name} — a moderator has to approve it.`
          : `You joined ${community.name}.`,
      )
      list.reload()
    } catch (err) {
      // A paid community answers 402; that is information, not a failure.
      setNote(err instanceof ApiError ? err.message : 'Could not join')
    }
  }

  return (
    <AppShell
      title="Communities"
      subtitle="Public, private, secret or paid spaces. Secret ones never appear in this list — they are reachable by direct link only."
    >
      <div className="flex flex-col gap-4 lg:flex-row">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            setSearch(query.trim())
          }}
          className="flex flex-1 gap-2"
        >
          <label className="flex w-full items-center gap-2.5 rounded-full border border-white/10 bg-ink-2/60 px-4 py-2.5">
            <Search size={15} className="shrink-0 text-text-low" aria-hidden="true" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search communities…"
              aria-label="Search communities"
              className="w-full bg-transparent text-sm text-text-hi placeholder:text-text-low focus:outline-none"
            />
          </label>
        </form>
      </div>

      <form onSubmit={create} className="cloud-card mt-4 p-5">
        <div className="flex flex-wrap gap-2">
          {(['public', 'private', 'paid'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors',
                kind === k
                  ? 'border-gold/50 bg-gold/10 text-gold-soft'
                  : 'border-white/12 text-text-mid hover:text-text-hi',
              )}
            >
              {k}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Start a community — Kigoma Farmers"
            aria-label="Community name"
            className="w-full rounded-full border border-white/10 bg-ink-2/60 px-4 py-2.5 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!name.trim() || creating}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2.5 text-sm font-bold text-ink disabled:opacity-40"
          >
            <Plus size={14} aria-hidden="true" />
            Create
          </button>
        </div>
        {kind === 'paid' && (
          <p className="caption mt-2 text-amber-200">
            A paid community needs a price before it can be created.
          </p>
        )}
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-200">
            {error}
          </p>
        )}
      </form>

      {note && <p className="mt-4 text-sm text-gold-soft">{note}</p>}

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {list.loading && <p className="text-sm text-text-low">Loading communities…</p>}
        {list.error && <p className="text-sm text-amber-200">{list.error}</p>}
        {list.data?.items.length === 0 && (
          <p className="text-sm text-text-low">No community matches. Start the first one.</p>
        )}
        {(list.data?.items ?? []).map((community) => {
          const meta = KIND_META[community.kind] ?? KIND_META.public
          return (
            <article key={community.id} className="cloud-card p-5">
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo/25 text-sky"
                >
                  <UsersRound size={17} />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-text-hi">{community.name}</h2>
                  <p className={cn('caption inline-flex items-center gap-1.5', meta.tone)}>
                    <meta.icon size={11} aria-hidden="true" />
                    {meta.label}
                    {community.price_usd && ` · $${community.price_usd}`}
                    {' · '}
                    {community.members_count} member{community.members_count === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              {community.description && (
                <p className="mt-3 line-clamp-2 text-sm text-text-mid">{community.description}</p>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => join(community)}
                  className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-text-mid transition-colors hover:border-gold/40 hover:text-gold-soft"
                >
                  {community.kind === 'private' ? 'Request to join' : community.kind === 'paid' ? 'Buy access' : 'Join'}
                </button>
                <button
                  type="button"
                  onClick={() => setManaging(managing === community.id ? null : community.id)}
                  className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-text-low transition-colors hover:border-sky/40 hover:text-sky"
                >
                  {managing === community.id ? 'Close' : 'Manage'}
                </button>
              </div>

              {/* The queue is only fetched when opened, and the panel hides
                  itself if the API says you are not a steward — a governance
                  desk that 403s on every action is worse than none. */}
              {managing === community.id && (
                <div className="mt-3">
                  <MemberQueue communityId={community.id} canModerate />
                </div>
              )}
            </article>
          )
        })}
      </div>
    </AppShell>
  )
}
