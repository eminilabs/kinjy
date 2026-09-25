import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Cloud, Sun, Moon, MonitorCog } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from './shared'

type Mode = 'cloud' | 'light' | 'dark' | 'system'

const MODES: Array<{ key: Mode; label: string; icon: typeof Cloud }> = [
  { key: 'cloud', label: 'Cloud', icon: Cloud },
  { key: 'light', label: 'Light', icon: Sun },
  { key: 'dark', label: 'Dark', icon: Moon },
  { key: 'system', label: 'System', icon: MonitorCog },
]

const AMBIENTS = [
  { key: 'twilight', label: 'Twilight', bg: 'linear-gradient(160deg, #2E2A6E 0%, #0B0E1D 65%)' },
  { key: 'dawn', label: 'Dawn', bg: 'linear-gradient(160deg, #3A2E4E 0%, #1D2338 65%)' },
  { key: 'savanna', label: 'Savanna', bg: 'linear-gradient(160deg, #3A2E14 0%, #171208 65%)' },
  { key: 'ocean', label: 'Ocean', bg: 'linear-gradient(160deg, #12304A 0%, #08131F 65%)' },
]

/** Mini app window restyled live by mode + ambient selection. */
function LabWindow({ mode, ambient }: { mode: Exclude<Mode, 'system'>; ambient: number }) {
  const reduced = useReducedMotion()
  const dur = reduced ? 0 : 0.42

  const tokens = useMemo(() => {
    switch (mode) {
      case 'light':
        return {
          shell: { background: '#F6F1E7' },
          card: { background: '#EDE4D3', border: '1px solid rgba(36,31,22,0.12)' },
          text: '#241F16',
          sub: 'rgba(36,31,22,0.6)',
          chip: { background: 'rgba(74,82,224,0.12)', color: '#2E2A6E' },
        }
      case 'dark':
        return {
          shell: { background: '#0B0E1D' },
          card: { background: '#12162B', border: '1px solid rgba(255,255,255,0.1)' },
          text: '#F4F2EE',
          sub: '#A7ACBF',
          chip: { background: 'rgba(217,166,72,0.14)', color: '#F0C878' },
        }
      default:
        return {
          shell: { background: AMBIENTS[ambient].bg },
          card: {
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.14)',
            backdropFilter: 'blur(18px) saturate(140%)',
            WebkitBackdropFilter: 'blur(18px) saturate(140%)',
            boxShadow: '0 24px 60px -12px rgba(0,0,0,0.55)',
          },
          text: '#F4F2EE',
          sub: '#A7ACBF',
          chip: { background: 'rgba(217,166,72,0.16)', color: '#F0C878' },
        }
    }
  }, [mode, ambient])

  return (
    <motion.div
      className="overflow-hidden rounded-card-xl"
      animate={tokens.shell}
      transition={{ duration: dur }}
      style={{ border: '1px solid rgba(255,255,255,0.12)' }}
    >
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 px-4 py-3" style={{ borderBottom: '1px solid rgba(127,132,153,0.18)' }}>
        <span className="h-2.5 w-2.5 rounded-full bg-danger/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-warning/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-success/70" />
        <span className="ml-2 text-[0.68rem] font-semibold" style={{ color: tokens.sub }}>
          kaluta.app — {mode === 'cloud' ? `Cloud · ${AMBIENTS[ambient].label}` : mode}
        </span>
      </div>
      <div className="space-y-3 p-4">
        {[1, 8].map((a) => (
          <motion.div
            key={a}
            className="rounded-card-md p-3.5"
            animate={tokens.card as Record<string, string>}
            transition={{ duration: dur }}
          >
            <div className="flex items-center gap-2.5">
              <Avatar index={a} size={30} />
              <div>
                <p className="text-sm font-bold" style={{ color: tokens.text }}>
                  {a === 1 ? 'Demo K.' : 'Baraka T.'}
                </p>
                <p className="text-[0.68rem]" style={{ color: tokens.sub }}>
                  {a === 1 ? '2h · Dar es Salaam' : '5h · Nairobi'}
                </p>
              </div>
              <span className="ml-auto rounded-full px-2 py-0.5 text-[0.62rem] font-bold" style={tokens.chip}>
                {a === 1 ? 'Following' : 'For You'}
              </span>
            </div>
            <p className="mt-2.5 text-[0.82rem] leading-relaxed" style={{ color: tokens.text }}>
              {a === 1
                ? 'Golden hour over the harbor — the whole city looked like it was breathing gold.'
                : 'Our forum just crossed 10,000 members. Asante sana, everyone.'}
            </p>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

/** Section 5 — Cloud display mode lab. */
export default function CloudModeLab() {
  const [mode, setMode] = useState<Mode>('cloud')
  const [ambient, setAmbient] = useState(0)
  const [systemDark, setSystemDark] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches,
  )
  const reduced = useReducedMotion()

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const effective: Exclude<Mode, 'system'> = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode

  // The band's own background subtly reflects the selected ambient
  const bandBg =
    effective === 'cloud'
      ? AMBIENTS[ambient].bg
      : effective === 'light'
        ? 'linear-gradient(160deg, rgba(246,241,231,0.08) 0%, rgba(11,14,29,0) 70%), #0B0E1D'
        : '#0B0E1D'

  return (
    <motion.section
      // force-dark: this section paints its own background (every ambient is a
      // dark gradient) in both themes, so it has to carry the dark text tokens
      // with it. Without it, light mode put near-black ink on near-black.
      className="noise-overlay force-dark relative px-6 py-24 md:py-32"
      aria-label="Cloud display mode"
      animate={{ background: bandBg }}
      transition={{ duration: reduced ? 0 : 1 }}
      style={{ background: AMBIENTS[0].bg }}
    >
      <div className="mx-auto grid max-w-container items-center gap-12 lg:grid-cols-2">
        {/* Copy */}
        <div>
          <p className="eyebrow text-gold">Signature</p>
          <h2 className="h2 mt-4">Cloud mode. Our visual soul.</h2>
          <p className="body-lg mt-5 max-w-lg text-text-mid">
            Soft translucent panels. Floating cards. Subtle depth. Low clutter. Configure your
            ambient sky — Twilight, Dawn, Savanna, Ocean — or switch to Light, Dark, or System
            anytime.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-text-mid">
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Glass panels · blur 18px · saturate 140%
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Floating shadows, one focal effect per view
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Heritage pages always keep their paper soul
            </li>
          </ul>
        </div>

        {/* Interactive mode lab */}
        <div>
          {/* 4-way segmented control */}
          <div className="cloud-glass mx-auto flex w-fit rounded-full p-1" role="radiogroup" aria-label="Display mode">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                role="radio"
                aria-checked={mode === m.key}
                onClick={() => setMode(m.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors duration-300',
                  mode === m.key ? 'bg-gradient-to-br from-gold-soft to-gold text-ink' : 'text-text-mid hover:text-text-hi',
                )}
              >
                <m.icon size={14} />
                {m.label}
              </button>
            ))}
          </div>

          {/* Ambient swatches (Cloud only) */}
          <div className={cn('mt-4 flex justify-center gap-2.5 transition-opacity duration-300', effective !== 'cloud' && 'pointer-events-none opacity-30')}>
            {AMBIENTS.map((a, i) => (
              <button
                key={a.key}
                type="button"
                onClick={() => setAmbient(i)}
                aria-pressed={ambient === i}
                aria-label={`Cloud ambient: ${a.label}`}
                title={a.label}
                className={cn(
                  'h-9 w-9 rounded-full border-2 transition-all duration-300',
                  ambient === i ? 'scale-110 border-gold shadow-[0_0_12px_rgba(217,166,72,0.5)]' : 'border-white/20 hover:border-white/40',
                )}
                style={{ background: a.bg }}
              />
            ))}
          </div>

          <div className="mt-6">
            <LabWindow mode={effective} ambient={ambient} />
          </div>
        </div>
      </div>
    </motion.section>
  )
}
