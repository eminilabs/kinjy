import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LedgerRowProps {
  id: string
  label: string
  amount: string
  reconciled?: boolean
  timestamp?: string
  className?: string
}

/** LedgerRow — mono-font immutable ledger data row with reconciled state. */
export default function LedgerRow({ id, label, amount, reconciled = false, timestamp, className }: LedgerRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 rounded-card-sm border border-white/8 bg-white/[0.03] px-4 py-3',
        className,
      )}
    >
      <div className="min-w-0">
        <p className="mono-data text-text-low truncate">#{id}</p>
        <p className="text-sm text-text-hi truncate">{label}</p>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        {timestamp && <span className="mono-data text-text-low hidden sm:inline">{timestamp}</span>}
        <span className="mono-data text-gold-soft">{amount}</span>
        {reconciled ? (
          <span className="inline-flex items-center gap-1 text-success text-xs font-semibold">
            <Check size={14} aria-hidden="true" /> reconciled
          </span>
        ) : (
          <span className="text-warning text-xs font-semibold">pending</span>
        )}
      </div>
    </div>
  )
}
