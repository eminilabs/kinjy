import { useCallback, useEffect, useState } from 'react'
import {
  Globe,
  Link2,
  Lock,
  LogOut,
  MessagesSquare,
  Pencil,
  Plus,
  Settings,
  ShoppingCart,
  Trash2,
  UsersRound,
  X,
} from 'lucide-react'
import MemberQueue from '@/components/community/MemberQueue'
import RoleBadge from '@/components/community/RoleBadge'
import ForumBrowser from '@/components/forums/ForumBrowser'
import SecretInvite from '@/components/community/SecretInvite'
import InviteLinks from '@/components/community/InviteLinks'
import { ApiError, kaluta } from '@/lib/api'
import { cn } from '@/lib/utils'

type Detail = Awaited<ReturnType<typeof kaluta.communities.get>>

export const KIND_META: Record<string, { label: string; icon: typeof Globe; tone: string }> = {
  public: { label: 'Public', icon: Globe, tone: 'text-text-mid' },
  private: { label: 'Private · approval needed', icon: Lock, tone: 'text-amber-200' },
  secret: { label: 'Secret', icon: Lock, tone: 'text-text-mid' },
  paid: { label: 'Paid', icon: Lock, tone: 'text-gold-soft' },
}

const primaryButton =
  'inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-sm font-bold text-ink disabled:opacity-40'

const ghostButton =
  'inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-text-mid hover:border-gold/40 hover:text-text-hi disabled:opacity-40'
const editField =
  'w-full rounded-card-sm border border-white/10 bg-ink-2/60 px-3 py-2 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none'

/**
 * One community, with the right door for whoever is looking.
 *
 * The primary action is derived from the viewer's own `my_status` — not from
 * the list row — so a pending request or an existing membership is never
 * offered "Join" again.
 */
type Tab = 'forums' | 'members' | 'invite' | 'settings'

export default function CommunityPanel({
  communityId,
  initialTab,
  onClose,
  onChanged,
}: {
  communityId: string
  /** `tab=requests` in a notification link lands on the member queue. */
  initialTab?: string | null
  /** Called once the community no longer exists (deleted). */
  onClose: () => void
  /** The list and the invitations card show membership too; they reload on this. */
  onChanged: () => void
}) {
  const [detail, setDetail] = useState<Detail | null>(null)
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [tab, setTab] = useState<string>(initialTab === 'requests' ? 'members' : (initialTab ?? 'forums'))
  const [form, setForm] = useState({ name: '', description: '', price: '' })
  // Creating a forum is the community's action, so its button sits in this header.
  const [createForum, setCreateForum] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setLoadError(null)
    setMissing(false)
    kaluta.communities
      .get(communityId)
      .then(setDetail)
      .catch((err) => {
        setDetail(null)
        // A secret community you cannot see answers 404; say nothing more than that.
        if (err instanceof ApiError && err.status === 404) setMissing(true)
        else setLoadError(err instanceof ApiError ? err.message : 'Could not load this community')
      })
      .finally(() => setLoading(false))
  }, [communityId])

  useEffect(() => {
    setMessage(null)
    setError(null)
    load()
  }, [load])

  const settle = (text: string) => {
    setMessage(text)
    load()
    onChanged()
  }

  const fail = (err: unknown, fallback: string) => {
    if (!(err instanceof ApiError)) return setError(fallback)
    setError(
      err.status === 403
        ? `${err.message || 'You cannot join this community.'}`
        : err.status === 409
          ? err.message || 'You are already a member.'
          : err.status === 404
            ? 'This community is not available.'
            : err.message,
    )
  }

  const join = async () => {
    if (!detail) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const result = await kaluta.communities.join(detail.id)
      settle(
        result.status === 'pending'
          ? `Request sent to ${detail.name} — a moderator has to approve it.`
          : `You joined ${detail.name}.`,
      )
    } catch (err) {
      fail(err, 'Could not join')
    } finally {
      setBusy(false)
    }
  }

  const buy = async () => {
    if (!detail) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      // The price is the community's; the server refuses any other amount.
      const checkout = await kaluta.communities.checkout(detail.id, Number(detail.price_usd))
      if (checkout.mock) {
        await kaluta.communities.settleMock(checkout.payment_id)
      } else if (checkout.checkout_url) {
        window.location.assign(checkout.checkout_url)
        return
      }
      settle(`Payment received. Welcome to ${detail.name}.`)
    } catch (err) {
      fail(err, 'The payment did not go through')
    } finally {
      setBusy(false)
    }
  }

  const leave = async () => {
    if (!detail) return
    const paid = detail.kind === 'paid' && detail.my_status === 'active'
    const question = paid
      ? `Leave ${detail.name}? You will not get a refund, and joining again means paying again.`
      : detail.my_status === 'pending'
        ? `Withdraw your request to join ${detail.name}?`
        : `Leave ${detail.name}?`
    if (!window.confirm(question)) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const result = await kaluta.communities.leave(detail.id)
      setEditing(false)
      settle(result.message)
    } catch (err) {
      fail(err, 'Could not leave')
    } finally {
      setBusy(false)
    }
  }

  const startEdit = () => {
    if (!detail) return
    setForm({ name: detail.name, description: detail.description, price: detail.price_usd ?? '' })
    setEditing(true)
    setError(null)
    setMessage(null)
  }

  const saveEdit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!detail) return
    setBusy(true)
    setError(null)
    try {
      await kaluta.communities.edit(detail.id, {
        name: form.name.trim(),
        description: form.description,
        ...(detail.kind === 'paid' ? { price_usd: Number(form.price) } : {}),
      })
      setEditing(false)
      settle('Community updated.')
    } catch (err) {
      fail(err, 'Could not save the changes')
    } finally {
      setBusy(false)
    }
  }

  const changeForumCreation = async (value: 'members' | 'stewards') => {
    if (!detail || value === detail.forum_creation) return
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const saved = await kaluta.communities.edit(detail.id, { forum_creation: value })
      setDetail((prev) => (prev ? { ...prev, forum_creation: saved.forum_creation } : prev))
      setMessage(
        value === 'members' ? 'Any member can now open forums.' : 'Only you and moderators can now open forums.',
      )
    } catch (err) {
      fail(err, 'Could not change who can open forums')
    } finally {
      setBusy(false)
    }
  }

  const removeCommunity = async () => {
    if (!detail) return
    if (
      !window.confirm(
        `Delete ${detail.name}? Its forums, threads, replies and member list are erased for everyone. This cannot be undone.`,
      )
    )
      return
    setBusy(true)
    setError(null)
    try {
      await kaluta.communities.remove(detail.id)
      onChanged()
      onClose()
    } catch (err) {
      fail(err, 'Could not delete the community')
      setBusy(false)
    }
  }

  const shell = (children: React.ReactNode) => (
    <section className="cloud-card p-5" aria-label="Community details">
      {children}
    </section>
  )

  if (loading && !detail) return shell(<p className="text-sm text-text-low">Loading community…</p>)

  if (missing || loadError || !detail) {
    return shell(<p className="text-sm text-text-mid">{missing ? 'This community was not found.' : loadError}</p>)
  }

  const meta = KIND_META[detail.kind] ?? KIND_META.public
  const active = detail.my_status === 'active'
  const steward = active && (detail.my_role === 'owner' || detail.my_role === 'moderator')
  const canCreateForum = steward || detail.forum_creation === 'members'

  const tabs: Array<{ id: Tab; label: string; icon: typeof Globe }> = []
  if (active) {
    tabs.push({ id: 'forums', label: 'Forums', icon: MessagesSquare })
    if (steward) tabs.push({ id: 'members', label: 'Members', icon: UsersRound })
    if (detail.kind === 'secret') tabs.push({ id: 'invite', label: 'Invite', icon: Link2 })
    tabs.push({ id: 'settings', label: 'Settings', icon: Settings })
  }
  const current: Tab = tabs.some((t) => t.id === tab) ? (tab as Tab) : 'forums'

  const settings = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {detail.my_role === 'owner' && active ? (
          <>
            <button type="button" onClick={startEdit} disabled={busy} className={ghostButton}>
              <Pencil size={12} aria-hidden="true" /> Edit
            </button>
            <button
              type="button"
              onClick={() => void removeCommunity()}
              disabled={busy}
              className={cn(ghostButton, 'border-red-300/40 text-red-200 hover:border-red-300/70')}
            >
              <Trash2 size={12} aria-hidden="true" /> Delete community
            </button>
            <p className="caption w-full text-text-low">
              As the owner you cannot leave. Delete the community instead.
            </p>
          </>
        ) : (
          <button type="button" onClick={() => void leave()} disabled={busy} className={ghostButton}>
            <LogOut size={12} aria-hidden="true" /> {active ? 'Leave' : 'Withdraw request'}
          </button>
        )}
      </div>

      {active && (
        <div className="mt-3 rounded-card-sm border border-white/8 bg-ink-2/40 p-3">
          <p className="caption mb-1.5 font-semibold">Who can open forums?</p>
          {detail.my_role === 'owner' ? (
            <>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Who can open forums">
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
                    aria-checked={detail.forum_creation === value}
                    disabled={busy}
                    onClick={() => void changeForumCreation(value)}
                    className={cn(
                      'rounded-full border px-3.5 py-1.5 text-xs font-semibold disabled:opacity-40',
                      detail.forum_creation === value
                        ? 'border-gold/50 bg-gold/10 text-gold-soft'
                        : 'border-white/12 text-text-mid hover:text-text-hi',
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="caption mt-2 text-text-low">
                Owners and moderators can always open forums and sub-forums.
              </p>
            </>
          ) : (
            <p className="text-sm text-text-mid">
              {detail.forum_creation === 'members'
                ? 'Any member can open forums here.'
                : 'Only the owner and moderators can open forums here.'}
            </p>
          )}
        </div>
      )}

      {editing && (
        <form onSubmit={saveEdit} className="mt-3 space-y-2 rounded-card-sm border border-white/8 bg-ink-2/40 p-3">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            aria-label="Community name"
            minLength={2}
            maxLength={140}
            required
            className={editField}
          />
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            aria-label="Description"
            rows={3}
            className={editField}
          />
          {detail.kind === 'paid' && (
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              aria-label="Price in USD"
              required
              className={editField}
            />
          )}
          <p className="caption text-text-low">The kind of a community cannot be changed.</p>
          <div className="flex gap-2">
            <button type="submit" disabled={busy || form.name.trim().length < 2} className={primaryButton}>
              {busy ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setEditing(false)} disabled={busy} className={ghostButton}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </>
  )

  return (
    <div className="space-y-4">
      {shell(
        <>
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo/25 text-sky"
            >
              <UsersRound size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-base font-semibold text-text-hi">{detail.name}</h2>
                <RoleBadge role={detail.my_role} status={detail.my_status} />
              </div>
              <p className={cn('caption inline-flex flex-wrap items-center gap-1.5', meta.tone)}>
                <meta.icon size={11} aria-hidden="true" />
                {meta.label}
                {detail.price_usd && ` · $${detail.price_usd}`}
                {' · '}
                {detail.members_count} member{detail.members_count === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          {detail.description && <p className="mt-3 text-sm text-text-mid">{detail.description}</p>}

          {!active && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {detail.my_status === 'pending' ? (
                <span className="rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-text-mid">
                  Request pending
                </span>
              ) : detail.my_status === 'banned' ? (
                <span className="text-sm text-amber-200">You cannot join this community.</span>
              ) : detail.kind === 'paid' ? (
                <button type="button" onClick={() => void buy()} disabled={busy} className={primaryButton}>
                  <ShoppingCart size={14} aria-hidden="true" />
                  {busy ? 'Processing…' : `Buy access · $${detail.price_usd}`}
                </button>
              ) : detail.kind === 'secret' ? (
                <p className="caption text-text-mid">Secret — you get in by invitation or an invite link.</p>
              ) : (
                <button type="button" onClick={() => void join()} disabled={busy} className={primaryButton}>
                  {busy ? 'Working…' : detail.kind === 'private' ? 'Request to join' : 'Join'}
                </button>
              )}
            </div>
          )}

          {detail.my_status === 'pending' && <div className="mt-3">{settings}</div>}

          {message && <p className="mt-3 text-sm text-gold-soft">{message}</p>}
          {error && (
            <p role="alert" className="mt-3 text-sm text-red-200">
              {error}
            </p>
          )}

          {active && (canCreateForum || current === 'forums') && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {canCreateForum ? (
                <button
                  type="button"
                  aria-expanded={createForum && current === 'forums'}
                  onClick={() => {
                    setCreateForum(current === 'forums' ? !createForum : true)
                    setTab('forums')
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
                    createForum && current === 'forums'
                      ? 'border-gold/50 bg-gold/10 text-gold-soft'
                      : 'border-transparent bg-gradient-to-br from-gold-soft to-gold font-bold text-ink',
                  )}
                >
                  {createForum && current === 'forums' ? (
                    <X size={14} aria-hidden="true" />
                  ) : (
                    <Plus size={14} aria-hidden="true" />
                  )}
                  Create a forum
                </button>
              ) : (
                <p className="text-sm text-text-low">Only the owner and moderators can open forums here</p>
              )}
            </div>
          )}

          {active && (
            <div role="tablist" aria-label="Community sections" className="mt-4 flex gap-1 overflow-x-auto border-b border-white/8">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={current === t.id}
                  onClick={() => {
                    setTab(t.id)
                    if (t.id !== 'forums') setCreateForum(false)
                  }}
                  className={cn(
                    '-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3.5 py-2 text-sm font-semibold',
                    current === t.id
                      ? 'border-gold text-gold-soft'
                      : 'border-transparent text-text-mid hover:text-text-hi',
                  )}
                >
                  <t.icon size={13} aria-hidden="true" />
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </>,
      )}

      {active && current === 'forums' && (
        // Keyed so a different community never inherits the previous one's selection.
        <ForumBrowser
          key={detail.id}
          communityId={detail.id}
          canCreateForum={canCreateForum}
          isSteward={steward}
          createOpen={createForum}
          onCreateOpenChange={setCreateForum}
        />
      )}
      {active && current === 'members' && steward && <MemberQueue communityId={detail.id} canModerate />}
      {active && current === 'invite' && (
        <div className="space-y-3">
          <SecretInvite communityId={detail.id} />
          {steward && <InviteLinks communityId={detail.id} />}
        </div>
      )}
      {active && current === 'settings' && shell(settings)}
    </div>
  )
}
