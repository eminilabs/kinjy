import { cn } from '@/lib/utils'

/**
 * Word-level headline (design §3). Words are set individually so any of them
 * can carry the gold treatment. `delay` is still accepted so callers need not
 * change; the words no longer animate in.
 */
export function KineticWords({
  words,
  className,
  as: Tag = 'h1',
  ariaLabel,
}: {
  words: { text: string; gold?: boolean }[]
  className?: string
  delay?: number
  as?: 'h1' | 'h2' | 'h3'
  ariaLabel: string
}) {
  return (
    <Tag className={className} aria-label={ariaLabel}>
      {/* Padding, not a space character — see components/home/Hero.tsx: a
          trailing " " inside an inline-block is collapsed and the words run
          together. */}
      {words.map((w, i) => (
        <span
          key={`${w.text}-${i}`}
          className="inline-block overflow-hidden pb-1 align-bottom pe-[0.24em] last:pe-0"
        >
          <span className={cn('inline-block', w.gold && 'font-display italic text-gold-grad')}>
            {w.text}
          </span>
        </span>
      ))}
    </Tag>
  )
}
