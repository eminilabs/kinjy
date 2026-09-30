import { useState } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'

/**
 * The generic person shown when a member has no photo: the same neutral
 * silhouette for everyone, as on most social networks. Initials were tried
 * first; a letter reads as a design choice the member made, and two members
 * called "Patrice" looked like the same person.
 */
function Silhouette({ size }: { size: number }) {
  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden="true"
      className="block"
      style={{ width: size, height: size }}
    >
      <rect width="40" height="40" fill="#C9CCD1" />
      <circle cx="20" cy="15.5" r="7.5" fill="#F0F2F5" />
      <path d="M5.5 40c0-8.6 6.5-14.5 14.5-14.5S34.5 31.4 34.5 40z" fill="#F0F2F5" />
    </svg>
  )
}

/**
 * The one avatar in the app.
 *
 * Every surface used to render its own initials block, so an avatar was
 * clickable in some places and inert in others. One component means one look
 * and one behaviour: an avatar always leads to that member's profile, and a
 * missing or broken photo always falls back to the same silhouette.
 */
export default function MemberAvatar({
  handle,
  displayName,
  avatarUrl,
  size = 36,
  ring = false,
  className,
}: {
  /** Without a handle there is nowhere to go, so it renders as a plain badge. */
  handle?: string | null
  displayName?: string | null
  avatarUrl?: string | null
  size?: number
  ring?: boolean
  className?: string
}) {
  const name = displayName?.trim() || handle || 'Member'
  // The URL that failed to load, so a new URL (a changed photo) is tried again.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null)
  const showPhoto = Boolean(avatarUrl) && avatarUrl !== brokenUrl

  const inner = (
    <span
      className={cn(
        'block shrink-0 overflow-hidden rounded-full',
        ring && 'ring-2 ring-gold/50',
        className,
      )}
      style={{ width: size, height: size }}
    >
      {showPhoto ? (
        <img
          src={avatarUrl ?? undefined}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setBrokenUrl(avatarUrl ?? null)}
          className="h-full w-full object-cover"
        />
      ) : (
        <Silhouette size={size} />
      )}
    </span>
  )

  if (!handle) return inner

  return (
    <Link
      to={`/u/${handle}`}
      aria-label={`View ${name}'s profile`}
      title={name}
      className="shrink-0 hover:opacity-85"
      className="shrink-0 rounded-full transition-opacity hover:opacity-85"
    >
      {inner}
    </Link>
  )
}
