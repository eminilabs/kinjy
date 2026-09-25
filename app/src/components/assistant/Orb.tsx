import { memo } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
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
 * 1px white rim, 14s internal swirl, 4.2s breathing scale 1→1.06,
 * shadow 0 8px 32px rgba(74,82,224,0.45).
 * States: idle · listening (ring pulse) · thinking (4s swirl, gold brightens)
 * · notifying (gold ⚡ badge). Reduced motion → static assistant-orb.svg.
 */
function OrbInner({ size = 56, state = 'idle', className }: OrbProps) {
  const reduced = useReducedMotion()

  if (reduced) {
    return (
      <img
        src="/assistant-orb.svg"
        alt=""
        width={size}
        height={size}
        className={className}
        style={{ width: size, height: size, filter: 'drop-shadow(0 8px 32px rgba(74,82,224,0.45))' }}
      />
    )
  }

  const thinking = state === 'thinking'

  return (
    <div className={className} style={{ position: 'relative', width: size, height: size }} aria-hidden="true">
      {/* Listening ring — pulses outward every 1s */}
      {state === 'listening' && (
        <motion.span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid rgba(240,200,120,0.8)',
          }}
          animate={{ scale: [1, 1.65], opacity: [0.8, 0] }}
          transition={{ duration: 1, repeat: Infinity, ease: 'easeOut' }}
        />
      )}

      {/* Breathing shell */}
      <motion.div
        style={{ position: 'absolute', inset: 0 }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
      >
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
          {/* Internal swirl — rotating conic gradient (14s idle / 4s thinking) */}
          <motion.div
            style={{
              position: 'absolute',
              inset: '-25%',
              background: thinking
                ? 'conic-gradient(from 0deg, #4A52E0, #8FB8E8, #FFD98A, #F0C878, #4A52E0)'
                : 'conic-gradient(from 0deg, #4A52E0, #8FB8E8, #F0C878, #4A52E0)',
              borderRadius: '50%',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: thinking ? 4 : 14, repeat: Infinity, ease: 'linear' }}
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
      </motion.div>

      {/* Notifying badge — gold ⚡ top-right with gentle bob */}
      {state === 'notifying' && (
        <motion.span
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
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Zap size={Math.max(11, size * 0.2)} strokeWidth={2.6} aria-hidden="true" />
        </motion.span>
      )}
    </div>
  )
}

const Orb = memo(OrbInner)
export default Orb
