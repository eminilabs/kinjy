import { Link } from 'react-router'
import { Award, Crown, Medal, Users } from 'lucide-react'
import { LevelRing, VerifiedBadge } from '@/components/ui-kit'
import { MODULE_ICONS } from '@/components/appdemo/Chrome'
import { ROUTE_FOR } from './navigation'
import type { ChromeKey } from '@/components/appdemo/theme'
import { useAppTheme } from '@/components/appdemo/theme'
import { useEffect } from 'react'
import { useApi } from '@/hooks/useApi'
import { onChange } from '@/lib/live'
import { useAuth } from '@/hooks/useAuth'
import { kaluta, type Profile } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * The profile mini-card from the designed left rail: centred avatar, name with
 * its verification badge, handle and place, then the closeness ring.
 */
/** The shortcuts /app pins. Destinations, not feed modes. */
const PINNED: ChromeKey[] = ['home', 'create', 'familyTree', 'messages']

export default function ProfileCard() {
  const { user } = useAuth()
  const { t, tok } = useAppTheme()
  // Real circles, not the demo's four fixed names: this rail is a switch into
  // the member's own audiences, and inventing "Business" for someone who has
  // no such circle would make it a decoration.
  const circles = useApi(() => kaluta.circles.list(), [])
  const profile = useApi<Profile>(() => kaluta.account.profile(), [])

  // Following someone changes a number on this card, so listen rather than
  // leave it stale until the next navigation.
  useEffect(() => onChange('profile', profile.reload), [profile.reload])
  const data = profile.data

  const initials = (user?.display_name ?? '?')
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  const place = [data?.city, data?.country].filter(Boolean).join(', ')

  return (
    <div className="space-y-3">
      <div className={cn('rounded-card-lg p-4 text-center', tok.card)}>
        {data?.avatar_url ? (
          <img
            src={data.avatar_url}
            alt=""
            className="mx-auto h-16 w-16 rounded-full object-cover ring-2 ring-gold/50"
          />
        ) : (
          <span
            aria-hidden="true"
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-gold-soft to-gold text-lg font-bold text-ink ring-2 ring-gold/50"
          >
            {initials}
          </span>
        )}

        <p className={cn('mt-2.5 flex items-center justify-center gap-1.5 text-sm font-bold', tok.text)}>
          {user?.display_name}
          {user?.kyc_verified && <VerifiedBadge size={15} />}
        </p>
        <p className={cn('text-xs', tok.low)}>
          @{user?.handle}
          {place && ` · ${place}`}
        </p>

        <div className="mt-3 flex justify-center">
          <LevelRing level={2} max={5} size={52} label="Level 2 closeness" />
        </div>

        <dl className={cn('mt-3 flex justify-center gap-5 border-t pt-3', tok.divider, 'border-t-current/10')}>
          <div>
            <dt className={cn('text-[0.65rem]', tok.low)}>Followers</dt>
            <dd className="mono-data text-sm font-semibold text-gold-soft">
              {data?.followers_count ?? 0}
            </dd>
          </div>
          <div>
            <dt className={cn('text-[0.65rem]', tok.low)}>Following</dt>
            <dd className="mono-data text-sm font-semibold text-gold-soft">
              {data?.following_count ?? 0}
            </dd>
          </div>
        </dl>
      </div>

      {/* Pinned modules */}
      <div className={cn('rounded-card-lg p-3.5', tok.card)}>
        <p className={cn('mb-2 text-[0.65rem] font-bold uppercase tracking-wider', tok.low)}>
          {t('pinned')}
        </p>
        <ul className="space-y-1">
          {PINNED.map((key) => {
            const Icon = MODULE_ICONS[key] ?? Users
            return (
              <li key={key}>
                <Link
                  to={ROUTE_FOR[key]}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors',
                    tok.mid,
                    tok.hoverBg,
                  )}
                >
                  <Icon size={12} className="text-gold" aria-hidden="true" />
                  {t(key)}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* Circles quick-switch */}
      <div className={cn('rounded-card-lg p-3.5', tok.card)}>
        <p className={cn('mb-2 text-[0.65rem] font-bold uppercase tracking-wider', tok.low)}>
          {t('circles')}
        </p>
        {(circles.data ?? []).length === 0 ? (
          <Link to="/circles" className={cn('text-[0.7rem] hover:text-gold-soft', tok.low)}>
            No circles yet — create one
          </Link>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {(circles.data ?? []).slice(0, 6).map((circle, index) => (
              <Link
                key={circle.id}
                to={`/circles?open=${circle.id}`}
                className={cn(
                  'rounded-full px-2.5 py-1 text-[0.68rem] font-semibold transition-colors',
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
        <div className={cn('flex items-center justify-around rounded-card-lg p-3', tok.card)}>
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
