import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FEATURES } from '@/lib/features'
import { MODULES, MODULE_COUNT_KEY } from './data'

const PALETTES = [
  ['#8A6414', '#F6EBD3'],
  ['#2F6BA8', '#E3ECF7'],
  ['#C45531', '#F7E1D8'],
  ['#4A52E0', '#E4E5FA'],
]
const TILTS = [-3, 2, -1.5, 3, -2]

const INNER_RING = 5

/**
 * Where module `i` of `total` sits on the two rings, in % of the orbit box.
 * Five on the inner ring, the rest spread evenly on the outer one: fifteen
 * when every module is open, fewer while some are switched off.
 */
function orbitPoint(i: number, total: number) {
  const inner = i < INNER_RING
  const k = inner ? i : i - INNER_RING
  const n = inner ? INNER_RING : Math.max(total - INNER_RING, 1)
  const r = inner ? 24 : 40
  const angle = (k / n) * Math.PI * 2 - Math.PI / 2 + (inner ? 0 : Math.PI / 10)
  return { x: 50 + r * Math.cos(angle), y: 50 + r * Math.sin(angle) }
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export default function LandingModules() {
  const { t } = useTranslation()
  const [active, setActive] = useState(0)
  // Turning on its own until the visitor picks one: from then on the page
  // stays where they put it. Never for visitors who asked for less motion.
  const [manual, setManual] = useState(prefersReducedMotion)

  useEffect(() => {
    if (manual) return
    const timer = window.setInterval(() => setActive((i) => (i + 1) % MODULES.length), 3200)
    return () => window.clearInterval(timer)
  }, [manual])

  const pick = (i: number) => {
    setManual(true)
    setActive((i + MODULES.length) % MODULES.length)
  }

  const points = useMemo(() => MODULES.map((_, i) => orbitPoint(i, MODULES.length)), [])
  const focus = MODULES[active]
  const line = points[active]

  return (
    <section id="modules" className="kl-split kl-pad-x gap-[72px] pb-[100px] pt-16">
      <div>
        <h2 className="kl-h2 mb-6 mt-4">{t('landing.modules.title', { count: t(MODULE_COUNT_KEY) })}</h2>
        <p className="kl-lead">
          {FEATURES.marketplace ? t('landing.modules.verbsMarket') : t('landing.modules.verbs')}{' '}
          {t('landing.modules.lead')}
        </p>

        <div
          className="mt-11 max-w-[440px] rounded-2xl border border-[var(--kl-invert-border)] bg-[var(--kl-invert)] px-6 py-[22px] text-[var(--kl-invert-ink)] shadow-[0_30px_60px_-34px_rgba(11,14,29,.7)]"
          aria-live="polite"
        >
          <div className="mb-3.5 flex items-center justify-between gap-3">
            <span className="kl-mono text-xs tracking-[.08em] text-[var(--kl-gold-soft)]">
              {String(active + 1).padStart(2, '0')} / {MODULES.length}
            </span>
            <div className="flex gap-1.5">
              {[
                { label: 'Previous module', glyph: '←', step: -1 },
                { label: 'Next module', glyph: '→', step: 1 },
              ].map((b) => (
                <button
                  key={b.label}
                  type="button"
                  onClick={() => pick(active + b.step)}
                  aria-label={b.label}
                  className="kl-night-glass grid h-8 w-8 place-items-center rounded-[10px] text-sm transition-colors hover:bg-[var(--kl-night-2)]"
                >
                  {b.glyph}
                </button>
              ))}
            </div>
          </div>
          <div className="kl-serif mb-2.5 text-[34px] font-medium italic leading-[1.05] text-[var(--kl-gold-soft)]">
            {focus.name}
          </div>
          <div className="mb-[18px] min-h-[50px] text-base leading-[1.55] text-[var(--kl-night-mid)]">{focus.desc}</div>
          <div className="flex items-center gap-3 border-t border-white/15 pt-4">
            <div className="flex">
              <span className="grid h-[30px] w-[30px] place-items-center rounded-full border-2 border-[var(--kl-invert)] bg-[#F6EBD3] text-[11px] font-bold text-[var(--kl-on-pastel)]">
                {focus.a}
              </span>
              <span className="-ms-2 grid h-[30px] w-[30px] place-items-center rounded-full border-2 border-[var(--kl-invert)] bg-[#E3ECF7] text-[11px] font-bold text-[var(--kl-on-pastel)]">
                {focus.b}
              </span>
            </div>
            <span className="text-sm">{focus.who}</span>
          </div>
        </div>
      </div>

      <div className="relative aspect-square w-full max-w-[680px] justify-self-center">
        <div className="absolute inset-[6%] rounded-full" style={{ background: 'radial-gradient(circle, var(--kl-paper) 0%, var(--kl-bg) 72%)' }} />
        <div className="absolute inset-[8%] rounded-full border-[1.5px] border-[var(--kl-paper-2)]" />
        <div className="kl-arc kl-spin absolute inset-[8%] rounded-full" aria-hidden="true" />
        <div className="absolute inset-[26%] rounded-full border-[1.5px] border-dashed border-[var(--kl-dash)] bg-[var(--kl-paper)]" />

        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 z-[1] h-full w-full" aria-hidden="true">
          <line
            x1="50" y1="50" x2={line.x.toFixed(2)} y2={line.y.toFixed(2)}
            stroke="#D9A648" strokeWidth="0.5" strokeDasharray="1.2 1.2" strokeLinecap="round"
          />
        </svg>

        <div className="absolute left-1/2 top-1/2 aspect-square w-[24%] -translate-x-1/2 -translate-y-1/2" aria-hidden="true">
          <div className="kl-orb-ring absolute inset-[-14%] rounded-full opacity-35 blur-[22px]" />
          <div
            className="absolute inset-0 grid place-items-center rounded-full shadow-[0_30px_60px_-24px_rgba(11,14,29,.7)]"
            style={{ background: 'radial-gradient(circle at 35% 30%, #242142, #0B0E1D 70%)' }}
          >
            <img src="/logo.svg" alt="" className="block h-[68%] w-[68%]" />
          </div>
        </div>

        {[
          { src: '/landing/story.jpg', left: '69.4%', top: '23.3%', w: '9%' },
          { src: '/landing/avatar.jpg', left: '18.6%', top: '60.2%', w: '9%' },
          { src: '/landing/commu.jpg', left: '50%', top: '80%', w: '8.5%' },
        ].map((p) => (
          <div
            key={p.src}
            className="kl-orb-ring absolute z-[2] aspect-square -translate-x-1/2 -translate-y-1/2 rounded-full p-[3px] shadow-[0_18px_34px_-16px_rgba(11,14,29,.5)]"
            style={{ left: p.left, top: p.top, width: p.w }}
            aria-hidden="true"
          >
            <div className="h-full w-full overflow-hidden rounded-full border-[3px] border-[var(--kl-cutout)] bg-[var(--kl-paper-2)]">
              <img src={p.src} alt="" className="h-full w-full object-cover" loading="lazy" />
            </div>
          </div>
        ))}

        <ul aria-label={t('landing.modules.listLabel')}>
          {MODULES.map((m, i) => {
            const on = i === active
            const [fg, bg] = PALETTES[i % 4]
            return (
              <li
                key={t(m.name)}
                className="absolute z-[3]"
                style={{
                  left: `${points[i].x}%`,
                  top: `${points[i].y}%`,
                  transform: `translate(-50%, -50%) rotate(${TILTS[i % 5]}deg)`,
                }}
              >
                <button
                  type="button"
                  onClick={() => pick(i)}
                  aria-pressed={on}
                  className="kl-float flex items-center gap-[9px] whitespace-nowrap rounded-[10px] border py-1.5 pe-3 ps-1.5 text-[13.5px] font-semibold shadow-[0_16px_30px_-18px_var(--kl-shadow)] transition-[transform,box-shadow] hover:-translate-y-[3px] hover:scale-[1.06]"
                  style={{
                    background: on ? 'var(--kl-invert)' : 'var(--kl-surface)',
                    color: on ? 'var(--kl-invert-ink)' : 'var(--kl-ink)',
                    borderColor: on ? 'var(--kl-invert-border)' : 'var(--kl-paper-2)',
                    ['--kl-dur' as string]: `${6 + (i % 4) * 0.7}s`,
                  }}
                >
                  <span
                    className="kl-serif grid h-[26px] w-[26px] place-items-center rounded-[7px] text-[15px] font-semibold italic leading-none"
                    style={{ background: bg, color: fg }}
                    aria-hidden="true"
                  >
                    {m.name.charAt(0)}
                  </span>
                  {t(m.name)}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
