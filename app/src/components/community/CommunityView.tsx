import { useState } from 'react'
import { ArrowLeft, Globe, Lock, LogOut, UsersRound } from 'lucide-react'
import Composer from '@/components/social/Composer'
import PostCard from '@/components/social/PostCard'
import MemberQueue from '@/components/community/MemberQueue'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { ApiError, kaluta, type Post } from '@/lib/api'
import { cn } from '@/lib/utils'

const KIND_LABEL: Record<string, string> = {
  public: 'Public — anyone can read and join',
  private: 'Private — a moderator approves who joins',
  secret: 'Secret — members only',
  paid: 'Paid — access is bought',
}

/**
 * One community, opened: what has been posted in it, and the box to add to it.
 *
 * This is what made a community a community rather than a row in a directory.
 * Before it, a post addressed to a community was accepted, hidden from every
 * feed and listed by nothing — written into a group and read by its author
 * alone.
 *
 * Who sees what follows the kind of community, and the page says which kind it
 * is rather than leaving a member to infer it from what is missing. A public
 * one can be read before joining, because a group nobody can look into cannot
 * be judged worth joining. A private or secret one answers 404 to an outsider,
 * so the page offers the join button instead of an error.
 */
export default function CommunityView({
  handle,
  onBack,
  onChanged,
}: {
  /** The slug from the URL, or an id. The API resolves either. */
  handle: string
  onBack: () => void
  /** The directory behind this shows member counts, so it reloads after a join or a leave. */
  onChanged?: () => void
}) {
  const { user } = useAuth()
  const detail = useApi(() => kaluta.communities.get(handle), [handle])
  // The posts are fetched by id rather than by the slug in the URL, because
  // they are served by social-service, which knows ids and nothing about
  // community naming. So this waits for the community to resolve.
  const communityId = detail.data?.id ?? ''
  const feed = useApi(
    () => (communityId ? kaluta.communities.feed(communityId) : Promise.resolve(null)),
    [communityId],
  )
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const [fresh, setFresh] = useState<Post[]>([])
  const [managing, setManaging] = useState(false)

  const community = detail.data
  const isMember = community?.my_status === 'active'
  const isPending = community?.my_status === 'pending'
  const isOwner = community?.my_role === 'owner'

  const join = async () => {
    if (!community) return
    setBusy(true)
    setNote(null)
    try {
      const result = await kaluta.communities.join(communityId)
      setNote(
        result.status === 'pending'
          ? 'Request sent — a moderator has to approve it.'
          : `You joined ${community.name}.`,
      )
      detail.reload()
      feed.reload()
      onChanged?.()
    } catch (err) {
      // A paid community answers 402. That is information, not a failure.
      setNote(err instanceof ApiError ? err.message : 'Could not join')
    } finally {
      setBusy(false)
    }
  }

  const leave = async () => {
    setBusy(true)
    setNote(null)
    try {
      await kaluta.communities.leave(communityId)
      setNote('You left this community.')
      setFresh([])
      detail.reload()
      feed.reload()
      onChanged?.()
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : 'Could not leave')
    } finally {
      setBusy(false)
    }
  }

  const posts = [...fresh, ...(feed.data?.items ?? [])]

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-mid hover:text-gold-soft"
      >
        <ArrowLeft size={13} aria-hidden="true" />
        All communities
      </button>

      {detail.loading && <p className="caption">Loading…</p>}
      {detail.error && <p className="text-sm text-red-300">{detail.error}</p>}

      {community && (
        <>
          <header className="cloud-card p-5">
            <div className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo/25 text-sky"
              >
                <UsersRound size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <h1 className="truncate text-lg font-semibold text-text-hi">{community.name}</h1>
                <p className="caption mt-0.5 inline-flex items-center gap-1.5">
                  {community.kind === 'public' ? (
                    <Globe size={11} aria-hidden="true" />
                  ) : (
                    <Lock size={11} aria-hidden="true" />
                  )}
                  {KIND_LABEL[community.kind] ?? community.kind}
                  {' · '}
                  {community.members_count} member{community.members_count === 1 ? '' : 's'}
                </p>
                {community.description && (
                  <p className="mt-2 text-sm leading-relaxed text-text-mid">{community.description}</p>
                )}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {!isMember && !isPending && (
                <button
                  type="button"
                  onClick={join}
                  disabled={busy}
                  className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-xs font-bold text-ink disabled:opacity-40"
                >
                  {community.kind === 'private'
                    ? 'Request to join'
                    : community.kind === 'paid'
                      ? 'Buy access'
                      : 'Join'}
                </button>
              )}
              {isPending && (
                <span className="rounded-full border border-amber-400/30 px-4 py-2 text-xs font-semibold text-amber-200">
                  Waiting for a moderator
                </span>
              )}
              {isMember && !isOwner && (
                <button
                  type="button"
                  onClick={leave}
                  disabled={busy}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-text-mid hover:border-red-400/40 hover:text-red-200 disabled:opacity-40"
                >
                  <LogOut size={12} aria-hidden="true" />
                  Leave
                </button>
              )}
              {(isOwner || community.my_role === 'moderator') && (
                <button
                  type="button"
                  onClick={() => setManaging((m) => !m)}
                  className="rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-text-low hover:border-sky/40 hover:text-sky"
                >
                  {managing ? 'Close' : 'Manage members'}
                </button>
              )}
            </div>

            {note && (
              <p role="status" className="mt-3 text-sm text-text-mid">
                {note}
              </p>
            )}

            {managing && (
              <div className="mt-4">
                <MemberQueue communityId={communityId} canModerate />
              </div>
            )}
          </header>

          {isMember ? (
            <Composer
              community={{ id: community.id, name: community.name }}
              onPosted={(post) => setFresh((current) => [post, ...current])}
            />
          ) : (
            <p className="cloud-card p-4 text-sm text-text-mid">
              {isPending
                ? 'You can post here once your request is approved.'
                : 'Join this community to post in it.'}
            </p>
          )}

          {/* A 404 here is the private-community answer, not a broken page: the
              posts exist and are not for this viewer yet. */}
          {feed.error ? (
            <p className="cloud-card p-4 text-sm text-text-mid">
              {isMember
                ? feed.error
                : 'The posts in this community are for its members. Join to read them.'}
            </p>
          ) : feed.loading ? (
            <p className="caption">Loading posts…</p>
          ) : posts.length === 0 ? (
            <p className="cloud-card p-4 text-sm text-text-mid">
              {isMember
                ? 'Nothing has been posted here yet. Be the first.'
                : 'Nothing has been posted here yet.'}
            </p>
          ) : (
            <div className={cn('space-y-4')}>
              {posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  algorithmId="chronological"
                  mode="new"
                  isOwn={post.author_id === user?.id}
                  currentUserId={user?.id ?? ''}
                  onHidden={(id) => setFresh((c) => c.filter((p) => p.id !== id))}
                  onChangeAlgorithm={() => {}}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
