import { CircleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * A problem, in the page's normal text colour with a red mark beside it. The
 * theme's red is 4.3:1 on the dark card — under the 4.5:1 small text needs — and
 * a message someone has to act on is the last text that may be hard to read.
 */
export default function ErrorLine({ text, className }: { text: string; className?: string }) {
  return (
    <p role="alert" className={cn('flex items-start gap-1.5 text-sm text-text-hi', className)}>
      <CircleAlert size={14} className="mt-0.5 shrink-0 text-danger" aria-hidden="true" />
      {text}
    </p>
  )
}
