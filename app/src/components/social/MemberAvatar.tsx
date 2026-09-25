import { Link } from 'react-router'
import { cn } from '@/lib/utils'

/**
 * The one avatar in the app.
 *
 * Every surface used to render its own initials block, so an avatar was
 * clickable in some places and inert in others — and the colour of "S" differed
 * between the feed and the suggestions rail. One component means one look and
 * one behaviour: an avatar always leads to that member's profile.
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
  const name = displayName?.trim() || handle || '?'
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  // A stable hue per member: the same person keeps the same colour everywhere,
  // which makes a thread scannable without reading a single name.
  const seed = (handle ?? name).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const hue = seed % 360

  const inner = avatarUrl ? (
    <img
      src={avatarUrl}
      alt=""
      width={size}
      height={size}
      className={cn('shrink-0 rounded-full object-cover', ring && 'ring-2 ring-gold/50', className)}
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-bold text-white',
        ring && 'ring-2 ring-gold/50',
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(10, size * 0.36),
        background: `linear-gradient(135deg, hsl(${hue} 55% 45%), hsl(${(hue + 40) % 360} 60% 35%))`,
      }}
    >
      {initials}
    </span>
  )

  if (!handle) return inner

  return (
    <Link
      to={`/u/${handle}`}
      aria-label={`View ${name}'s profile`}
      title={name}
      className="shrink-0 transition-opacity hover:opacity-85"
    >
      {inner}
    </Link>
  )
}
