import { motion } from 'framer-motion'
import { MessageSquarePlus, Sparkles } from 'lucide-react'
import { ProvenanceTag } from '@/components/ui-kit'
import type { ProvenanceKind } from '@/components/ui-kit'

const TAGS: { kind: ProvenanceKind; rotate: number; y: number }[] = [
  { kind: 'original', rotate: -16, y: 6 },
  { kind: 'edited', rotate: -8, y: 0 },
  { kind: 'ai-assisted', rotate: 0, y: -4 },
  { kind: 'ai-generated', rotate: 8, y: 0 },
  { kind: 'verified', rotate: 16, y: 6 },
]

/**
 * HonestContent — provenance fan (all 5 ProvenanceTags) + Community Notes demo:
 * AI suggests context to note-writers, never auto-declares truth.
 */
export default function HonestContent() {
  return (
    <section aria-labelledby="honest-heading" className="py-24">
      <div className="mx-auto max-w-container px-6">
        <p className="eyebrow text-gold">Honest content</p>
        <h2 id="honest-heading" className="h2 mt-3 max-w-2xl">
          Labels that tell the truth. Notes written by people.
        </h2>

        <div className="mt-12 grid gap-10 lg:grid-cols-2">
          {/* Provenance fan */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="cloud-card overflow-hidden"
            >
              <div className="relative h-44 overflow-hidden">
                <img src="/avatars-set.jpg" alt="Community media collage" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-3 to-transparent" aria-hidden="true" />
                <div className="absolute start-4 top-4">
                  <ProvenanceTag kind="verified" />
                </div>
              </div>
              <div className="p-5">
                <p className="text-sm font-semibold text-text-hi">Neighborhood festival — full photo set</p>
                <p className="caption mt-1">Posted by @local.lens · Public · Dar es Salaam</p>

                {/* the tag fan */}
                <div className="mt-6 flex flex-wrap items-end justify-center gap-2 pb-2">
                  {TAGS.map((tag, i) => (
                    <motion.span
                      key={tag.kind}
                      initial={{ opacity: 0, rotate: 0, y: 16 }}
                      whileInView={{ opacity: 1, rotate: tag.rotate, y: tag.y }}
                      viewport={{ once: true, amount: 0.65 }}
                      transition={{
                        type: 'spring',
                        stiffness: 260,
                        damping: 18,
                        delay: 0.2 + i * 0.06,
                      }}
                      className="inline-block"
                    >
                      <ProvenanceTag kind={tag.kind} />
                    </motion.span>
                  ))}
                </div>
              </div>
            </motion.div>
            <p className="caption mt-4 text-center">Every piece of media declares its origin.</p>
          </div>

          {/* Community Notes demo */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="cloud-card p-5"
            >
              <div className="flex items-center gap-2.5">
                <span className="h-9 w-9 rounded-full bg-gradient-to-br from-coral to-gold/70" />
                <div>
                  <p className="text-sm font-semibold text-text-hi">@breaking.now</p>
                  <p className="caption">2h · For You</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-text-hi">
                "Unbelievable scenes from the harbor this morning — the city has never seen
                anything like this."
              </p>
              <div className="mt-3 flex h-28 items-center justify-center rounded-card-sm border border-white/8 bg-gradient-to-br from-indigo-deep/60 to-ink-3">
                <span className="mono-data text-[0.7rem] text-text-low">video · 0:47</span>
              </div>

              {/* Community Note — unfolds after the post settles */}
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                whileInView={{ opacity: 1, height: 'auto' }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.5, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-4 rounded-card-md border border-gold/40 bg-gold/[0.09] p-4">
                  <p className="flex items-center gap-2 text-[0.8rem] font-bold text-gold-soft">
                    <MessageSquarePlus size={15} aria-hidden="true" /> Readers added context
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-text-hi">
                    This video is from 2019, not current events. The same footage circulated after
                    a storm six years ago.
                  </p>
                  <p className="mono-data mt-2.5 flex items-center gap-1.5 text-[0.68rem] text-text-low">
                    <Sparkles size={11} className="text-sky" aria-hidden="true" />
                    AI suggested source matches to note-writers · written & rated by members
                  </p>
                </div>
              </motion.div>
            </motion.div>
            <p className="body-lg mx-auto mt-6 max-w-md text-center font-display italic text-gold-soft">
              "AI suggests context to note-writers. It never auto-declares truth. People, aided by
              AI, keep each other honest."
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
