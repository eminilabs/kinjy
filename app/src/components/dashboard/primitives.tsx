import type { ReactNode } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string
  subtitle?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('cloud-card p-6', className)}>
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text-hi">{title}</h2>
          {subtitle && <p className="caption mt-1">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  )
}

export function Stat({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: 'default' | 'gold' | 'muted'
}) {
  return (
    <div>
      <p className="caption">{label}</p>
      <p
        className={cn(
          'mono-data mt-1 text-2xl',
          tone === 'gold' && 'text-gold-soft',
          tone === 'muted' && 'text-text-mid',
          tone === 'default' && 'text-text-hi',
        )}
      >
        {value}
      </p>
      {hint && <p className="caption mt-1">{hint}</p>}
    </div>
  )
}

/** One consistent place for the three states every panel can be in. */
export function PanelState({
  loading,
  error,
  empty,
  emptyLabel = 'Nothing here yet.',
  children,
}: {
  loading: boolean
  error: string | null
  empty?: boolean
  emptyLabel?: string
  children: ReactNode
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-text-low" role="status">
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
        <span className="text-sm">Loading…</span>
      </div>
    )
  }
  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2.5 rounded-card-sm border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
      >
        <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{error}</span>
      </div>
    )
  }
  if (empty) return <p className="py-4 text-sm text-text-low">{emptyLabel}</p>
  return <>{children}</>
}

export function Badge({
  children,
  tone = 'neutral',
}: {
  children: ReactNode
  tone?: 'neutral' | 'good' | 'warn' | 'bad'
}) {
  return (
    <span
      className={cn(
        // A badge is a pill, and a pill is one line. Left to wrap, "Action
        // required" broke across two lines and rendered as a filled rectangle
        // — a coloured block sitting in the corner of a panel rather than a
        // label. shrink-0 keeps it from being squeezed into wrapping by a
        // flex row that is short on width.
        'inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold',
        tone === 'neutral' && 'bg-white/8 text-text-mid',
        tone === 'good' && 'bg-emerald-400/15 text-emerald-200',
        tone === 'warn' && 'bg-amber-400/15 text-amber-200',
        tone === 'bad' && 'bg-red-400/15 text-red-200',
      )}
    >
      {children}
    </span>
  )
}

export const inputClass =
  'w-full rounded-card-sm border border-white/10 bg-ink-2/70 px-4 py-2.5 text-sm text-text-hi placeholder:text-text-low focus:border-gold/50 focus:outline-none transition-colors'
