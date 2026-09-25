import { useCallback, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { BadgeCheck, Check, Fingerprint, KeyRound, Send, Store, UserCheck } from 'lucide-react'
import { VerifiedBadge } from '@/components/ui-kit'
import { cn } from '@/lib/utils'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const CREDENTIAL_LINES: Array<{ text: ReactNode; indent: number }> = [
  { text: <span className="text-text-mid">{'{'}</span>, indent: 0 },
  { text: <><span className="text-gold">"@context"</span><span className="text-text-mid">: [</span><span className="text-success">"credentials/v2"</span><span className="text-text-mid">],</span></>, indent: 1 },
  { text: <><span className="text-gold">"type"</span><span className="text-text-mid">: [</span><span className="text-success">"VerifiableCredential"</span><span className="text-text-mid">, </span><span className="text-success">"KinjyReputation"</span><span className="text-text-mid">],</span></>, indent: 1 },
  { text: <><span className="text-gold">"issuer"</span><span className="text-text-mid">: </span><span className="text-sky">"did:kaluta:platform"</span><span className="text-text-mid">,</span></>, indent: 1 },
  { text: <><span className="text-gold">"subject"</span><span className="text-text-mid">: </span><span className="text-sky">"did:kinjy:member:demo-0042"</span><span className="text-text-mid">,</span></>, indent: 1 },
  { text: <><span className="text-gold">"claims"</span><span className="text-text-mid">: {'{'}</span></>, indent: 1 },
  { text: <><span className="text-gold">"expertise"</span><span className="text-text-mid">: [</span><span className="text-success">"safari-guiding"</span><span className="text-text-mid">, </span><span className="text-success">"swahili-literature"</span><span className="text-text-mid">],</span></>, indent: 2 },
  { text: <><span className="text-gold">"trustScore"</span><span className="text-text-mid">: </span><span className="text-gold-soft">96.4</span><span className="text-text-mid">,</span></>, indent: 2 },
  { text: <><span className="text-gold">"salesHistory"</span><span className="text-text-mid">: {'{'} </span><span className="text-gold">"orders"</span><span className="text-text-mid">: </span><span className="text-gold-soft">312</span><span className="text-text-mid">, </span><span className="text-gold">"disputes"</span><span className="text-text-mid">: </span><span className="text-gold-soft">1</span><span className="text-text-mid">, </span><span className="text-gold">"gmv"</span><span className="text-text-mid">: </span><span className="text-success">"$41,208"</span><span className="text-text-mid"> {'}'}</span></>, indent: 2 },
  { text: <span className="text-text-mid">{'}'},</span>, indent: 1 },
  { text: <><span className="text-gold">"proof"</span><span className="text-text-mid">: {'{'} </span><span className="text-gold">"type"</span><span className="text-text-mid">: </span><span className="text-success">"Ed25519Signature2020"</span><span className="text-text-mid">,</span></>, indent: 1 },
  { text: <><span className="text-gold">"signature"</span><span className="text-text-mid">: </span><span className="text-sky">"3Hb9xK…qF2mLz"</span><span className="text-text-mid"> {'}'}</span></>, indent: 2 },
  { text: <span className="text-text-mid">{'}'}</span>, indent: 0 },
]

type Phase = 'idle' | 'presenting' | 'verifying' | 'verified'

const PHASE_META: Record<Exclude<Phase, 'idle'>, { label: string; tone: string }> = {
  presenting: { label: 'presenting credential to MajiMart — a Kinjy sister platform…', tone: 'text-sky' },
  verifying: { label: 'resolving did:kaluta:platform#key-7 · checking signature…', tone: 'text-warning' },
  verified: { label: 'signature valid · claims accepted · no re-onboarding needed', tone: 'text-success' },
}

const ECOSYSTEM_USES = [
  { icon: Store, label: 'Marketplace', note: 'seller onboarding in one click — trust score and sales history carry over' },
  { icon: UserCheck, label: 'KYC', note: 'verification tier presented once, accepted everywhere in the ecosystem' },
  { icon: BadgeCheck, label: 'Sister platforms', note: 'expertise badges recognised on partner networks without rebuilding reputation' },
]

/** B8 — Verifiable Credentials & Portable Reputation. */
export default function VerifiableCredentials() {
  const reduced = useReducedMotion()
  const [phase, setPhase] = useState<Phase>('idle')

  useEffect(() => {
    if (phase !== 'presenting' && phase !== 'verifying') return
    const delay = reduced ? 60 : phase === 'presenting' ? 1100 : 1400
    const t = setTimeout(() => {
      setPhase((p) => (p === 'presenting' ? 'verifying' : 'verified'))
    }, delay)
    return () => clearTimeout(t)
  }, [phase, reduced])

  const present = useCallback(() => setPhase(reduced ? 'verified' : 'presenting'), [reduced])
  const reset = useCallback(() => setPhase('idle'), [])

  const busy = phase === 'presenting' || phase === 'verifying'

  return (
    <section className="twilight-field noise-overlay relative px-6 py-24 md:py-32">
      <div className="mx-auto max-w-container">
        <div className="grid items-center gap-14 lg:grid-cols-[5fr_6fr]">
          {/* Left copy */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ duration: 0.65, ease: EASE }}
          >
            <p className="eyebrow text-sky">Verifiable Credentials</p>
            <h2 className="h2 mt-4">
              Reputation you can <span className="text-gold-grad">carry in your pocket.</span>
            </h2>
            <p className="body-lg mt-5 text-text-mid">
              Expertise badges, trust scores and sales history export as cryptographically signed
              verifiable credentials. Present them anywhere — another platform verifies the
              signature, not your story.
            </p>
            <ul className="mt-8 space-y-4">
              {ECOSYSTEM_USES.map((u, i) => (
                <motion.li
                  key={u.label}
                  initial={{ opacity: 0, x: -18 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-10%' }}
                  transition={{ delay: 0.15 + i * 0.09, duration: 0.45, ease: EASE }}
                  className="flex items-start gap-3.5"
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-card-sm border border-sky/25 bg-sky/10 text-sky">
                    <u.icon size={15} aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-text-hi">{u.label}</p>
                    <p className="text-sm text-text-low">{u.note}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
            <p className="mt-8 border-l-2 border-gold/40 pl-4 text-sm leading-relaxed text-text-low">
              One identity, <span className="text-text-hi">portable across the ecosystem</span>:
              the marketplace, KYC and every sister platform read the same signed claims — you
              revoke them from one place.
            </p>
          </motion.div>

          {/* Right: credential card + present flow */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ duration: 0.7, ease: EASE }}
            className="cloud-card overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-white/10 bg-ink-3/70 px-5 py-3">
              <span className="mono-data flex items-center gap-2 text-xs text-text-low">
                <Fingerprint size={13} className="text-gold" aria-hidden="true" />
                reputation.kaluta.vc / export
              </span>
              {phase === 'idle' ? (
                <button
                  type="button"
                  onClick={present}
                  className="mono-data inline-flex items-center gap-1.5 rounded-full border border-gold/35 bg-gold/10 px-3 py-1 text-xs text-gold-soft transition-colors hover:bg-gold/20"
                >
                  <Send size={12} aria-hidden="true" /> present credential
                </button>
              ) : (
                <button
                  type="button"
                  onClick={reset}
                  disabled={busy}
                  className="mono-data inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-1 text-xs text-text-mid transition-colors hover:text-text-hi disabled:opacity-40"
                >
                  reset
                </button>
              )}
            </div>

            <div className="relative overflow-x-auto bg-ink-3/40 p-5">
              <motion.div
                animate={{
                  opacity: busy ? 0.55 : 1,
                  scale: phase === 'presenting' ? 0.985 : 1,
                  borderColor: phase === 'verified' ? 'rgba(63,178,127,0.5)' : 'rgba(255,255,255,0.14)',
                }}
                transition={{ duration: 0.4, ease: EASE }}
                className="rounded-card-md border bg-ink/80 p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="flex items-center gap-2 text-sm font-semibold text-text-hi">
                    <VerifiedBadge size={18} /> KinjyReputation credential
                  </p>
                  <span className="mono-data rounded-full border border-white/12 bg-white/[0.04] px-2.5 py-0.5 text-[0.6rem] text-text-low">
                    W3C VC 2.0
                  </span>
                </div>
                <pre className="font-mono text-[0.68rem] leading-relaxed">
                  {CREDENTIAL_LINES.map((l, i) => (
                    <div key={i} style={{ paddingInlineStart: `${l.indent * 1.1}rem` }}>
                      {l.text}
                    </div>
                  ))}
                </pre>
              </motion.div>

              {/* present/verify status line */}
              <AnimatePresence mode="wait">
                {phase !== 'idle' && (
                  <motion.div
                    key={phase}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.35, ease: EASE }}
                    className="mt-4"
                  >
                    <p className={cn('mono-data flex items-center gap-2 text-[0.72rem]', PHASE_META[phase].tone)}>
                      {phase === 'verified' ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success/15 text-success">
                          <Check size={12} aria-hidden="true" />
                        </span>
                      ) : (
                        <motion.span
                          aria-hidden="true"
                          className="h-2 w-2 rounded-full bg-current"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 0.9, repeat: Infinity }}
                        />
                      )}
                      {PHASE_META[phase].label}
                    </p>

                    {phase === 'verified' && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, duration: 0.45, ease: EASE }}
                        className="mt-3 grid gap-2 sm:grid-cols-3"
                      >
                        {['trustScore 96.4', '312 orders · 1 dispute', 'KYC tier 2'].map((c) => (
                          <span
                            key={c}
                            className="rounded-card-sm border border-success/30 bg-success/[0.07] px-3 py-2 text-center font-mono text-[0.65rem] text-success"
                          >
                            ✓ {c}
                          </span>
                        ))}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <p className="flex items-center gap-2 border-t border-white/10 px-5 py-3 font-mono text-[0.68rem] text-text-low">
              <KeyRound size={12} className="text-gold" aria-hidden="true" />
              keys held by the member · selective disclosure · revocable per verifier
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
