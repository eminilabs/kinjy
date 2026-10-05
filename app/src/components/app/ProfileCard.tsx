import { Link } from 'react-router'
import { Award, Crown, MapPin, Medal, Users } from 'lucide-react'
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
import { useMyProfile } from '@/hooks/useMyProfile'
import { countryName } from '@/lib/profileOptions'
import { cn } from '@/lib/utils'

/**
 * The profile mini-card from the designed left rail: centred avatar, name with
 * its verification badge, handle, and place.
 */
/** The shortcuts /app pins. Destinations, not feed modes — and only open ones. */
const PINNED: ChromeKey[] = (['home', 'create', 'familyTree', 'messages'] as ChromeKey[]).filter(
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
        <p className={cn('mono-data mt-1 truncate text-xs', tok.mid)}>@{user?.handle}</p>
        {place && (
          <p className={cn('mt-1.5 flex items-center justify-center gap-1 text-[0.72rem]', tok.low)}>
            <MapPin size={11} aria-hidden="true" />
            {place}
          </p>
        )}

        <dl className="mt-4 grid grid-cols-2 divide-x divide-[var(--cloud-border)] border-t border-[var(--cloud-border)] pt-4">
          <div>
            <dd className={cn('text-2xl font-bold leading-none tracking-[-0.03em] tabular-nums', tok.text)}>
              {data?.followers_count ?? 0}
            </dd>
            <dt className={cn('mt-1.5 text-[0.7rem]', tok.low)}>Followers</dt>
          </div>
          <div>
            <dd className={cn('text-2xl font-bold leading-none tracking-[-0.03em] tabular-nums', tok.text)}>
              {data?.following_count ?? 0}
            </dd>
            <dt className={cn('mt-1.5 text-[0.7rem]', tok.low)}>Following</dt>
          </div>
        </dl>
      </div>

      {/* Pinned modules */}
      <div className={cn('rounded-[20px] p-4', tok.card)}>
        <p className="mono-data mb-3 text-[0.65rem] uppercase tracking-[0.14em] text-gold-soft">
          {t('pinned')}
        </p>
        <ul className="space-y-0.5">
          {PINNED.map((key) => {
            const Icon = MODULE_ICONS[key] ?? Users
            return (
              <li key={key}>
                <Link
                  to={ROUTE_FOR[key]}
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
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Circles quick-switch */}
      <div className={cn('rounded-[20px] p-4', tok.card)}>
        <p className="mono-data mb-3 text-[0.65rem] uppercase tracking-[0.14em] text-gold-soft">
          {t('circles')}
        </p>
        {(circles.data ?? []).length === 0 ? (
          <Link to="/circles" className={cn('text-[0.8rem] hover:text-gold-soft', tok.low)}>
            No circles yet — create one
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
                    ? 'bg-gold/15 text-gold-soft ring-1 ring-gold/40'
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
