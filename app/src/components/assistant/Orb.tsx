import { memo } from 'react'
import { Zap } from 'lucide-react'

export type OrbState = 'idle' | 'listening' | 'thinking' | 'notifying'

export interface OrbProps {
  /** Diameter in px (56 collapsed, 120 page hero, 36 header mini). */
  size?: number
  state?: OrbState
  className?: string
}

/**
 * The Kinjy Assistant orb (design §7.5 / assistant.md B.1):
 * conic #4A52E0 → #8FB8E8 → #F0C878 sphere, inner 60% white-glow blur,
 * 1px white rim, shadow 0 8px 32px rgba(74,82,224,0.45). Static: no motion.
 * States: idle · listening (gold ring) · thinking (gold brightens)
 * · notifying (gold ⚡ badge). The states carry information — busy, hearing
 * you — so each keeps its look; only the movement is gone.
 */
function OrbInner({ size = 56, state = 'idle', className }: OrbProps) {
  const thinking = state === 'thinking'

  return (
    <div className={className} style={{ position: 'relative', width: size, height: size }} aria-hidden="true">
      {/* Listening ring */}
      {state === 'listening' && (
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid rgba(240,200,120,0.8)',
          }}
        />
      )}

      {/* Shell */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.3)',
            boxShadow: thinking
              ? '0 8px 32px rgba(240,200,120,0.55), 0 0 24px rgba(240,200,120,0.35)'
              : '0 8px 32px rgba(74,82,224,0.45)',
          }}
        >
          {/* Internal conic gradient */}
          <div
            style={{
              position: 'absolute',
              inset: '-25%',
              background: thinking
                ? 'conic-gradient(from 0deg, #4A52E0, #8FB8E8, #FFD98A, #F0C878, #4A52E0)'
                : 'conic-gradient(from 0deg, #4A52E0, #8FB8E8, #F0C878, #4A52E0)',
              borderRadius: '50%',
            }}
          />
          {/* Inner 60% white-glow blur */}
          <div
            style={{
              position: 'absolute',
              inset: '20%',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 38% 34%, rgba(255,255,255,0.75), rgba(255,255,255,0.12) 60%, transparent 72%)',
              filter: `blur(${Math.max(2, size / 14)}px)`,
            }}
          />
        </div>
      </div>

      {/* Notifying badge — gold ⚡ top-right */}
      {state === 'notifying' && (
        <span
          style={{
            position: 'absolute',
            top: -3,
            insetInlineEnd: -3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: Math.max(18, size * 0.34),
            height: Math.max(18, size * 0.34),
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #F0C878, #D9A648)',
            color: '#0B0E1D',
            boxShadow: '0 2px 10px rgba(217,166,72,0.6)',
          }}
        >
          <Zap size={Math.max(11, size * 0.2)} strokeWidth={2.6} aria-hidden="true" />
        </span>
      )}
    </div>
  )
}

const Orb = memo(OrbInner)
export default Orb
