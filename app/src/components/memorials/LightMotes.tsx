import { memo, useEffect, useRef } from 'react'
import { useReducedMotion } from 'framer-motion'

interface Mote {
  x: number
  y: number
  r: number
  phase: number
  speed: number
  drift: number
}

/**
 * LightMotes — ambient drifting candle-motes for the memorials hero.
 * 12 particles, ~20s loops, absolutely gentle. Reduced motion → nothing.
 */
const LightMotes = memo(function LightMotes() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (reduced) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const parent = canvas.parentElement!
    const resize = () => {
      canvas.width = parent.clientWidth
      canvas.height = parent.clientHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const motes: Mote[] = Array.from({ length: 12 }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      r: 1.2 + Math.random() * 2.2,
      phase: (i / 12) * Math.PI * 2,
      speed: 0.0000314 * (0.7 + Math.random() * 0.6), // ~20s loops
      drift: 20 + Math.random() * 40,
    }))

    let raf = 0
    const draw = (t: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const m of motes) {
        const px = m.x * canvas.width + Math.sin(t * m.speed + m.phase) * m.drift
        const py = m.y * canvas.height - ((t * m.speed * 14 + m.phase * 30) % (canvas.height + 60)) + 30
        const y = ((py % (canvas.height + 60)) + canvas.height + 60) % (canvas.height + 60) - 30
        const alpha = 0.25 + 0.2 * Math.sin(t * m.speed * 3 + m.phase)
        ctx.beginPath()
        ctx.arc(px, y, m.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(240, 200, 120, ${Math.max(0, alpha)})`
        ctx.shadowColor = 'rgba(240, 200, 120, 0.8)'
        ctx.shadowBlur = 8
        ctx.fill()
        ctx.shadowBlur = 0
      }
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [reduced])

  if (reduced) return null
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 2 }}
    />
  )
})

export default LightMotes
