import { useEffect, useRef, useState } from 'react'
import { pinLength } from '@/lib/pinLength'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/** Five orbiting chips, not eight: they read as a hint of the module set, and
 *  every one of them costs a transform write per frame. */
const CHIPS = [
  { label: 'Circles', tip: 'Circles — your people, grouped your way' },
  { label: 'Family Tree', tip: 'Family Tree — verified genealogy across generations' },
  { label: 'Marketplace', tip: 'Marketplace — trusted commerce with a fair margin' },
  { label: 'Messages', tip: 'Messages — end-to-end encrypted, auto-translated' },
  { label: 'Memorials', tip: 'Memorials — memory, kept with dignity' },
]

/** Globe dot budget. 1400 was invisible detail at this radius and cost a path
 *  operation each per frame. */
const DOT_TARGET = 900

/** Dots are drawn in alpha buckets: one path per bucket instead of one path
 *  per dot turns ~900 fill() calls into 6. */
const ALPHA_BUCKETS = 6

type Vec3 = { x: number; y: number; z: number }

type Arc = {
  a: number
  b: number
  born: number
  drawMs: number
  lingerMs: number
  fadeMs: number
}

/** Sample /globe-dots.png into sphere points; fall back to a Fibonacci sphere. */
function loadGlobePoints(): Promise<Vec3[]> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const W = 400
        const H = 200
        const off = document.createElement('canvas')
        off.width = W
        off.height = H
        const ctx = off.getContext('2d')
        if (!ctx) throw new Error('no ctx')
        ctx.drawImage(img, 0, 0, W, H)
        const data = ctx.getImageData(0, 0, W, H).data
        const pts: Vec3[] = []
        for (let y = 0; y < H; y += 1) {
          for (let x = 0; x < W; x += 1) {
            const i = (y * W + x) * 4
            const lum = data[i] * 0.5 + data[i + 1] * 0.35 + data[i + 2] * 0.15
            const alpha = data[i + 3]
            if (alpha > 40 && lum > 90) {
              const lat = 90 - (y / H) * 180
              const lng = (x / W) * 360 - 180
              const la = (lat * Math.PI) / 180
              const lo = (lng * Math.PI) / 180
              pts.push({ x: Math.cos(la) * Math.cos(lo), y: Math.sin(la), z: Math.cos(la) * Math.sin(lo) })
            }
          }
        }
        if (pts.length < 300) throw new Error('too few dots')
        // cap at ~1400, evenly sampled
        const step = Math.max(1, Math.floor(pts.length / DOT_TARGET))
        resolve(pts.filter((_, i) => i % step === 0).slice(0, DOT_TARGET))
      } catch {
        resolve(fibSphere())
      }
    }
    img.onerror = () => resolve(fibSphere())
    img.src = '/globe-dots.png'
  })
}

function fibSphere(): Vec3[] {
  const pts: Vec3[] = []
  const N = DOT_TARGET
  const golden = Math.PI * (3 - Math.sqrt(5))
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const th = golden * i
    pts.push({ x: Math.cos(th) * r, y, z: Math.sin(th) * r })
  }
  return pts
}

/**
 * HeroScene — the Living Network canvas: rotating dotted globe, golden
 * great-circle arcs, orbiting module chips, scroll-pin choreography.
 * GSAP-only component (no Framer Motion in this subtree).
 */
export default function HeroScene({
  sectionRef,
  pinRef,
}: {
  sectionRef: React.RefObject<HTMLElement | null>
  /** The inner element GSAP is allowed to re-parent. Never the React-owned section. */
  pinRef: React.RefObject<HTMLDivElement | null>
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chipsRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef(0)
  const hoverRef = useRef(-1)
  const anglesRef = useRef(CHIPS.map((_, i) => (i / CHIPS.length) * Math.PI * 2))
  const [tooltip, setTooltip] = useState<number | null>(null)

  // Scroll pin: 120vh, globe scales 1→0.85, drifts +8vw, copy fades out 0–40%
  // useGSAP, not useEffect: useEffect's cleanup is a *passive* effect, which
  // React runs after it has already detached this subtree from the DOM. GSAP's
  // revert would then arrive too late to undo the pin's re-parenting, and
  // React's own removeChild throws NotFoundError, killing every navigation.
  // useGSAP cleans up in the mutation phase, before the node is removed.
  useGSAP(() => {
    const section = sectionRef.current
    const pinTarget = pinRef.current
    if (!section || !pinTarget) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: pinLength(1.2),
          // Pin the inner wrapper, not the trigger: GSAP re-parents whatever it
          // pins, and re-parenting a node React owns breaks React's removal of it.
          pin: pinTarget,
          scrub: 0.6,
          onUpdate: (self) => {
            progressRef.current = self.progress
          },
        },
      }).to('#hero-copy', { opacity: 0, duration: 0.4, ease: 'none' }, 0)
    }, section)
    return () => ctx.revert()
  }, { dependencies: [] })

  // Canvas render loop + chip orbits
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    let points: Vec3[] = []
    let arcs: Arc[] = []
    let nextArcAt = 1800
    let W = 0
    let H = 0
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
    let alive = true

    loadGlobePoints().then((p) => {
      if (alive) points = p
    })

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = canvas.clientWidth
      H = canvas.clientHeight
      canvas.width = Math.max(1, W * dpr)
      canvas.height = Math.max(1, H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const onPointer = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 20
      pointer.ty = ((e.clientY - r.top) / r.height - 0.5) * 20
    }
    window.addEventListener('pointermove', onPointer, { passive: true })

    const TILT = (-12 * Math.PI) / 180
    let rot = 0
    let last = performance.now()

    // Reused per-frame scratch: [sx, sy, size, ...] per alpha bucket.
    const buckets: number[][] = Array.from({ length: ALPHA_BUCKETS }, () => [])
    let limbGradient: CanvasGradient | null = null
    let limbCx = NaN
    let limbCy = NaN
    let limbR = NaN
    let visible = true

    const project = (p: Vec3, sinR: number, cosR: number) => {
      // rotate about Y (spin)
      const x = p.x * cosR + p.z * sinR
      const z1 = -p.x * sinR + p.z * cosR
      // axial tilt about X
      const y = p.y * Math.cos(TILT) - z1 * Math.sin(TILT)
      const z = p.y * Math.sin(TILT) + z1 * Math.cos(TILT)
      return { x, y, z }
    }

    const frame = (now: number) => {
      if (!visible) return // resumes from the IntersectionObserver below
      const dt = Math.min(64, now - last)
      last = now
      const rtl = document.documentElement.dir === 'rtl'
      rot += (0.02 * dt) / 1000 * (rtl ? -1 : 1)

      const p = progressRef.current
      const scale = 1 - p * 0.15
      const drift = p * 0.08 * W

      pointer.x += (pointer.tx - pointer.x) * 0.06
      pointer.y += (pointer.ty - pointer.y) * 0.06

      const R = Math.min(W, H) * 0.3 * scale
      const wide = W >= 1024
      const cx = (wide ? W * 0.68 : W * 0.5) + drift + pointer.x
      const cy = H * (wide ? 0.52 : 0.62) + pointer.y

      ctx.clearRect(0, 0, W, H)

      const sinR = Math.sin(rot)
      const cosR = Math.cos(rot)
      const projected: { sx: number; sy: number; z: number }[] = new Array(points.length)

      // Globe dots — warm gold, glowing near the silhouette. Dots are collected
      // into alpha buckets and each bucket is stroked as ONE path: a fill() per
      // dot meant ~900 path submissions every frame for detail nobody can see.
      for (let b = 0; b < ALPHA_BUCKETS; b++) buckets[b].length = 0

      for (let i = 0; i < points.length; i++) {
        const q = project(points[i], sinR, cosR)
        const sx = cx + q.x * R
        const sy = cy - q.y * R
        projected[i] = { sx, sy, z: q.z }
        if (q.z < -0.05) continue
        const depth = (q.z + 1) / 2
        const bucket = Math.min(ALPHA_BUCKETS - 1, Math.floor(depth * ALPHA_BUCKETS))
        const size = 0.9 + depth * 1.1 * (R / 240)
        buckets[bucket].push(sx, sy, size)
      }

      for (let b = 0; b < ALPHA_BUCKETS; b++) {
        const bucket = buckets[b]
        if (!bucket.length) continue
        const depth = (b + 0.5) / ALPHA_BUCKETS
        ctx.fillStyle = `rgba(240, 200, 120, ${(0.12 + depth * 0.48).toFixed(3)})`
        ctx.beginPath()
        for (let i = 0; i < bucket.length; i += 3) {
          const sx = bucket[i]
          const sy = bucket[i + 1]
          const size = bucket[i + 2]
          ctx.moveTo(sx + size, sy)
          ctx.arc(sx, sy, size, 0, Math.PI * 2)
        }
        ctx.fill()
      }

      // Limb glow. The gradient is rebuilt only when the geometry actually
      // moved — allocating one per frame was pure garbage for an identical result.
      if (!limbGradient || Math.abs(cx - limbCx) > 0.5 || Math.abs(cy - limbCy) > 0.5 || Math.abs(R - limbR) > 0.5) {
        limbGradient = ctx.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 1.12)
        limbGradient.addColorStop(0, 'rgba(74,82,224,0)')
        limbGradient.addColorStop(0.85, 'rgba(74,82,224,0.10)')
        limbGradient.addColorStop(1, 'rgba(74,82,224,0)')
        limbCx = cx
        limbCy = cy
        limbR = R
      }
      ctx.fillStyle = limbGradient
      ctx.beginPath()
      ctx.arc(cx, cy, R * 1.12, 0, Math.PI * 2)
      ctx.fill()

      // spawn arcs (accelerate slightly with scroll)
      const interval = 3200 - p * 900
      if (now > nextArcAt && arcs.length < 6 && points.length > 10) {
        arcs.push({
          a: Math.floor(Math.random() * points.length),
          b: Math.floor(Math.random() * points.length),
          born: now,
          drawMs: 900,
          lingerMs: 2500,
          fadeMs: 700,
        })
        nextArcAt = now + 1800 + Math.random() * (interval - 1800 + 400)
      }

      arcs = arcs.filter((arc) => now - arc.born < arc.drawMs + arc.lingerMs + arc.fadeMs)

      for (const arc of arcs) {
        const A = projected[arc.a]
        const B = projected[arc.b]
        if (!A || !B || A.z < -0.15 || B.z < -0.15) continue
        const age = now - arc.born
        const drawP = Math.min(1, age / arc.drawMs)
        const ease = 1 - Math.pow(1 - drawP, 3)
        let alpha = 0.85
        if (age > arc.drawMs + arc.lingerMs) {
          alpha = 0.85 * (1 - (age - arc.drawMs - arc.lingerMs) / arc.fadeMs)
        }
        const mx = (A.sx + B.sx) / 2
        const my = (A.sy + B.sy) / 2
        const dist = Math.hypot(B.sx - A.sx, B.sy - A.sy)
        // control point lifted perpendicular + outward from globe
        let nx = -(B.sy - A.sy) / (dist || 1)
        let ny = (B.sx - A.sx) / (dist || 1)
        const outX = mx - cx
        const outY = my - cy
        if (nx * outX + ny * outY < 0) {
          nx = -nx
          ny = -ny
        }
        const lift = dist * 0.28 + R * 0.12
        const cpx = mx + nx * lift
        const cpy = my + ny * lift

        const grad = ctx.createLinearGradient(A.sx, A.sy, B.sx, B.sy)
        grad.addColorStop(0, `rgba(240,200,120,${alpha})`)
        grad.addColorStop(0.55, `rgba(217,166,72,${alpha})`)
        grad.addColorStop(1, `rgba(143,184,232,${alpha})`)
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.6
        ctx.lineCap = 'round'
        // partial quadratic bezier via subdivision
        const SEG = 32
        const upto = Math.max(1, Math.floor(ease * SEG))
        ctx.beginPath()
        ctx.moveTo(A.sx, A.sy)
        for (let s = 1; s <= upto; s++) {
          const t = s / SEG
          const mt = 1 - t
          const px = mt * mt * A.sx + 2 * mt * t * cpx + t * t * B.sx
          const py = mt * mt * A.sy + 2 * mt * t * cpy + t * t * B.sy
          ctx.lineTo(px, py)
        }
        ctx.stroke()
        // endpoint spark
        if (drawP >= 1) {
          ctx.fillStyle = `rgba(240,200,120,${alpha})`
          ctx.beginPath()
          ctx.arc(B.sx, B.sy, 2.4, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // orbiting module chips (DOM, positioned imperatively)
      const chipLayer = chipsRef.current
      if (chipLayer) {
        const t = now / 1000
        const rx = R * 1.45
        const ry = R * 0.42
        for (let i = 0; i < CHIPS.length; i++) {
          const el = chipLayer.children[i] as HTMLElement | undefined
          if (!el) continue
          const ringA = i < 4
          const speed = ((Math.PI * 2) / (ringA ? 26 : 34)) * (ringA ? 1 : -1) * (rtl ? -1 : 1)
          if (hoverRef.current !== i) {
            anglesRef.current[i] += speed * (dt / 1000)
          }
          const a = anglesRef.current[i]
          const tiltDeg = ringA ? -14 : 10
          const tr = (tiltDeg * Math.PI) / 180
          const ex = Math.cos(a) * rx
          const ey = Math.sin(a) * ry
          const x = ex * Math.cos(tr) - ey * Math.sin(tr)
          const y = ex * Math.sin(tr) + ey * Math.cos(tr)
          const bob = Math.sin(t * ((Math.PI * 2) / 5) + i * 1.7) * 6
          const depth = Math.sin(a) // -1 back, +1 front
          const s = 0.82 + ((depth + 1) / 2) * 0.22
          const op = 0.45 + ((depth + 1) / 2) * 0.55
          el.style.transform = `translate(${(cx + x).toFixed(1)}px, ${(cy + y + bob).toFixed(1)}px) translate(-50%, -50%) scale(${s.toFixed(3)})`
          el.style.opacity = op.toFixed(2)
          el.style.zIndex = depth > 0 ? '30' : '5'
        }
      }

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    // The loop used to keep running once the hero scrolled away, spending a
    // frame budget on pixels nobody was looking at for the whole rest of the page.
    const io = new IntersectionObserver(
      ([entry]) => {
        const wasVisible = visible
        visible = entry.isIntersecting
        if (visible && !wasVisible) {
          last = performance.now()
          raf = requestAnimationFrame(frame)
        }
      },
      { threshold: 0 },
    )
    io.observe(canvas)

    return () => {
      alive = false
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onPointer)
    }
  }, [])

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 1 }}
        aria-hidden="true"
      />
      {/* orbiting chips */}
      <div ref={chipsRef} className="pointer-events-none absolute inset-0 z-10 hidden md:block" aria-hidden="false">
        {CHIPS.map((c, i) => (
          <button
            key={c.label}
            type="button"
            tabIndex={-1}
            onMouseEnter={() => {
              hoverRef.current = i
              setTooltip(i)
            }}
            onMouseLeave={() => {
              hoverRef.current = -1
              setTooltip(null)
            }}
            onFocus={() => setTooltip(i)}
            onBlur={() => setTooltip(null)}
            /* Not .cloud-glass: a backdrop-filter on an element whose transform
               changes every frame forces the browser to re-blur everything
               behind it, 60 times a second, per chip. A flat translucent fill
               is visually near-identical here and costs nothing. */
            className="pointer-events-auto absolute left-0 top-0 rounded-full border border-white/10 bg-ink-2/70 px-3.5 py-1.5 text-xs font-semibold text-text-hi will-change-transform"
            style={{ transform: 'translate(-200px,-200px)' }}
          >
            {c.label}
            {tooltip === i && (
              <span className="absolute left-1/2 top-full z-40 mt-2 w-52 -translate-x-1/2 rounded-card-sm cloud-glass bg-ink-2/95 px-3 py-2 text-start text-[0.7rem] font-normal leading-snug text-text-mid">
                {c.tip}
              </span>
            )}
          </button>
        ))}
      </div>
    </>
  )
}
