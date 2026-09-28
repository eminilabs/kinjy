import { forwardRef } from 'react'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface ArcButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'gold' | 'ghost' | 'indigo'
  size?: 'sm' | 'md' | 'lg'
  href?: string
}

const variants = {
  gold: 'bg-gradient-to-br from-gold-soft to-gold text-ink font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] hover:brightness-110',
  ghost: 'cloud-glass text-text-hi font-semibold hover:border-gold/40 hover:text-gold-soft',
  indigo: 'bg-indigo text-text-hi font-semibold hover:bg-indigo-deep',
}

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-[0.95rem]',
  lg: 'px-8 py-4 text-base',
}

/**
 * ArcButton — Kinjy's primary button. Gold solid / ghost glass / indigo variants.
 */
const ArcButton = forwardRef<HTMLButtonElement, ArcButtonProps>(
  ({ className, variant = 'gold', size = 'md', children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-full select-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...(props as object)}
    >
      {children}
    </button>
  ),
)
ArcButton.displayName = 'ArcButton'

export default ArcButton
