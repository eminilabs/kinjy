import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { Check, Clock, MapPin, MessageSquare, UserPlus, Users } from 'lucide-react'
import AppShell, { RailCard } from '@/components/app/AppShell'
import MemberAvatar from '@/components/social/MemberAvatar'
import PostCard from '@/components/social/PostCard'
import { VerifiedBadge } from '@/components/ui-kit'
import { useAppTheme } from '@/components/appdemo/theme'
import { useAuth } from '@/hooks/useAuth'
import { announce } from '@/lib/live'
import {
  ApiError,
  kaluta,
  type Permissions,
  type Post,
  type Profile as ProfileData,
} from '@/lib/api'
import { cn } from '@/lib/utils'

/** Why an action is unavailable, in the member's own terms. */
const BLOCKED: Record<string, string> = {
  blocked: 'You cannot interact with this member.',
  not_connected: 'Connect first — they only accept messages from accepted connections.',
}

export default function Profile() {
  const { handle = '' } = useParams()
  const { user } = useAuth()
  const { tok } = useAppTheme()

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [permissions, setPermissions] = useState<Permissions | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [following, setFollowing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const found = await kaluta.account.profileByHandle(handle)
      setProfile(found)

      // Permissions and posts are independent of each other: a failure in one
      // must not blank the page, so they settle separately.
      const [perm, page] = await Promise.allSettled([
        kaluta.connections.with(found.user_id),
        kaluta.posts.byAuthor(found.user_id),
      ])
      if (perm.status === 'fulfilled') setPermissions(perm.value)
      if (page.status === 'fulfilled') setPosts(page.value.items)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this profile')
    } finally {
      setLoading(false)
    }
  }, [handle])

  useEffect(() => {
    void load()
  }, [load])

  const isSelf = profile?.user_id === user?.id

  const follow = async () => {
    if (!profile) return
    setBusy(true)
    try {
      await kaluta.social.follow(profile.user_id)
      setFollowing(true)
      announce('profile')
      setProfile((p) => (p ? { ...p, followers_count: p.followers_count + 1 } : p))
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : 'Could not follow')
    } finally {
      setBusy(false)
    }
  }

  const connect = async () => {
    if (!profile) return
    setBusy(true)
    setNote(null)
    try {
      const result = await kaluta.connections.invite(profile.user_id)
      setNote(
        result.status === 'accepted'
          ? 'You are now connected — they had already invited you.'
          : 'Invitation sent.',
      )
      announce('connections')
      setPermissions((p) => (p ? { ...p, pending: true, invited_by_me: true, can_invite: false } : p))
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : 'Could not send the invitation')
    } finally {
      setBusy(false)
    }
  }

  const message = async () => {
    if (!profile) return
    setBusy(true)
    setNote(null)
    try {
      await kaluta.messages.start([profile.user_id])
      window.location.href = '/messages'
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : 'Could not open a conversation')
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <AppShell>
        <p className={cn('py-16 text-center text-sm', tok.low)}>Loading profile…</p>
      </AppShell>
    )
  }

  if (error || !profile) {
    return (
      <AppShell title="Profile">
        <p className="rounded-card-sm border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error ?? 'This member does not exist.'}
        </p>
      </AppShell>
    )
  }

  const place = [profile.city, profile.country].filter(Boolean).join(', ')
  const action = 'inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors'

  return (
    <AppShell
      aside={
        <>
          <RailCard title="About">
            {profile.bio ? (
              <p className={cn('whitespace-pre-wrap text-xs leading-relaxed', tok.mid)}>{profile.bio}</p>
            ) : (
              <p className={cn('text-xs', tok.low)}>No bio yet.</p>
            )}
            <dl className={cn('mt-3 space-y-1.5 border-t pt-3 text-xs', tok.divider, 'border-t-current/10')}>
              {place && (
                <div className="flex justify-between gap-3">
                  <dt className={tok.low}>Location</dt>
                  <dd className={tok.mid}>{place}</dd>
                </div>
              )}
              <div className="flex justify-between gap-3">
                <dt className={tok.low}>Languages</dt>
                <dd className={tok.mid}>{profile.languages}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className={tok.low}>Handle</dt>
                <dd className="mono-data text-gold-soft">@{profile.handle}</dd>
              </div>
            </dl>
          </RailCard>

          {permissions && !isSelf && (
            <RailCard title="Your relationship">
              <ul className={cn('space-y-1.5 text-xs', tok.mid)}>
                <li>{permissions.connected ? 'Connected' : permissions.pending ? 'Invitation pending' : 'Not connected'}</li>
                <li className={tok.low}>
                  {permissions.can_message ? 'Can message' : 'Cannot message yet'}
                </li>
                <li className={tok.low}>
                  {permissions.can_add_family ? 'Can add to family tree' : 'Cannot add to family tree'}
                </li>
              </ul>
            </RailCard>
          )}
        </>
      }
    >
      {/* Header card */}
      <div className={cn('overflow-hidden rounded-card-lg', tok.card)}>
        <div className="h-24 bg-gradient-to-r from-indigo/60 via-sky/40 to-gold/40" aria-hidden="true" />
        <div className="px-5 pb-5">
          <div className="-mt-10 mb-3">
            <MemberAvatar
              displayName={profile.display_name}
              avatarUrl={profile.avatar_url}
              size={80}
              ring
            />
          </div>

          <h1 className={cn('flex items-center gap-2 text-xl font-semibold', tok.text)}>
            {profile.display_name}
            {profile.verified && <VerifiedBadge size={16} />}
          </h1>
          <p className={cn('mt-0.5 text-sm', tok.low)}>
            @{profile.handle}
            {place && (
              <span className="ms-2 inline-flex items-center gap-1">
                <MapPin size={11} aria-hidden="true" />
                {place}
              </span>
            )}
          </p>

          <p className={cn('mt-3 flex items-center gap-4 text-sm', tok.mid)}>
            <span>
              <strong className="text-gold-soft">{profile.followers_count}</strong> followers
            </span>
            <span>
              <strong className="text-gold-soft">{profile.following_count}</strong> following
            </span>
          </p>

          {!isSelf && (
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={follow}
                disabled={busy || following}
                className={cn(
                  action,
                  following
                    ? cn('border border-current/20', tok.low)
                    : 'bg-gradient-to-br from-gold-soft to-gold text-ink',
                )}
              >
                <UserPlus size={14} aria-hidden="true" />
                {following ? 'Following' : 'Follow'}
              </button>

              {permissions?.connected ? (
                <span className={cn(action, 'border border-emerald-400/30 text-emerald-200')}>
                  <Users size={14} aria-hidden="true" />
                  Connected
                </span>
              ) : permissions?.pending ? (
                <span className={cn(action, 'border border-current/20', tok.low)}>
                  <Clock size={14} aria-hidden="true" />
                  {permissions.invited_by_me ? 'Invitation sent' : 'They invited you'}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={connect}
                  disabled={busy || !permissions?.can_invite}
                  title={
                    permissions?.can_invite
                      ? 'They decide whether to accept'
                      : 'This member is not accepting invitations'
                  }
                  className={cn(action, 'border border-sky/40 text-sky hover:bg-sky/10 disabled:opacity-40')}
                >
                  <Check size={14} aria-hidden="true" />
                  Connect
                </button>
              )}

              <button
                type="button"
                onClick={message}
                disabled={busy || !permissions?.can_message}
                title={permissions?.can_message ? 'Open a conversation' : BLOCKED[permissions?.reason ?? ''] ?? ''}
                className={cn(action, 'border border-white/12', tok.mid, 'hover:text-text-hi disabled:opacity-40')}
              >
                <MessageSquare size={14} aria-hidden="true" />
                Message
              </button>
            </div>
          )}

          {note && <p className="mt-3 text-sm text-gold-soft">{note}</p>}
          {!isSelf && permissions && !permissions.can_message && (
            <p className={cn('mt-2 text-xs', tok.low)}>
              {BLOCKED[permissions.reason] ?? 'Messaging is closed for this member.'}
            </p>
          )}
        </div>
      </div>

      {/* Their posts */}
      <h2 className={cn('mb-3 mt-6 text-sm font-semibold', tok.text)}>
        Posts {posts.length > 0 && <span className={tok.low}>({posts.length})</span>}
      </h2>
      {posts.length === 0 ? (
        <p className={cn('rounded-card-lg p-6 text-center text-sm', tok.card, tok.low)}>
          Nothing public here yet.
        </p>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              algorithmId="chronological"
              isOwn={post.author_id === user?.id}
              currentUserId={user?.id ?? ''}
              onHidden={(id) => setPosts((current) => current.filter((p) => p.id !== id))}
              onChangeAlgorithm={() => undefined}
            />
          ))}
        </div>
      )}
    </AppShell>
  )
}
