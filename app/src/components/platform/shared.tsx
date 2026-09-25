import { memo, useRef } from 'react'
import type { ReactNode } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { cn } from '@/lib/utils'

export const CLOUD_EASE = [0.22, 1, 0.36, 1] as [number, number, number, number]
export const SNAP_EASE = [0.34, 1.56, 0.64, 1] as [number, number, number, number]
export const LINE_EASE = [0.65, 0, 0.35, 1] as [number, number, number, number]

/** Module glyph from the icon-modules.svg sprite (thin 1.5px gold-line style). */
export function ModuleGlyph({ id, size = 24, className }: { id: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} aria-hidden="true" className={cn('text-gold', className)}>
      <use href={`/icon-modules.svg#${id}`} />
    </svg>
  )
}

/** Algorithm glyph from the icon-algorithms.svg sprite. */
export function AlgoGlyph({ id, size = 24, className }: { id: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} aria-hidden="true" className={cn('text-gold', className)}>
      <use href={`/icon-algorithms.svg#${id}`} />
    </svg>
  )
}

/**
 * Avatar cropped from the avatars-set.jpg contact sheet (4 cols × 3 rows).
 */
export function Avatar({ index, size = 40, className, name }: { index: number; size?: number; className?: string; name?: string }) {
  const col = index % 4
  const row = Math.floor(index / 4) % 3
  return (
    <span
      role="img"
      aria-label={name ?? 'Avatar'}
      className={cn('inline-block shrink-0 rounded-full border border-white/15 bg-ink-3', className)}
      style={{
        width: size,
        height: size,
        backgroundImage: 'url(/avatars-set.jpg)',
        backgroundSize: '400% 300%',
        backgroundPosition: `${(col / 3) * 100}% ${(row / 2) * 100}%`,
      }}
    />
  )
}

/** Small conic-gradient breathing orb (assistant motif). */
export const OrbDot = memo(function OrbDot({ size = 24, delay = 0, className }: { size?: number; delay?: number; className?: string }) {
  const reduced = useReducedMotion()
  return (
    <motion.span
      aria-hidden="true"
      className={cn('inline-block rounded-full', className)}
      style={{
        width: size,
        height: size,
        background: 'var(--grad-orb)',
        filter: 'blur(0.5px)',
        boxShadow: '0 0 14px 2px rgba(143,184,232,0.35), 0 0 26px 4px rgba(74,82,224,0.25)',
      }}
      animate={reduced ? undefined : { scale: [1, 1.06, 1] }}
      transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay }}
    />
  )
})

/** True while the element is ≥40% visible — gates idle micro-animation loops. */
export function useActiveInView<T extends HTMLElement>(amount = 0.4) {
  const ref = useRef<T>(null)
  const active = useInView(ref, { amount })
  return { ref, active }
}

/** Word-level kinetic split for headlines (stagger up, 0.08s). */
export function KineticWords({ text, className, delay = 0, as: Tag = 'span' }: { text: string; className?: string; delay?: number; as?: 'span' | 'h1' | 'h2' }) {
  const reduced = useReducedMotion()
  const words = text.split(' ')
  return (
    <Tag className={className}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="inline-block overflow-hidden pb-[0.08em] -mb-[0.08em] align-bottom pe-[0.24em] last:pe-0">
          <motion.span
            className="inline-block"
            initial={reduced ? false : { y: '110%' }}
            animate={{ y: 0 }}
            transition={{ duration: 0.8, ease: CLOUD_EASE, delay: delay + i * 0.08 }}
          >
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </Tag>
  )
}

/** Standard scroll reveal wrapper (slide + fade, 500ms cloud-ease). */
export function Reveal({
  children,
  from = 0,
  delay = 0,
  className,
  amount = 0.4,
}: {
  children: ReactNode
  from?: number
  delay?: number
  className?: string
  amount?: number
}) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, x: from }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.5, ease: CLOUD_EASE, delay }}
    >
      {children}
    </motion.div>
  )
}

/** Hairline gold arc divider between module blocks. */
export function ArcDivider({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('mx-auto w-full max-w-3xl', className)}>
      <svg viewBox="0 0 600 28" fill="none" className="w-full">
        <path d="M8 24 Q300 -8 592 24" stroke="url(#arcdiv-grad)" strokeWidth="1" opacity="0.4" />
        <defs>
          <linearGradient id="arcdiv-grad" x1="0" x2="600" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F0C878" stopOpacity="0" />
            <stop offset="0.5" stopColor="#D9A648" />
            <stop offset="1" stopColor="#8FB8E8" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  )
}

// (AssistantOrbChip removed — the global GlobalAssistant orb in Layout.tsx is
// the single assistant dock across all marketing pages.)
