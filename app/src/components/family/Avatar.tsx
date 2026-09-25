import { cn } from '@/lib/utils'

/**
 * Avatar — circular crop from the avatars-set.jpg 4×3 contact sheet.
 * cell: [col, row] zero-based into the grid.
 */
export default function Avatar({
  cell,
  size = 40,
  className,
  name,
}: {
  cell: [number, number]
  size?: number
  className?: string
  name: string
}) {
  const [col, row] = cell
  return (
    <span
      role="img"
      aria-label={name}
      className={cn('inline-block rounded-full bg-ink-3 bg-cover ring-1 ring-gold/40', className)}
      style={{
        width: size,
        height: size,
        backgroundImage: 'url(/avatars-set.jpg)',
        backgroundSize: '400% 300%',
        backgroundPosition: `${(col / 3) * 100}% ${(row / 2) * 100}%`,
      }}
    />
  )
}
