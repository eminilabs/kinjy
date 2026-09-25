import { forwardRef } from 'react'
import type { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface CloudCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Add hover lift + gold border sheen */
  hoverable?: boolean
  /** Gold accent ring */
  gold?: boolean
}

const CloudCard = forwardRef<HTMLDivElement, CloudCardProps>(
  ({ className, hoverable = false, gold = false, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'cloud-card',
        hoverable && 'cloud-card-hover',
        gold && 'shadow-gold-ring',
        className,
      )}
      {...props}
    />
  ),
)
CloudCard.displayName = 'CloudCard'

export default CloudCard
