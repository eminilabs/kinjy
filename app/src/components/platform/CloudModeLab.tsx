import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { Cloud, Sun, Moon, MonitorCog } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from './shared'
import { FEATURES } from '@/lib/features'

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

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const effective: Exclude<Mode, 'system'> = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode

  return (
    // A paper panel like the rest of the page: only the preview window wears
    // the ambient, which is the thing being demonstrated.
    <section
      className="relative mx-[clamp(12px,2vw,24px)] mt-[120px] overflow-hidden rounded-[20px] px-[clamp(20px,5vw,64px)] py-[120px]"
      aria-label="Cloud display mode"
      style={{ background: 'linear-gradient(160deg, var(--kl-stage-a), var(--kl-stage-b))' }}
    >
      <div aria-hidden="true" className="absolute -right-20 -top-20 h-[320px] w-[320px] rounded-full bg-[var(--kl-indigo)] opacity-25 blur-[90px]" />
      <div aria-hidden="true" className="kl-sheen absolute -bottom-24 left-10 h-[260px] w-[260px] rounded-full opacity-30 blur-[90px]" />
      <div className="mx-auto grid max-w-[1180px] grid-cols-[minmax(0,1fr)] items-center gap-12 lg:grid-cols-2">
        {/* Copy */}
        <div>
          <p className="kl-mono text-xs tracking-[.14em] text-[var(--kl-gold-deep)]">SIGNATURE</p>
          <h2 className="kl-h2 mt-4">Cloud mode. Our visual soul.</h2>
          <p className="kl-lead mt-5 max-w-lg">
            Soft translucent panels. Floating cards. Subtle depth. Low clutter. Configure your
            ambient sky — Twilight, Dawn, Savanna, Ocean — or switch to Light, Dark, or System
            anytime.
          </p>
          <ul className="mt-6 space-y-2 text-sm text-[var(--kl-mid)]">
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Glass panels · blur 18px · saturate 140%
            </li>
            <li className="flex items-center gap-2.5">
              <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Floating shadows, one focal effect per view
            </li>
            {/* Heritage pages belong to the family tree. */}
            {FEATURES.familyTree && (
              <li className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" /> Heritage pages always keep their paper soul
              </li>
            )}
          </ul>
        </div>

        {/* Interactive mode lab */}
        <div>
          {/* 4-way segmented control */}
          <div className="mx-auto flex w-fit rounded-full border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] p-1 shadow-[0_16px_30px_-24px_var(--kl-shadow)]" role="radiogroup" aria-label="Display mode">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                role="radio"
                aria-checked={mode === m.key}
                onClick={() => setMode(m.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-2.5 py-2 text-xs font-semibold transition-colors duration-300 sm:px-4 sm:text-sm',
                  mode === m.key ? 'kl-sheen' : 'text-[var(--kl-mid)] hover:text-[var(--kl-ink)]',
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
                  ambient === i ? 'scale-110 border-[#D9A648] shadow-[0_0_12px_rgba(217,166,72,0.5)]' : 'border-[var(--kl-surface)] hover:border-[#D9A648]/60',
                )}
                style={{ background: a.bg }}
              />
            ))}
          </div>

          <div className="mt-6 shadow-[0_30px_60px_-30px_var(--kl-shadow)]">
            <LabWindow mode={effective} ambient={ambient} />
          </div>
        </div>
      </div>
    </section>
  )
}
