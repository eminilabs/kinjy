import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ChevronDown, Compass, Plus, Search, UsersRound, X } from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import CommunityPanel, { KIND_META } from '@/components/community/CommunityPanel'
import MyInvitations from '@/components/community/MyInvitations'
import RoleBadge from '@/components/community/RoleBadge'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta } from '@/lib/api'
import { cn } from '@/lib/utils'

const LAST_KEY = 'kinjy.communities.last'

const readLast = () => {
  try {
    return localStorage.getItem(LAST_KEY)
  } catch {
    return null
  }
}

const writeLast = (id: string | null) => {
  try {
    if (id) localStorage.setItem(LAST_KEY, id)
    else localStorage.removeItem(LAST_KEY)
  } catch {
    // Private mode or blocked storage: the newest community is the fallback anyway.
  }
}

const topButton =
  'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors'

function CreateForm({ onCreated }: { onCreated: (id: string) => void }) {
  const [name, setName] = useState('')
  const [kind, setKind] = useState('public')
  const [price, setPrice] = useState('')
  const [forumCreation, setForumCreation] = useState<'members' | 'stewards'>('members')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    const amount = Number(price)
    if (kind === 'paid' && !(amount > 0)) {
      setError('A paid community needs a price above zero.')
      return
    }
    setCreating(true)
    setError(null)
    try {
      const created = await kaluta.communities.create({
        name: name.trim(),
        kind,
        ...(kind === 'paid' ? { price_usd: amount } : {}),
        forum_creation: forumCreation,
      })
      onCreated(created.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the community')
      setCreating(false)
    }
  }

  return (
    <form onSubmit={create} className="cloud-card p-5">
      <div className="flex flex-wrap gap-2">
        {(['public', 'private', 'secret', 'paid'] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cn(
              'rounded-full border px-3.5 py-1.5 text-xs font-semibold capitalize',
              kind === k ? 'border-gold/50 bg-gold/10 text-gold-soft' : 'border-white/12 text-text-mid hover:text-text-hi',
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
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price in USD — 12.50"
          aria-label="Price in USD"
          className="mt-2 w-full rounded-full border border-white/10 bg-ink-2/60 px-4 py-2.5 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none"
        />
      )}
      {kind === 'secret' && (
        <p className="caption mt-2 text-text-mid">
          A secret community never appears in the list. People get in only by an invitation they accept, by being
          added by a member who is connected to them, or through an invite link a moderator shares.
        </p>
      )}
      <div className="mt-3" role="radiogroup" aria-label="Who can open forums?">
        <p className="caption mb-1.5 font-semibold">Who can open forums?</p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['members', 'Any member'],
              ['stewards', 'Only me and moderators'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={forumCreation === value}
              onClick={() => setForumCreation(value)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-xs font-semibold',
                forumCreation === value
                  ? 'border-gold/50 bg-gold/10 text-gold-soft'
                  : 'border-white/12 text-text-mid hover:text-text-hi',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="caption mt-1.5 text-text-low">
          Applies to forums and sub-forums. You can change it later in Settings.
        </p>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-200">
          {error}
        </p>
      )}
    </form>
  )
}

/** Mounted only while open, so the public list is not fetched for nothing. */
function BrowsePanel({ joinedIds, onOpen }: { joinedIds: Set<string>; onOpen: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const list = useApi(() => kaluta.communities.list({ q: search || undefined }), [search])
  const items = (list.data?.items ?? []).filter((c) => !joinedIds.has(c.id))

  return (
    <section className="cloud-card p-5" aria-label="Browse communities">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          setSearch(query.trim())
        }}
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
      <p className="caption mt-2">Secret communities are never listed — a member has to invite you.</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {list.loading && <p className="text-sm text-text-low">Loading communities…</p>}
        {list.error && <p className="text-sm text-amber-200">{list.error}</p>}
        {!list.loading && !list.error && items.length === 0 && (
          <p className="text-sm text-text-low">No other community matches.</p>
        )}
        {items.map((community) => {
          const meta = KIND_META[community.kind] ?? KIND_META.public
          return (
            <article key={community.id} className="rounded-card-sm border border-white/8 bg-ink-2/40 p-4">
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
              <div className="mt-3">
                {/* The page knows the viewer's own status, so the join / request /
                    buy decision lives there rather than on a row that cannot. */}
                <button
                  type="button"
                  onClick={() => onOpen(community.id)}
                  className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-text-mid hover:border-gold/40 hover:text-gold-soft"
                >
                  {community.kind === 'private' ? 'Request to join' : community.kind === 'paid' ? 'Buy access' : 'Open'}
                </button>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default function Communities() {
  // `?open=<id>` is how notifications and links point at one community.
  const [params, setParams] = useSearchParams()
  const openParam = params.get('open')
  const tabParam = params.get('tab')

  const [showCreate, setShowCreate] = useState(false)
  const [showBrowse, setShowBrowse] = useState(false)
  const [showMine, setShowMine] = useState(false)
  const mine = useApi(() => kaluta.communities.mine(), [])
  const items = mine.data?.items ?? []

  // Explicit link, else the last one opened, else the newest (the API is newest-first).
  const remembered = readLast()
  const fallback = items.find((c) => c.id === remembered)?.id ?? items[0]?.id ?? null
  const openId = openParam ?? fallback

  // Keep the address in step with what is on screen, so it can be shared and reloaded.
  useEffect(() => {
    if (!openParam && fallback) setParams({ open: fallback }, { replace: true })
  }, [openParam, fallback, setParams])

  useEffect(() => {
    if (openParam) writeLast(openParam)
  }, [openParam])

  const open = (id: string) => {
    setShowBrowse(false)
    setShowCreate(false)
    setShowMine(false)
    setParams({ open: id }, { replace: true })
  }

  const onDeleted = (id: string) => {
    const next = items.find((c) => c.id !== id)?.id ?? null
    writeLast(next)
    setParams(next ? { open: next } : {}, { replace: true })
    mine.reload()
  }

  const joinedIds = new Set(items.map((c) => c.id))
  const waiting = mine.loading && !mine.data && !openParam
  const current = items.find((c) => c.id === openId)

  // Create, browse and the list of my communities share the space under the buttons.
  const reveal = (which: 'create' | 'browse' | 'mine') => {
    setShowCreate((v) => (which === 'create' ? !v : false))
    setShowBrowse((v) => (which === 'browse' ? !v : false))
    setShowMine((v) => (which === 'mine' ? !v : false))
  }

  return (
    <AppShell
      title="Communities"
      subtitle="Open one of your communities, start a new one, or find one to join."
    >
      <MyInvitations onChanged={mine.reload} />

      <div className="mt-4 flex flex-wrap gap-2">
        {items.length > 0 && (
          <button
            type="button"
            aria-expanded={showMine}
            onClick={() => reveal('mine')}
            className={cn(
              topButton,
              'max-w-full',
              showMine
                ? 'border-gold/50 bg-gold/10 text-gold-soft'
                : 'border-white/12 text-text-mid hover:border-gold/40 hover:text-text-hi',
            )}
          >
            <ChevronDown
              size={14}
              className={cn('shrink-0 transition-transform', showMine && 'rotate-180')}
              aria-hidden="true"
            />
            <span className="shrink-0">My communities ({items.length})</span>
            {current && <span className="min-w-0 truncate text-text-hi">· {current.name}</span>}
          </button>
        )}
        <button
          type="button"
          aria-expanded={showCreate}
          onClick={() => reveal('create')}
          className={cn(
            topButton,
            showCreate
              ? 'border-gold/50 bg-gold/10 text-gold-soft'
              : 'border-transparent bg-gradient-to-br from-gold-soft to-gold font-bold text-ink',
          )}
        >
          {showCreate ? <X size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
          Create a community
        </button>
        <button
          type="button"
          aria-expanded={showBrowse}
          onClick={() => reveal('browse')}
          className={cn(
            topButton,
            showBrowse
              ? 'border-gold/50 bg-gold/10 text-gold-soft'
              : 'border-white/12 text-text-mid hover:border-gold/40 hover:text-text-hi',
          )}
        >
          {showBrowse ? <X size={14} aria-hidden="true" /> : <Compass size={14} aria-hidden="true" />}
          Browse communities
        </button>
      </div>

      {showCreate && (
        <div className="mt-4">
          <CreateForm
            onCreated={(id) => {
              mine.reload()
              open(id)
            }}
          />
        </div>
      )}
      {showBrowse && (
        <div className="mt-4">
          <BrowsePanel joinedIds={joinedIds} onOpen={open} />
        </div>
      )}

      {mine.error && <p className="mt-4 text-sm text-amber-200">{mine.error}</p>}
      {waiting && <p className="mt-6 text-sm text-text-low">Loading your communities…</p>}

      {!waiting && !openId && !mine.error && !showCreate && !showBrowse && (
        <div className="cloud-card mt-6 p-8 text-center">
          <UsersRound size={28} className="mx-auto text-text-low" aria-hidden="true" />
          <h2 className="mt-3 text-sm font-semibold text-text-hi">You are not in any community yet</h2>
          <p className="caption mt-1">Start your own, or look for one to join.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-sm font-bold text-ink"
            >
              <Plus size={14} aria-hidden="true" /> Create a community
            </button>
            <button
              type="button"
              onClick={() => setShowBrowse(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-text-mid hover:border-gold/40 hover:text-text-hi"
            >
              <Compass size={14} aria-hidden="true" /> Browse communities
            </button>
          </div>
        </div>
      )}

      {showMine && items.length > 0 && (
        <nav aria-label="My communities" className="cloud-card mt-4 p-4">
          <ul className="grid gap-2 sm:grid-cols-2">
            {items.map((community) => {
              const meta = KIND_META[community.kind] ?? KIND_META.public
              const selected = community.id === openId
              return (
                <li key={community.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => open(community.id)}
                    aria-current={selected ? 'true' : undefined}
                    className={cn(
                      'flex w-full flex-col gap-1.5 rounded-card-sm border p-3 text-start',
                      selected ? 'border-gold/40 bg-gold/5' : 'border-white/8 bg-ink-2/40 hover:border-white/15',
                    )}
                  >
                    <span className="truncate text-sm font-semibold text-text-hi">{community.name}</span>
                    <span className="flex flex-wrap items-center gap-2">
                      <span className={cn('caption inline-flex items-center gap-1 capitalize', meta.tone)}>
                        <meta.icon size={11} aria-hidden="true" />
                        {community.kind}
                      </span>
                      <RoleBadge role={community.my_role} status={community.my_status} />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </nav>
      )}

      {openId && (
        <div className="mt-6 min-w-0">
          {/* Keyed so switching community resets the tab and any open form. */}
          <CommunityPanel
            key={openId}
            communityId={openId}
            initialTab={openParam === openId ? tabParam : null}
            onChanged={mine.reload}
            onClose={() => onDeleted(openId)}
          />
        </div>
      )}
    </AppShell>
  )
}
