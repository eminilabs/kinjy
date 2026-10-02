import type { ReactNode } from 'react'
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
