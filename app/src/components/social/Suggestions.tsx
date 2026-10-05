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

function People() {
  const { tok } = useAppTheme()
  const suggestions = useApi(() => kaluta.suggestions.people(4), [])
  const [followed, setFollowed] = useState<Set<string>>(new Set())
  const [invited, setInvited] = useState<Set<string>>(new Set())
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

  /** Following is one-way. Connecting asks, and they decide. */
  const invite = async (person: PersonSuggestion) => {
    setBusy(person.user_id)
    setNote(null)
    try {
      const result = await kaluta.connections.invite(person.user_id)
      setInvited((current) => new Set(current).add(person.user_id))
      announce('connections')
      setNote(
        result.status === 'accepted'
          ? `You and ${person.display_name} are connected — they had already invited you.`
          : `Invitation sent to ${person.display_name}.`,
      )
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : 'Could not send the invitation')
    } finally {
      setBusy(null)
    }
  }

  const items = suggestions.data?.items ?? []
  if (!suggestions.loading && items.length === 0) return null

  return (
    <RailCard title="People to follow">
      <p className={cn('mb-4 -mt-2 text-xs', tok.low)}>
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
                <p className={cn('mt-0.5 truncate text-xs', tok.low)}>
                  @{person.handle}
                  {person.city ? ` · ${person.city}` : ''}
                </p>
              </div>
            </div>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => follow(person)}
                disabled={busy === person.user_id || followed.has(person.user_id)}
                title="Follow — one-way, no permission needed"
                className={cn(
                  'inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  followed.has(person.user_id)
                    ? cn('border-[var(--cloud-border)]', tok.low)
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
                disabled={busy === person.user_id || invited.has(person.user_id)}
                title="Connect — they have to accept before you can message them"
                className={cn(
                  'inline-flex items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  invited.has(person.user_id)
                    ? cn('border-[var(--cloud-border)]', tok.low)
                    : 'border-sky/50 text-sky hover:bg-sky/10',
                )}
              >
                {invited.has(person.user_id) ? (
                  <>
                    <Clock size={12} aria-hidden="true" />
                    Pending
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

function Places() {
  const { tok } = useAppTheme()
  const discover = useApi<Discoveries>(() => kaluta.suggestions.places(3), [])
  const communities = discover.data?.communities ?? []
  const forums = discover.data?.forums ?? []
  if (!discover.loading && communities.length === 0 && forums.length === 0) return null

  const row = 'flex items-center gap-2 rounded-card-sm px-1.5 py-1.5'

  return (
    <RailCard title="Places to join">
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
