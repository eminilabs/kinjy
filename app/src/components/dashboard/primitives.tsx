import type { ReactNode } from 'react'
import { AlertTriangle, Loader2, type LucideIcon } from 'lucide-react'
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
    <section className={cn('cloud-card p-6 md:p-7', className)}>
      <header className="mb-6 flex items-start justify-between gap-4 border-b border-[var(--cloud-border)] pb-5">
        <div className="min-w-0">
          <h2 className="text-[1.25rem] font-bold tracking-[-0.025em] text-text-hi">{title}</h2>
          {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-text-low">{subtitle}</p>}
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
          'mt-1 text-[28px] font-bold leading-tight tracking-[-0.03em] tabular-nums',
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

const KPI_TONES = {
  gold: 'bg-gold/20 text-gold-soft',
  sky: 'bg-sky/20 text-sky',
  coral: 'bg-coral/20 text-coral',
  emerald: 'bg-emerald-400/20 text-emerald-300',
}

/** A headline number on its own card: what it is, how much, and a short note. */
export function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'sky',
  featured = false,
}: {
  icon: LucideIcon
  label: string
  value: ReactNode
  hint?: ReactNode
  tone?: keyof typeof KPI_TONES
  featured?: boolean
}) {
  return (
    <div className={cn('cloud-card relative overflow-hidden p-4 sm:p-5', featured && '!border-gold/60')}>
      {featured && (
        <span aria-hidden="true" className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gold/20 blur-2xl" />
      )}
      <div className="relative flex items-start justify-between gap-3">
        <p className="mono-data text-[0.68rem] font-bold uppercase tracking-[0.14em] text-text-low">{label}</p>
        <span aria-hidden="true" className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', KPI_TONES[tone])}>
          <Icon size={17} />
        </span>
      </div>
      <p className="relative mt-4 text-[1.6rem] font-bold leading-none sm:text-[2rem] tracking-[-0.035em] tabular-nums text-text-hi">{value}</p>
      {hint && <p className="relative mt-2 text-sm text-text-low">{hint}</p>}
    </div>
  )
}

/** One consistent place for the three states every panel can be in. */
export function PanelState({
  loading,
  error,
  empty,
  emptyLabel = 'Nothing here yet.',
  emptyNode,
  children,
}: {
  loading: boolean
  error: string | null
  empty?: boolean
  emptyLabel?: string
  emptyNode?: ReactNode
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
        className="flex items-start gap-2.5 rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-200"
      >
        <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
        <span>{error}</span>
      </div>
    )
  }
  if (empty) return emptyNode ? <>{emptyNode}</> : <p className="py-4 text-sm text-text-low">{emptyLabel}</p>
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
        tone === 'neutral' && 'bg-text-hi/[0.07] text-text-mid',
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
  'w-full rounded-[14px] border border-transparent bg-text-hi/[0.07] px-4 py-3 text-[0.95rem] text-text-hi placeholder:text-text-low focus:border-gold/60 focus:bg-transparent focus:outline-none focus:ring-2 focus:ring-gold/20'
