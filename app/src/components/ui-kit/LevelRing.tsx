import { cn } from '@/lib/utils'

export interface LevelRingProps {
  /** Current level (1-based) */
  level: number
  /** Total rings to render */
  max?: number
  size?: number
  className?: string
  label?: string
}

/** LevelRing — concentric ring visual for family levels / closeness ranking. */
export default function LevelRing({ level, max = 5, size = 64, className, label }: LevelRingProps) {
  const rings = Array.from({ length: max }, (_, i) => i + 1)
  return (
    <span className={cn('relative inline-flex items-center justify-center', className)} style={{ width: size, height: size }} role="img" aria-label={label ?? `Level ${level} of ${max}`}>
      {rings.map((r) => {
        const d = size - (r - 1) * (size / max) * 0.92
        const active = r <= level
        return (
          <span
            key={r}
            className="absolute rounded-full border"
            style={{
              width: d,
              height: d,
              borderColor: active ? 'rgba(217,166,72,0.85)' : 'rgba(255,255,255,0.14)',
              boxShadow: active ? '0 0 8px rgba(217,166,72,0.25)' : undefined,
            }}
          />
        )
      })}
      <span className="mono-data text-gold-soft" style={{ fontSize: size * 0.22 }}>
        L{level}
      </span>
    </span>
  )
}
