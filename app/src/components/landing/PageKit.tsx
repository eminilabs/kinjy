import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** The landing's mono eyebrow. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('kl-mono text-xs uppercase tracking-[.14em] text-[var(--kl-gold-deep)]', className)}>{children}</p>
}

/** A soft stage panel with two glows, as on the landing's feature rows. */
export function Stage({
  children,
  className,
  glows = ['var(--kl-sky)', '#D9A648'],
}: {
  children: ReactNode
  className?: string
  glows?: [string, string]
}) {
  return (
    <div
      className={cn('relative overflow-hidden rounded-[20px]', className)}
      style={{ background: 'linear-gradient(160deg, var(--kl-stage-a), var(--kl-stage-b))' }}
    >
      <div aria-hidden="true" className="absolute -right-16 -top-20 h-[280px] w-[280px] rounded-full opacity-35 blur-[90px]" style={{ background: glows[0] }} />
      <div aria-hidden="true" className="absolute -bottom-24 -left-16 h-[260px] w-[260px] rounded-full opacity-30 blur-[90px]" style={{ background: glows[1] }} />
      <div className="relative">{children}</div>
    </div>
  )
}

/** The closing panel every public page ends on: paper stage, glows, huge serif line. */
export function ClosingStage({
  eyebrow,
  title,
  children,
  glow = 'var(--kl-sky)',
}: {
  eyebrow: string
  title: ReactNode
  children?: ReactNode
  glow?: string
}) {
  return (
    <section className="mx-auto max-w-[1320px] px-4 pt-[clamp(40px,6vw,80px)]" aria-label="Call to action">
      <div
        className="relative overflow-hidden rounded-[20px] px-[clamp(24px,6vw,80px)] py-[clamp(90px,10vw,130px)] text-center"
        style={{ background: 'linear-gradient(180deg, var(--kl-stage-a), var(--kl-stage-b))' }}
      >
        <div aria-hidden="true" className="kl-sheen absolute -left-16 -top-20 h-[300px] w-[300px] rounded-full opacity-40 blur-[90px]" />
        <div aria-hidden="true" className="absolute -bottom-24 -right-10 h-[300px] w-[300px] rounded-full opacity-35 blur-[90px]" style={{ background: glow }} />
        <Eyebrow className="relative">{eyebrow}</Eyebrow>
        <h2
          className="kl-serif relative mx-auto mt-5 max-w-[1000px] text-balance font-semibold"
          style={{ fontSize: 'clamp(44px, 7.4vw, 104px)', lineHeight: 0.94, letterSpacing: '-.02em' }}
        >
          {title}
        </h2>
        <div className="relative">{children}</div>
      </div>
    </section>
  )
}

/** A pill toggle in the landing's look: gold when on, a paper outline when off. */
export function Chip({
  label,
  active = false,
  onClick,
  icon,
  className,
}: {
  label: string
  active?: boolean
  onClick?: () => void
  icon?: ReactNode
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition-colors',
        active ? 'kl-sheen' : 'border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] text-[var(--kl-mid)] hover:border-[var(--kl-gold)] hover:text-[var(--kl-ink)]',
        className,
      )}
    >
      {icon}
      {label}
    </button>
  )
}

/** The landing's button, with ArcButton's props so a page can swap one for the other. */
export function KlButton({
  variant = 'gold',
  size = 'md',
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'gold' | 'ghost' | 'indigo'; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center justify-center gap-2 font-bold transition disabled:cursor-default disabled:opacity-60',
        size === 'sm' ? 'rounded-full px-4 py-2 text-sm' : size === 'lg' ? 'rounded-[20px] px-7 py-4 text-[17px]' : 'rounded-[16px] px-6 py-3 text-[15px]',
        variant === 'gold' && 'kl-sheen shadow-[0_14px_30px_-14px_rgba(169,118,28,.55)] enabled:hover:-translate-y-0.5',
        variant === 'ghost' && 'border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] font-semibold enabled:hover:border-[var(--kl-gold)]',
        variant === 'indigo' && 'bg-[var(--kl-indigo)] font-semibold text-white enabled:hover:brightness-110',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
