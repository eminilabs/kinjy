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
 * The same, for a room rather than a person: two figures instead of one.
 *
 * A group with no photo used to borrow a member's face, and then - once it
 * stopped doing that - showed the single silhouette above, which says "one
 * person" about a room of eighteen hundred. Same palette, so a list of
 * conversations reads as one set of avatars.
 */
function GroupSilhouette({ size }: { size: number }) {
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
      {/* The one behind, set back and a little smaller, so two heads read as
          two people rather than as one person drawn twice. */}
      <circle cx="27.5" cy="16" r="5.5" fill="#F0F2F5" opacity="0.72" />
      <path d="M18 34c0-6 4.3-9.6 9.5-9.6S37 28 37 34z" fill="#F0F2F5" opacity="0.72" />
      <circle cx="15.5" cy="17" r="6.8" fill="#F0F2F5" />
      <path d="M3.5 36c0-7.2 5.4-12 12-12s12 4.8 12 12z" fill="#F0F2F5" />
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
  group = false,
}: {
  /** Without a handle there is nowhere to go, so it renders as a plain badge. */
  handle?: string | null
  displayName?: string | null
  avatarUrl?: string | null
  size?: number
  ring?: boolean
  className?: string
  /** A room rather than a person, which changes only what is drawn with no photo. */
  group?: boolean
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
      ) : group ? (
        <GroupSilhouette size={size} />
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
      className="shrink-0 rounded-full hover:opacity-85"
    >
      {inner}
    </Link>
  )
}
