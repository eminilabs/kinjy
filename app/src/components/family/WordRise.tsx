/**
 * WordRise — word-split headline used on paper/heritage heroes (design §3).
 * `rise`, `stagger` and `delay` are still accepted so callers need not change;
 * the words no longer animate in.
 */
export default function WordRise({
  text,
  className,
  as: Tag = 'span',
}: {
  text: string
  className?: string
  rise?: number
  stagger?: number
  delay?: number
  as?: 'span' | 'h1' | 'h2'
}) {
  const words = text.split(' ')
  return (
    <Tag className={className} aria-label={text}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] -mb-[0.08em] align-bottom pe-[0.24em] last:pe-0" aria-hidden="true">
          <span className="inline-block">
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </span>
        </span>
      ))}
    </Tag>
  )
}
