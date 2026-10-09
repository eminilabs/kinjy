import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDown, MousePointerClick } from 'lucide-react'
import { KineticWords } from '@/components/platform/shared'
import { Eyebrow, Stage } from '@/components/landing/PageKit'

const EASE = [0.22, 1, 0.36, 1] as const

const CHIPS = ['Home', 'Feeds', 'Forums', 'Circles', 'Create', 'Memorials']

/** Section 1 — the landing's split: the promise, and a sketch of the app window it opens on. */
export default function EnterHero() {
  const reduced = useReducedMotion()
  const rise = (delay: number) =>
    reduced ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay, ease: EASE } }

  const enter = () => {
    document.getElementById('app-frame')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  }

  return (
    <header className="kl-split kl-pad-x gap-[clamp(40px,6vw,96px)] pb-24 pt-14">
      <div className="min-w-0">
        <motion.div {...rise(0.1)}>
          <Eyebrow>Live demo</Eyebrow>
        </motion.div>
        <KineticWords
          as="h1"
          text="This is Kinjy, running."
          className="kl-serif mt-6 block text-balance text-[clamp(44px,6.6vw,96px)] font-semibold leading-[0.96] tracking-[-0.02em]"
        />
        <motion.p className="mt-8 max-w-[480px] text-[19px] leading-[1.55] text-[var(--kl-mid)]" {...rise(0.45)}>
          A real slice of the product — click everything. Data is simulated; the experience is not.
        </motion.p>
        <motion.div className="mt-10 flex flex-wrap items-center gap-4" {...rise(0.6)}>
          <button
            type="button"
            onClick={enter}
            className="kl-sheen inline-flex items-center gap-[18px] rounded-[20px] py-[7px] pe-[7px] ps-[30px] text-[17px] font-semibold shadow-[0_14px_30px_-12px_rgba(169,118,28,.55)] transition-transform hover:-translate-y-0.5"
          >
            <MousePointerClick size={17} aria-hidden="true" /> Enter the app
            <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-[var(--kl-night)]" aria-hidden="true">
              <ArrowDown size={18} />
            </span>
          </button>
          <span className="flex items-center gap-1.5 text-sm text-[var(--kl-low)]">
            <ArrowDown size={13} aria-hidden="true" /> or keep scrolling
          </span>
        </motion.div>
      </div>

      {/* A sketch of the window below: top bar, chips, three columns */}
      <Stage className="min-w-0 p-[clamp(16px,3vw,40px)]" glows={['var(--kl-sky)', '#D9A648']}>
        <div aria-hidden="true" className="overflow-hidden rounded-2xl bg-[var(--kl-surface)] shadow-[0_30px_60px_-34px_var(--kl-shadow)]">
          <div className="flex items-center gap-2 border-b border-[var(--kl-paper-2)] px-4 py-3">
            <span className="kl-orb-ring h-6 w-6 rounded-full" />
            <span className="h-2.5 w-24 rounded-full bg-[var(--kl-paper-2)]" />
            <span className="ms-auto h-2.5 w-16 rounded-full bg-[var(--kl-paper-2)]" />
          </div>
          <div className="flex gap-1.5 overflow-hidden border-b border-[var(--kl-paper-2)] px-4 py-2.5">
            {CHIPS.map((c, i) => (
              <span
                key={c}
                className={`rounded-full px-3 py-1 text-[11px] font-semibold ${i === 0 ? 'kl-sheen' : 'bg-[var(--kl-paper)] text-[var(--kl-mid)]'}`}
              >
                {c}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-[1fr_2.2fr_1fr] gap-3 p-3">
            <div className="space-y-2">
              {[70, 55, 80, 50].map((w, i) => (
                <span key={i} className="block h-2 rounded-full bg-[var(--kl-paper-2)]" style={{ width: `${w}%` }} />
              ))}
            </div>
            <div className="space-y-2.5">
              {[0, 1].map((i) => (
                <div key={i} className="rounded-xl bg-[var(--kl-paper)] p-3">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-[var(--kl-paper-2)]" />
                    <span className="h-2 w-20 rounded-full bg-[var(--kl-paper-2)]" />
                  </div>
                  <div className={`mt-2.5 h-16 rounded-lg bg-gradient-to-br ${i ? 'from-[#C9CDF5] to-[#E3ECF7]' : 'from-[#F0C878] to-[#F2B8A2]'}`} />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {[60, 85, 45].map((w, i) => (
                <span key={i} className="block h-8 rounded-lg bg-[var(--kl-paper)]" style={{ width: `${w + 15}%` }} />
              ))}
            </div>
          </div>
        </div>
      </Stage>
    </header>
  )
}
