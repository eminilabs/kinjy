import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { ProvenanceKind } from '@/components/ui-kit'

/** The landing's mono eyebrow. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('kl-mono text-xs uppercase tracking-[.14em] text-[var(--kl-gold-deep)]', className)}>{children}</p>
}

const PROVENANCE: Record<ProvenanceKind, { label: string; icon: string; tone: string }> = {
  original: { label: 'Original', icon: 'prov-original', tone: 'text-[#241F16]' },
  edited: { label: 'Edited', icon: 'prov-edited', tone: 'text-[#2F6BA8]' },
  'ai-assisted': { label: 'AI Assisted', icon: 'prov-ai-assist', tone: 'text-[#4A52E0]' },
  'ai-generated': { label: 'AI Generated', icon: 'prov-ai-gen', tone: 'text-[#7A5BD6]' },
  verified: { label: 'Verified Source', icon: 'prov-verified', tone: 'text-[#2E7D57]' },
}

/**
 * The provenance stamp, as a frosted label resting on the post's media — it
 * keeps the same dark-on-white colours in both themes.
 */
export function Provenance({ kind, className }: { kind: ProvenanceKind; className?: string }) {
  const p = PROVENANCE[kind]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold backdrop-blur',
        p.tone,
        className,
      )}
    >
      <svg width={12} height={12} aria-hidden="true">
        <use href={`/icon-provenance.svg#${p.icon}`} />
      </svg>
      {p.label}
    </span>
  )
}

/** Small gold seal for verified authors. */
export function Seal({ size = 15 }: { size?: number }) {
  return (
    <span
      role="img"
      aria-label="Verified"
      title="Verified"
      className="kl-sheen inline-grid shrink-0 place-items-center rounded-full"
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 20 20" width={size * 0.62} height={size * 0.62} fill="none" aria-hidden="true">
        <path d="M4.5 10.5l3.4 3.4L15.5 6" stroke="#0B0E1D" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  )
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
