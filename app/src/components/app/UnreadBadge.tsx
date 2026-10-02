/**
 * The count on the Messages entries. Hidden at zero; capped at 99+ so a long
 * absence cannot stretch the chip. The number is spoken through the entry's own
 * label (see the callers), so this is decoration for screen readers.
 */
export default function UnreadBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null
  return (
    <span
      aria-hidden="true"
      data-unread-badge
      className={
        'inline-flex min-w-[1.1rem] items-center justify-center rounded-full bg-gold px-1 text-[0.6rem] font-bold leading-[1.1rem] text-ink ' +
        (className ?? '')
      }
    >
      {count > 99 ? '99+' : count}
    </span>
  )
}
