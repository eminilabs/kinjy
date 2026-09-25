import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Aperture,
  Camera,
  Check,
  Crop,
  Fingerprint,
  Lock,
  PenLine,
  ShieldCheck,
  Wand2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ArcButton, ProvenanceTag } from '@/components/ui-kit'
import { EASE, useReducedMotion } from './motion-utils'

const CHAIN = [
  { icon: Camera, label: 'Captured', detail: 'Signed at the sensor — credentials embedded instantly' },
  { icon: Crop, label: 'Cropped', detail: 'Edit recorded, signature re-sealed' },
  { icon: Wand2, label: 'Color graded', detail: 'Edit recorded, signature re-sealed' },
  { icon: PenLine, label: 'Captioned', detail: 'Final seal — full history intact' },
]

const MANIFEST_LINES = [
  ['issuer', 'Kinjy Capture Service (C2PA 2.1)'],
  ['claim_generator', 'kaluta-app/4.7.2 (ios)'],
  ['asset_hash_sha256', 'b7a1…f09c · img · 4032×3024'],
  ['captured_at', '2025-11-14T06:42:18Z · Kigoma, TZ'],
  ['edit_chain', 'crop → color_grade → caption (3 edits)'],
  ['ai_assertion', 'none — no generative edits declared'],
  ['signature', 'ECDSA P-256 · valid · chain unbroken'],
]

/**
 * ProvenanceSigning — C2PA cryptographic provenance signing (B5). Upgrade story
 * for the provenance labels: credentials signed at capture, preserved through an
 * edit chain, and a "Verify" interaction that unfolds the signed manifest.
 */
export default function ProvenanceSigning() {
  const reduced = useReducedMotion()
  const [verified, setVerified] = useState(false)

  return (
    <section aria-labelledby="c2pa-heading" className="noise-overlay twilight-field px-6 py-24">
      <div className="mx-auto max-w-container">
        <div className="max-w-2xl">
          <p className="eyebrow text-sky">C2PA Provenance Signing</p>
          <h2 id="c2pa-heading" className="h2 mt-3">
            Verifiable authenticity for the{' '}
            <span className="font-display italic text-gold-grad">synthetic-media era.</span>
          </h2>
          <p className="body-lg mt-4 text-text-mid">
            Labels tell you what we believe. C2PA credentials prove it. Media captured on Kinjy is
            cryptographically signed at the moment of capture — and the signature survives every
            honest edit.
          </p>
        </div>

        <div className="mt-14 grid items-start gap-8 lg:grid-cols-[1.15fr_1fr]">
          {/* Edit chain visualization */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ duration: 0.7, ease: EASE }}
            className="cloud-card p-5"
          >
            <div className="flex flex-wrap items-center gap-3 border-b border-white/10 pb-4">
              <div className="relative h-16 w-24 overflow-hidden rounded-card-sm">
                <img src="/avatars-set.jpg" alt="Uploaded photo with signed content credentials" className="h-full w-full object-cover" />
                <span className="absolute inset-0 bg-gradient-to-t from-ink-3/70 to-transparent" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-hi">market-morning.jpg</p>
                <p className="caption">Uploaded by @local.lens · carries content credentials</p>
              </div>
              <div className="ms-auto flex gap-1.5">
                <ProvenanceTag kind="original" />
                <ProvenanceTag kind="edited" />
              </div>
            </div>

            {/* chain nodes */}
            <ol className="mt-6 space-y-0">
              {CHAIN.map((step, i) => (
                <motion.li
                  key={step.label}
                  initial={reduced ? false : { opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ duration: 0.5, delay: i * 0.12, ease: EASE }}
                  className="relative flex items-start gap-4 pb-6 last:pb-0"
                >
                  {/* connecting line with arc gradient */}
                  {i < CHAIN.length - 1 && (
                    <motion.span
                      aria-hidden="true"
                      className="absolute start-[1.05rem] top-10 w-px origin-top"
                      style={{ height: 'calc(100% - 2.2rem)', background: 'var(--grad-arc)' }}
                      initial={reduced ? false : { scaleY: 0 }}
                      whileInView={{ scaleY: 1 }}
                      viewport={{ once: true, amount: 0.6 }}
                      transition={{ duration: 0.6, delay: i * 0.12 + 0.25, ease: [0.65, 0, 0.35, 1] }}
                    />
                  )}
                  <span
                    className={cn(
                      'z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border',
                      i === 0
                        ? 'border-gold/60 bg-gold/15 text-gold-soft'
                        : 'border-white/15 bg-ink-3 text-sky',
                    )}
                  >
                    <step.icon size={15} aria-hidden="true" />
                  </span>
                  <div className="flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-text-hi">
                      {step.label}
                      <span className="mono-data inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[0.6rem] uppercase tracking-wider text-success">
                        <Lock size={9} aria-hidden="true" />
                        {i === 0 ? 'signed' : 'sealed'}
                      </span>
                    </p>
                    <p className="caption mt-0.5">{step.detail}</p>
                  </div>
                </motion.li>
              ))}
            </ol>

            <p className="caption mt-5 border-t border-white/10 pt-4">
              Break the chain — strip metadata or synthesize the content — and the credential
              check fails publicly.
            </p>
          </motion.div>

          {/* Verify interaction → signed manifest */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ duration: 0.7, delay: 0.12, ease: EASE }}
            className="cloud-card p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="mono-data flex items-center gap-2 text-[0.7rem] uppercase tracking-wider text-text-low">
                <Fingerprint size={13} className="text-gold" aria-hidden="true" /> Content credentials
              </p>
              <ArcButton
                size="sm"
                variant={verified ? 'ghost' : 'indigo'}
                onClick={() => setVerified((v) => !v)}
                aria-expanded={verified}
              >
                {verified ? (
                  <>
                    <ShieldCheck size={14} className="text-success" aria-hidden="true" /> Verified
                  </>
                ) : (
                  <>
                    <Aperture size={14} aria-hidden="true" /> Verify
                  </>
                )}
              </ArcButton>
            </div>

            <AnimatePresence initial={false}>
              {verified ? (
                <motion.div
                  key="manifest"
                  initial={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={reduced ? { opacity: 0 } : { opacity: 0, height: 0 }}
                  transition={{ duration: 0.55, ease: EASE }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 rounded-card-md border border-gold/30 bg-ink-3/80 p-4">
                    <p className="flex items-center gap-2 text-sm font-semibold text-success">
                      <Check size={15} aria-hidden="true" /> Signature valid — chain unbroken
                    </p>
                    <dl className="mono-data mt-3 space-y-2 text-[0.72rem] leading-relaxed">
                      {MANIFEST_LINES.map(([k, v], i) => (
                        <motion.div
                          key={k}
                          initial={reduced ? false : { opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.35, delay: reduced ? 0 : 0.15 + i * 0.07, ease: EASE }}
                          className="flex flex-wrap gap-x-3"
                        >
                          <dt className="w-40 shrink-0 text-text-low">{k}</dt>
                          <dd className="text-gold-soft">{v}</dd>
                        </motion.div>
                      ))}
                    </dl>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="sealed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 flex min-h-[15rem] flex-col items-center justify-center rounded-card-md border border-dashed border-white/15 p-6 text-center"
                >
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold/10">
                    <Lock size={20} className="text-gold-soft" aria-hidden="true" />
                  </span>
                  <p className="caption mt-3 max-w-[17rem]">
                    This upload carries a sealed C2PA manifest. Tap Verify to unfold the signed
                    record — issuer, timestamp, and hash.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-card-sm border border-white/10 bg-ink-3/60 p-3">
                <p className="mono-data text-[0.65rem] uppercase tracking-wider text-text-low">Signed at</p>
                <p className="mt-1 text-sm font-semibold text-text-hi">Capture, not upload</p>
              </div>
              <div className="rounded-card-sm border border-white/10 bg-ink-3/60 p-3">
                <p className="mono-data text-[0.65rem] uppercase tracking-wider text-text-low">Standard</p>
                <p className="mt-1 text-sm font-semibold text-text-hi">Open C2PA 2.1</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
