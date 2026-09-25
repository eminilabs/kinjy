import { cn } from '@/lib/utils'

export type ProvenanceKind = 'original' | 'edited' | 'ai-assisted' | 'ai-generated' | 'verified'

const config: Record<ProvenanceKind, { label: string; icon: string; classes: string }> = {
  original: { label: 'Original Upload', icon: 'prov-original', classes: 'text-text-mid border-white/15 bg-white/5' },
  edited: { label: 'Edited', icon: 'prov-edited', classes: 'text-info border-info/30 bg-info/10' },
  'ai-assisted': { label: 'AI Assisted', icon: 'prov-ai-assist', classes: 'text-sky border-sky/30 bg-sky/10' },
  'ai-generated': { label: 'AI Generated', icon: 'prov-ai-gen', classes: 'text-[#B79CFF] border-[#B79CFF]/30 bg-[#B79CFF]/10' },
  verified: { label: 'Verified Source', icon: 'prov-verified', classes: 'text-success border-success/30 bg-success/10' },
}

/** ProvenanceTag — tiny labeled chip attached to media cards declaring content origin. */
export default function ProvenanceTag({ kind, className }: { kind: ProvenanceKind; className?: string }) {
  const c = config[kind]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.7rem] font-semibold tracking-wide',
        c.classes,
        className,
      )}
    >
      <svg width={12} height={12} aria-hidden="true">
        <use href={`/icon-provenance.svg#${c.icon}`} />
      </svg>
      {c.label}
    </span>
  )
}
