import { useState } from 'react'
import { Link } from 'react-router'
import { Check, Clock, Landmark, UserPlus, UsersRound } from 'lucide-react'
import { RailCard } from '@/components/app/AppShell'
import { useAppTheme } from '@/components/appdemo/theme'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta, type Discoveries, type PersonSuggestion } from '@/lib/api'
import { announce } from '@/lib/live'
import { cn } from '@/lib/utils'
import MemberAvatar from './MemberAvatar'

/** Why a suggestion is here, said plainly rather than dressed up. */
const REASON: Record<string, string> = {
  most_followed: 'Most followed on Kinjy',
  most_active: 'Most active right now',
}

/**
 * People worth following, with the follow and connect actions attached.
 *
 * Exported because Explore shows the same list at a different size. The rail
 * wants four and a discovery page wants a dozen, but the asking, the
 * optimistic state and the difference between following and connecting are the
 * same work either way - and a second copy of it would be a second place for
 * "connect" to quietly start meaning "follow".
 */
export function People({ limit = 4, title = 'People to follow' }: { limit?: number; title?: string }) {
  const { tok } = useAppTheme()
  const suggestions = useApi(() => kaluta.suggestions.people(limit), [limit])
  const [followed, setFollowed] = useState<Set<string>>(new Set())
  // Only the ones invited in *this* session. What the server already knows is
  // read from each person's own `connection`, because a Set in a component
  // dies with the page - which is exactly why somebody who had sent a request
  // an hour earlier came back to a button saying "Connect".
  const [invited, setInvited] = useState<Set<string>>(new Set())
  // Accepted in this session, so the button says so without a refetch.
  const [accepted, setAccepted] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const follow = async (person: PersonSuggestion) => {
    setBusy(person.user_id)
    try {
      await kaluta.social.follow(person.user_id)
      setFollowed((current) => new Set(current).add(person.user_id))
      // The profile card shows a Following count; tell it to catch up.
      announce('profile')
    } catch {
      /* the button simply stays as it was */
    } finally {
      setBusy(null)
    }
  }

  /**
   * Following is one-way. Connecting asks, and they decide.
   *
   * Two different actions behind one button, and sending them both down the
   * invite endpoint is why "Accept" did nothing. Inviting somebody who has
   * already invited you does accept - but only after that endpoint has
   * checked whether they accept invitations at all, and a member whose
   * setting refuses invitations from strangers had their own invitation
   * refused on the way in. Accepting is answering, so it answers.
   */
  const invite = async (person: PersonSuggestion) => {
    const accepting = standing(person) === 'invites_you'
    setBusy(person.user_id)
    setNote(null)
    try {
      if (accepting) {
        await kaluta.connections.respond(person.user_id, true)
        setAccepted((current) => new Set(current).add(person.user_id))
        announce('connections')
        setNote(`You and ${person.display_name} are connected.`)
        return
      }
      const result = await kaluta.connections.invite(person.user_id)
      setInvited((current) => new Set(current).add(person.user_id))
      announce('connections')
      setNote(
        result.status === 'accepted'
          ? `You and ${person.display_name} are connected — they had already invited you.`
          : `Invitation sent to ${person.display_name}.`,
      )
    } catch (err) {
      setNote(
        err instanceof ApiError
          ? err.message
          : accepting
            ? 'Could not accept the invitation'
            : 'Could not send the invitation',
      )
    } finally {
      setBusy(null)
    }
  }

  const items = suggestions.data?.items ?? []
  if (!suggestions.loading && items.length === 0) return null

  /** What the Connect button means for this person right now. */
  const standing = (person: PersonSuggestion) =>
    accepted.has(person.user_id)
      ? 'connected'
      : invited.has(person.user_id)
        ? 'invited'
        : (person.connection ?? 'none')

  return (
    <RailCard title={title}>
      <p className={cn('mb-4 -mt-2 text-[0.8rem]', tok.mid)}>
        {REASON[suggestions.data?.reason ?? ''] ?? 'Suggested for you'}
      </p>

      {suggestions.loading && <p className={cn('text-xs', tok.low)}>Loading…</p>}

      <ul className="divide-y divide-[var(--cloud-border)]">
        {items.map((person) => (
          <li key={person.user_id} className="py-3.5 first:pt-0 last:pb-0">
            <div className="flex items-center gap-3">
              <MemberAvatar
                handle={person.handle}
                displayName={person.display_name}
                avatarUrl={person.avatar_url}
                size={40}
              />
              <div className="min-w-0 flex-1">
                <p className={cn('truncate text-sm font-bold leading-tight', tok.text)}>
                  <Link to={`/u/${person.handle}`} className="hover:underline">
                    {person.display_name}
                  </Link>
                </p>
                {/* Where they are, when we know. The handle used to be here
                    and is an address, not an introduction: deciding whether to
                    follow somebody is about who they are and where they are. */}
                {person.city && (
                  <p className={cn('mt-0.5 truncate text-xs', tok.low)}>{person.city}</p>
                )}
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => follow(person)}
                disabled={busy === person.user_id || followed.has(person.user_id)}
                title="Follow — one-way, no permission needed"
                className={cn(
                  'inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors',
                  followed.has(person.user_id)
                    ? 'border-transparent bg-gradient-to-br from-gold-soft to-gold'
                    : 'border-gold/50 text-gold-soft hover:bg-gold/10',
                )}
              >
                {followed.has(person.user_id) ? 'Following' : (
                  <>
                    <UserPlus size={12} aria-hidden="true" />
                    Follow
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => invite(person)}
                // Nothing to press once we have asked or are already
                // connected. "Accept" is still a press: they asked us, and
                // the invite endpoint turns a crossing pair into a
                // connection rather than a second request.
                disabled={
                  busy === person.user_id ||
                  standing(person) === 'invited' ||
                  standing(person) === 'connected'
                }
                title={
                  standing(person) === 'invited'
                    ? 'Waiting for them to accept'
                    : standing(person) === 'invites_you'
                      ? 'They invited you — accept to connect'
                      : standing(person) === 'connected'
                        ? 'Already connected'
                        : 'Connect — they have to accept before you can message them'
                }
                className={cn(
                  'inline-flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors',
                  standing(person) === 'none' || standing(person) === 'invites_you'
                    ? 'border-sky/50 text-sky hover:bg-sky/10'
                    : cn('border-[var(--cloud-border)]', tok.low),
                )}
              >
                {standing(person) === 'invited' ? (
                  <>
                    <Clock size={12} aria-hidden="true" />
                    Request sent
                  </>
                ) : standing(person) === 'connected' ? (
                  <>
                    <Check size={12} aria-hidden="true" />
                    Connected
                  </>
                ) : standing(person) === 'invites_you' ? (
                  <>
                    <Check size={12} aria-hidden="true" />
                    Accept
                  </>
                ) : (
                  <>
                    <Check size={12} aria-hidden="true" />
                    Connect
                  </>
                )}
              </button>
            </div>
          </li>
        ))}
      </ul>
      {note && <p className={cn('mt-3 text-[0.68rem]', tok.low)}>{note}</p>}
    </RailCard>
  )
}

/** Communities and forums to join. Exported for Explore, as People is. */
export function Places({ limit = 3, title = 'Places to join' }: { limit?: number; title?: string }) {
  const { tok } = useAppTheme()
  const discover = useApi<Discoveries>(() => kaluta.suggestions.places(limit), [limit])
  const communities = discover.data?.communities ?? []
  const forums = discover.data?.forums ?? []
  if (!discover.loading && communities.length === 0 && forums.length === 0) return null

  const row = 'flex items-center gap-2 rounded-card-sm px-1.5 py-1.5'

  return (
    <RailCard title={title}>
      {communities.length > 0 && (
        <ul className="space-y-0.5">
          {communities.map((c) => (
            <li key={c.id}>
              <Link to="/communities" className={cn(row, tok.hoverBg)}>
                <UsersRound size={13} className="shrink-0 text-gold" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-xs font-semibold', tok.text)}>{c.name}</span>
                  <span className={cn('block text-[0.68rem]', tok.low)}>
                    {c.members_count} member{c.members_count === 1 ? '' : 's'} · {c.kind}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {forums.length > 0 && (
        <ul className={cn('mt-2 space-y-0.5 border-t pt-2', tok.divider, 'border-t-current/10')}>
          {forums.map((f) => (
            <li key={f.id}>
              <Link to="/forums" className={cn(row, tok.hoverBg)}>
                <Landmark size={13} className="shrink-0 text-sky" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className={cn('block truncate text-xs font-semibold', tok.text)}>{f.name}</span>
                  <span className={cn('block text-[0.68rem]', tok.low)}>
                    {f.threads_count} thread{f.threads_count === 1 ? '' : 's'}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </RailCard>
  )
}

/**
 * Suggestions for the feed's rail.
 *
 * People and places are fetched independently: if user-service is down the
 * communities still show, rather than the whole panel vanishing. Each list
 * states the ranking it used, because "suggested for you" implies a
 * personalisation that does not exist yet.
 */
export default function Suggestions() {
  return (
    <>
      <People />
      <Places />
    </>
  )
}
