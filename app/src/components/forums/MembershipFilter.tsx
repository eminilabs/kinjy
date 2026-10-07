import { cn } from '@/lib/utils'

export type Membership = 'all' | 'mine' | 'others'

const OPTIONS: Array<[Membership, string]> = [
  ['all', 'All'],
  ['mine', 'My communities'],
  ['others', 'Others'],
]

export default function MembershipFilter({
  value,
  onChange,
  counts,
}: {
  value: Membership
  onChange: (value: Membership) => void
  counts: Record<Membership, number>
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Filter forums by membership"
      className="inline-flex max-w-full flex-wrap gap-1 rounded-full border border-white/10 bg-ink-2/60 p-1"
    >
      {OPTIONS.map(([id, label]) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          onClick={() => onChange(id)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold',
            value === id ? 'bg-gold/15 text-gold-soft' : 'text-text-mid hover:text-text-hi',
          )}
        >
          {label}
          <span className={value === id ? 'text-gold-soft/80' : 'text-text-low'}>{counts[id]}</span>
        </button>
      ))}
    </div>
  )
}
