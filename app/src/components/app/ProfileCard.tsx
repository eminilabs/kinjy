import { useEffect } from 'react'
import { Link } from 'react-router'
import { Award, ChevronRight, Crown, MapPin, Medal, Users } from 'lucide-react'
import { VerifiedBadge } from '@/components/ui-kit'
import { MODULE_ICONS } from '@/components/appdemo/Chrome'
import { ROUTE_FOR } from './navigation'
import type { ChromeKey } from '@/components/appdemo/theme'
import { useAppTheme } from '@/components/appdemo/theme'
import MemberAvatar from '@/components/social/MemberAvatar'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { kaluta } from '@/lib/api'
import { isRouteAvailable } from '@/lib/features'
import { onChange } from '@/lib/live'
import { useMyProfile } from '@/hooks/useMyProfile'
import { useUnreadMessages } from '@/hooks/useUnreadMessages'
import UnreadBadge from './UnreadBadge'
import { countryName } from '@/lib/profileOptions'
import { cn } from '@/lib/utils'

/**
 * The profile mini-card from the designed left rail: centred avatar, name with
 * its verification badge, handle, and place.
 */
/** The shortcuts /app pins. Destinations, not feed modes — and only open ones. */
const PINNED: ChromeKey[] = (['home', 'create', 'familyTree', 'messages', 'connections'] as ChromeKey[]).filter(
  (key) => isRouteAvailable(ROUTE_FOR[key]),
)

export default function ProfileCard() {
  const { user } = useAuth()
  const { t, tok, lang } = useAppTheme()
  // Real circles, not the demo's four fixed names: this rail is a switch into
  // the member's own audiences, and inventing "Business" for someone who has
  // no such circle would make it a decoration.
  const circles = useApi(() => kaluta.circles.list(), [])
  // Shared with the top bar and the composer, and refreshed whenever the
  // profile changes (an edit, or following someone changing a count here).
  const data = useMyProfile()
  // Only on this card, which nobody but the member sees: how many connections
  // someone has — a teenager especially — is not for strangers on /u/:handle.
  const connections = useApi(() => kaluta.connections.list(), [])
  useEffect(() => onChange('connections', connections.reload), [connections.reload])
  const unread = useUnreadMessages()

  // A circle made, renamed or deleted anywhere in the app changes this rail.
  // (The profile's own counts are refreshed by useMyProfile.)
  useEffect(() => onChange('circles', circles.reload), [circles.reload])

  // The profile is what the editor changes; the account copy only stands in
  // until it has loaded.
  const displayName = data?.display_name ?? user?.display_name ?? ''
  const place = [data?.city, data?.country && countryName(data.country, lang)].filter(Boolean).join(', ')

  return (
    <div className="space-y-3">
      <div className={cn('rounded-[20px] p-5 text-center', tok.card)}>
        <div className="flex justify-center">
          <MemberAvatar handle={user?.handle} displayName={displayName} avatarUrl={data?.avatar_url} size={84} ring />
        </div>

        <p className={cn('mt-4 flex items-center justify-center gap-1.5 text-[17px] font-bold leading-tight tracking-[-0.02em]', tok.text)}>
          {displayName}
          {user?.kyc_verified && <VerifiedBadge size={15} />}
        </p>
        <p className={cn('mono-data mt-1 truncate text-xs', tok.low)}>@{user?.handle}</p>
        {place && (
          <p className={cn('mt-1.5 flex items-center justify-center gap-1 text-[0.72rem]', tok.low)}>
            <MapPin size={11} aria-hidden="true" />
            {place}
          </p>
        )}

        <hr className="my-5 border-0 border-t border-[var(--cloud-border)]" />

        <dl className="grid grid-cols-2 divide-x divide-[var(--cloud-border)]">
          <div>
            <dd className={cn('text-[22px] font-bold leading-none tabular-nums', tok.text)}>
              {data?.followers_count ?? 0}
            </dd>
            <dt className={cn('mt-1.5 text-xs', tok.low)}>Followers</dt>
          </div>
          <div>
            <dd className={cn('text-[22px] font-bold leading-none tabular-nums', tok.text)}>
              {data?.following_count ?? 0}
            </dd>
            <dt className={cn('mt-1.5 text-xs', tok.low)}>Following</dt>
          </div>
        </dl>

        {/* Connections: a row of its own, so it no longer wraps under the two counts. */}
        <Link
          to="/connections"
          className={cn('mt-5 flex items-center gap-2 text-xs transition-colors hover:text-gold-soft', tok.mid)}
        >
          <Users size={14} className="shrink-0 text-gold" aria-hidden="true" />
          <span>{t('connections')}</span>
          <strong className="mono-data ms-auto text-sm font-bold text-gold-soft">
            {connections.data ? connections.data.accepted.length : '–'}
          </strong>
        </Link>
      </div>

      {/* Pinned modules */}
      <div className={cn('rounded-[20px] p-4', tok.card)}>
        <p className="mono-data mb-3 text-[0.7rem] font-bold uppercase tracking-[0.15em] text-gold-soft">
          {t('pinned')}
        </p>
        <ul className="space-y-0.5">
          {PINNED.map((key) => {
            const Icon = MODULE_ICONS[key] ?? Users
            return (
              <li key={key}>
                <Link
                  to={ROUTE_FOR[key]}
                  aria-label={key === 'messages' && unread > 0 ? `${t(key)}, ${unread} unread` : undefined}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-[12px] px-2 py-2 text-[0.85rem] font-semibold',
                    tok.mid,
                    tok.hoverBg,
                  )}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] bg-gold/15 text-gold-soft">
                    <Icon size={14} aria-hidden="true" />
                  </span>
                  {t(key)}
                  <span className="ms-auto flex items-center gap-2">
                    {key === 'messages' && <UnreadBadge count={unread} />}
                    <ChevronRight size={13} className={tok.low} aria-hidden="true" />
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Circles quick-switch */}
      <div className={cn('rounded-[20px] p-4', tok.card)}>
        <p className="mono-data mb-3 text-[0.7rem] font-bold uppercase tracking-[0.15em] text-gold-soft">
          {t('circles')}
        </p>
        {(circles.data ?? []).length === 0 ? (
          <Link to="/circles" className={cn('flex items-center gap-1 text-xs leading-relaxed hover:text-gold-soft', tok.low)}>
            No circles yet — create one
            <ChevronRight size={13} className="shrink-0" aria-hidden="true" />
          </Link>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {(circles.data ?? []).slice(0, 6).map((circle, index) => (
              <Link
                key={circle.id}
                to={`/circles?open=${circle.id}`}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[0.75rem] font-semibold',
                  index === 0
                    ? cn('bg-gold/15 ring-1 ring-gold/40', tok.text)
                    : cn(tok.subtleBg, tok.mid, tok.hoverBg),
                )}
              >
                {circle.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Badges. Earned, not decorative: each one is shown only when the
          account actually holds it, so an empty row is the honest state for a
          new member rather than three grey trophies. */}
      {(user?.kyc_verified || (data?.followers_count ?? 0) > 0) && (
        <div className={cn('flex items-center justify-around rounded-[20px] p-4', tok.card)}>
          {[
            { icon: Medal, label: 'Member', show: true },
            { icon: Award, label: 'Verified', show: Boolean(user?.kyc_verified) },
            { icon: Crown, label: 'Pool contributor', show: (data?.followers_count ?? 0) >= 10 },
          ]
            .filter((badge) => badge.show)
            .map((badge) => (
              <span
                key={badge.label}
                title={badge.label}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-gold/10 text-gold ring-1 ring-gold/30"
              >
                <badge.icon size={15} aria-hidden="true" />
              </span>
            ))}
        </div>
      )}
    </div>
  )
}
