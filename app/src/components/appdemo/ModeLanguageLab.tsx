import { motion } from 'framer-motion'
import { Cloudy, Languages, MonitorSmartphone, Moon, Share2, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AMBIENTS, useAppTheme } from './theme'
import type { Ambient, AppLang, DisplayMode } from './theme'
import { Eyebrow } from '@/components/landing/PageKit'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const MODES: { id: DisplayMode; label: string; icon: typeof Cloudy; note: string }[] = [
  { id: 'cloud', label: 'Cloud', icon: Cloudy, note: 'Signature · translucent glass over a living sky' },
  { id: 'light', label: 'Light', icon: Sun, note: 'Archival paper · warm and editorial' },
  { id: 'dark', label: 'Dark', icon: Moon, note: 'Solid ink · no blur, low-power friendly' },
  { id: 'system', label: 'System', icon: MonitorSmartphone, note: 'Follows your OS preference' },
]

const LANGS: { id: AppLang; label: string; sample: string }[] = [
  { id: 'en', label: 'English', sample: 'Share with your world…' },
  { id: 'sw', label: 'Kiswahili', sample: 'Shiriki na ulimwengu wako…' },
  { id: 'fr', label: 'Français', sample: 'Partagez avec votre monde…' },
  { id: 'ar', label: 'العربية', sample: 'شارك مع عالمك… (RTL flip)' },
  { id: 'zh', label: '中文', sample: '与你的全世界分享…' },
]

/** Section 7 — display-mode lab + language lab (drives the app frame above). */
export default function ModeLanguageLab() {
  const { mode, setMode, resolved, ambient, setAmbient, lang, setLang } = useAppTheme()

  return (
    <section className="kl-pad-x scroll-mt-24 border-t border-[var(--kl-paper-2)] py-[clamp(72px,9vw,120px)]">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-2">
        {/* Mode lab */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.6, ease: EASE }}
        >
          <Eyebrow>Display modes</Eyebrow>
          <h2 className="kl-h2 mt-5 max-w-[900px]">
            Four modes. <span className="text-[var(--kl-gold-deep)]">One tap.</span>
          </h2>
          <p className="kl-lead mt-6 !max-w-[560px]">
            Switch and watch the app frame above restyle itself live — surfaces, shadows, sky and all.
          </p>

          <div className="mt-7 grid grid-cols-2 gap-3">
            {MODES.map((m) => {
              const active = mode === m.id
              return (
                <motion.button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  whileTap={{ scale: 0.97 }}
                  aria-pressed={active}
                  className={cn(
                    'rounded-card-md border p-4 text-start transition-all duration-300',
                    active ? 'border-gold/50 bg-gold/10 shadow-gold-ring' : 'cloud-glass hover:border-gold/25',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <m.icon size={16} className={active ? 'text-gold-soft' : 'text-text-mid'} aria-hidden="true" />
                    <span className={cn('text-sm font-bold', active ? 'text-gold-soft' : 'text-text-hi')}>{m.label}</span>
                    {active && <span className="ms-auto h-2 w-2 rounded-full bg-gold" aria-hidden="true" />}
                  </span>
                  <span className="mt-1.5 block text-[0.68rem] leading-snug text-text-low">{m.note}</span>
                </motion.button>
              )
            })}
          </div>

          {/* ambient sky picker (Cloud only) */}
          <div className={cn('mt-6 transition-opacity duration-300', resolved === 'cloud' ? 'opacity-100' : 'pointer-events-none opacity-35')}>
            <p className="mb-2.5 text-[0.68rem] font-bold uppercase tracking-wider text-text-low">
              Cloud ambient sky
            </p>
            <div className="flex gap-2.5">
              {(Object.keys(AMBIENTS) as Ambient[]).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAmbient(a)}
                  aria-pressed={ambient === a}
                  title={AMBIENTS[a].label}
                  className={cn(
                    'h-11 w-16 rounded-card-sm ring-2 transition-all duration-300',
                    ambient === a ? 'ring-gold scale-105' : 'ring-white/15 hover:ring-white/30',
                  )}
                  style={{ background: AMBIENTS[a].swatch }}
                >
                  <span className="sr-only">{AMBIENTS[a].label}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Language lab */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ delay: 0.1, duration: 0.6, ease: EASE }}
        >
          <Eyebrow>Language lab</Eyebrow>
          <h2 className="kl-h2 mt-5 max-w-[900px]">
            The whole shell, <span className="text-[var(--kl-gold-deep)]">re-labeled live.</span>
          </h2>
          <p className="kl-lead mt-6 !max-w-[560px]">
            Pick a language — the app chrome above switches instantly. العربية flips the entire shell to RTL:
            nav order reverses, the feed mirrors, arcs change direction.
          </p>

          <div className="mt-7 flex flex-wrap gap-2">
            {LANGS.map((l) => {
              const active = lang === l.id
              return (
                <motion.button
                  key={l.id}
                  type="button"
                  onClick={() => setLang(l.id)}
                  whileTap={{ scale: 0.95 }}
                  aria-pressed={active}
                  transition={{ ease: [0.34, 1.56, 0.64, 1] }}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-bold transition-all duration-300',
                    active
                      ? 'bg-gradient-to-br from-gold-soft to-gold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]'
                      : 'cloud-glass text-text-mid hover:border-gold/30 hover:text-text-hi',
                  )}
                >
                  {l.label}
                </motion.button>
              )
            })}
          </div>

          <div className="cloud-card mt-6 flex items-center gap-3 p-4">
            <Languages size={18} className="shrink-0 text-sky" aria-hidden="true" />
            <p className="text-sm text-text-mid" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
              <span className="font-bold text-text-hi">{LANGS.find((l) => l.id === lang)?.sample}</span>
              {' — '}
              {lang === 'ar' ? 'the shell above is now right-to-left.' : 'composer placeholder, live from the app frame.'}
            </p>
          </div>

          {/* share card */}
          <div className="cloud-card cloud-card-hover mt-6 overflow-hidden">
            <img src="/app-feed-mock.jpg" alt="The Kinjy feed in Cloud mode — glass cards and gold feed chips" className="aspect-[16/8] w-full object-cover" loading="lazy" />
            <div className="flex items-center gap-3 p-4">
              <Share2 size={15} className="text-gold" aria-hidden="true" />
              <p className="text-xs text-text-mid">
                Share the app — every invite renders this Cloud-mode card.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
