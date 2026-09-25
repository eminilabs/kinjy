import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'sky' | 'gold' | 'neutral'

const TONE_STYLES: Record<Tone, string> = {
  success: 'border-success/35 bg-success/10 text-success',
  warning: 'border-warning/40 bg-warning/10 text-warning',
  danger: 'border-danger/40 bg-danger/10 text-danger',
  info: 'border-info/35 bg-info/10 text-info',
  sky: 'border-sky/35 bg-sky/10 text-sky',
  gold: 'border-gold/40 bg-gold/10 text-gold-soft',
  neutral: 'border-white/12 bg-white/[0.04] text-text-mid',
}

export const TONE_DOT: Record<Tone, string> = {
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
  sky: 'bg-sky',
  gold: 'bg-gold',
  neutral: 'bg-text-low',
}

/** Chip — mono status chip used across the engineering console. */
export function Chip({
  tone = 'neutral',
  children,
  className,
}: {
  tone?: Tone
  children: ReactNode
  className?: string
}) {
  return (
    <span
      className={cn(
        'mono-data inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.65rem] uppercase tracking-[0.12em]',
        TONE_STYLES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Dot — tiny status light. */
export function Dot({ tone = 'neutral', className }: { tone?: Tone; className?: string }) {
  return <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', TONE_DOT[tone], className)} />
}

/** SubSection — one panel of the Platform Quality console, revealed on scroll. */
export function SubSection({
  id,
  eyebrow,
  title,
  blurb,
  children,
  className,
}: {
  id: string
  eyebrow: string
  title: ReactNode
  blurb: string
  children: ReactNode
  className?: string
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      aria-labelledby={`${id}-heading`}
      className={cn('mt-14 first:mt-0', className)}
    >
      <p className="eyebrow text-gold">{eyebrow}</p>
      <h3 id={`${id}-heading`} className="h3 mt-2 text-xl">
        {title}
      </h3>
      <p className="mt-2 max-w-2xl text-sm text-text-mid">{blurb}</p>
      <div className="mt-6">{children}</div>
    </motion.section>
  )
}
