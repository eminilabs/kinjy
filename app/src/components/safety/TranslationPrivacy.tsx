import { motion } from 'framer-motion'
import { ScanSearch, Languages, Captions, AudioLines, Smile, Check, Shuffle, Smartphone } from 'lucide-react'
import { cn } from '@/lib/utils'

const PIPELINE = [
  { icon: ScanSearch, label: 'detect' },
  { icon: Languages, label: 'translate' },
  { icon: Captions, label: 'subtitle' },
  { icon: AudioLines, label: 'dub' },
  { icon: Smile, label: 'lip-sync' },
]

const PROVIDERS = ['Provider A', 'Provider B', 'On-device']

/**
 * TranslationPrivacy — refinement #14. Provider-independent language gateway with
 * privacy-aware routing; translated/dubbed media always labeled. E2E chats prefer
 * on-device translation.
 */
export default function TranslationPrivacy() {
  return (
    <section aria-labelledby="translation-heading" className="py-24">
      <div className="mx-auto grid max-w-container items-center gap-12 px-6 lg:grid-cols-[6fr_5fr]">
        {/* Pipeline visual */}
        <div className="cloud-card p-6 md:p-8">
          <p className="caption font-bold uppercase tracking-[0.14em] text-text-low">
            Language gateway · provider-independent
          </p>

          {/* pipeline steps light in sequence */}
          <div className="mt-6 flex flex-wrap items-center gap-y-4">
            {PIPELINE.map((p, i) => (
              <div key={p.label} className="flex items-center">
                <motion.div
                  initial={{ opacity: 0.35 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.4, delay: i * 0.22 }}
                  className="flex flex-col items-center gap-1.5"
                >
                  <motion.span
                    initial={{ borderColor: 'rgba(255,255,255,0.14)', color: '#6B7186' }}
                    whileInView={{ borderColor: 'rgba(217,166,72,0.55)', color: '#F0C878' }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.4, delay: i * 0.22 }}
                    className="flex h-12 w-12 items-center justify-center rounded-full border bg-ink-3"
                  >
                    <p.icon size={19} strokeWidth={1.8} />
                  </motion.span>
                  <span className="mono-data text-[0.62rem] text-text-mid">{p.label}</span>
                </motion.div>
                {i < PIPELINE.length - 1 && (
                  <motion.span
                    initial={{ scaleX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 0.35, delay: i * 0.22 + 0.12, ease: [0.65, 0, 0.35, 1] }}
                    className="mx-1.5 mb-5 h-px w-5 origin-left bg-gold/50 sm:w-8"
                    aria-hidden="true"
                  />
                )}
              </div>
            ))}
          </div>

          {/* model routing node */}
          <div className="mt-8 rounded-card-md border border-white/10 bg-ink-2/80 p-4">
            <p className="mono-data flex items-center gap-2 text-[0.72rem] text-sky">
              <Shuffle size={13} aria-hidden="true" /> model routing — language · quality · price ·
              latency · <span className="text-gold-soft">privacy</span>
            </p>
            <div className="mt-3.5 flex items-center gap-3">
              {PROVIDERS.map((p, i) => {
                const chosen = i === 2
                return (
                  <div key={p} className="flex items-center gap-3">
                    <motion.span
                      animate={
                        chosen
                          ? { borderColor: ['rgba(217,166,72,0.4)', 'rgba(217,166,72,0.9)', 'rgba(217,166,72,0.4)'] }
                          : {}
                      }
                      transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                      className={cn(
                        'mono-data rounded-full border px-3 py-1.5 text-[0.68rem]',
                        chosen
                          ? 'border-gold/60 bg-gold/10 text-gold-soft'
                          : 'border-white/12 bg-white/[0.03] text-text-low',
                      )}
                    >
                      {chosen && <Smartphone size={10} className="me-1 inline" aria-hidden="true" />}
                      {p}
                    </motion.span>
                    {i < PROVIDERS.length - 1 && (
                      <span className="mono-data text-[0.65rem] text-text-low" aria-hidden="true">
                        ⇄
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="caption mt-3">
              Sensitive content (E2E chats) is routed to privacy-preserving, on-device models
              first.
            </p>
          </div>
        </div>

        {/* Copy */}
        <div>
          <p className="eyebrow text-gold">Refinement #14 · Translation privacy</p>
          <h2 id="translation-heading" className="h2 mt-3">
            Every language welcome. No conversation mined.
          </h2>
          <ul className="mt-6 space-y-3.5 text-sm text-text-mid">
            {[
              'Provider-independent language gateway — never hard-coded to one vendor.',
              'Automatic language detection with one-click translate and side-by-side view.',
              'Video pipeline: speech recognition → transcript → translation → subtitles → AI dubbing → voice-preserving dubbing → lip sync.',
              'Sensitive content is routed to privacy-preserving models; E2E chats prefer on-device translation.',
              'Translated, dubbed or lip-synced media is always labeled AI Generated.',
            ].map((line, i) => (
              <motion.li
                key={line}
                initial={{ opacity: 0, x: 18 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.6 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                className="flex gap-2.5"
              >
                <Check size={15} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                <span>{line}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
