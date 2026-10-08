import { AlertTriangle, ShieldCheck, ShieldQuestion } from 'lucide-react'
import { cn } from '@/lib/utils'
import { STATUS_LABEL } from './layout'

/**
 * A person's corroboration state, as an icon with its meaning attached.
 * Colour alone is not a state: the label is what a screen reader and a hover reach.
 */
export default function StatusIcon({
  status,
  size = 14,
  className,
}: {
  status?: string
  size?: number
  className?: string
}) {
  const label = STATUS_LABEL[status ?? 'pending'] ?? STATUS_LABEL.pending
  const Icon = status === 'verified' ? ShieldCheck : status === 'disputed' ? AlertTriangle : ShieldQuestion
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0',
        status === 'verified' ? 'text-success' : status === 'disputed' ? 'text-warning' : 'text-text-low',
        className,
      )}
    >
      <Icon size={size} aria-hidden="true" />
    </span>
  )
}
