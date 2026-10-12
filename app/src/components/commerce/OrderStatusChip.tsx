import { cn } from '@/lib/utils'
import { statusInfo, TONE_CLASS } from '@/components/commerce/orderStatus'

export default function OrderStatusChip({ status, className }: { status: string; className?: string }) {
  const info = statusInfo(status)
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-semibold',
        TONE_CLASS[info.tone],
        className,
      )}
    >
      {info.label}
    </span>
  )
}
