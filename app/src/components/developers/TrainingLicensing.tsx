import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Ban, FileBadge2, FileText, Mic2, ScrollText, Video } from 'lucide-react'
import { LedgerRow, ModeChip } from '@/components/ui-kit'
import { cn } from '@/lib/utils'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

type Medium = 'text' | 'video' | 'voice'

const MEDIA: Array<{ id: Medium; label: string; icon: typeof FileText; note: string }> = [
  { id: 'text', label: 'Text', icon: FileText, note: 'articles · forum posts · newsletters' },
  { id: 'video', label: 'Video', icon: Video, note: 'published cuts · transcripts' },
  { id: 'voice', label: 'Voice', icon: Mic2, note: 'podcasts · narration' },
]

const DURATIONS = ['6 months', '12 months', '24 months'] as const

const TARGET_REQUESTS = 1284

/** B9 — Creator AI-Training Licensing: opt-in consent, live certificate, ledger payouts. */
export default function TrainingLicensing() {
  const reduced = useReducedMotion()
  const [optedIn, setOptedIn] = useState(false)
  const [revokedOnce, setRevokedOnce] = useState(false)
  const [scopes, setScopes] = useState<Record<Medium, boolean>>({ text: true, video: false, voice: true })
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>('12 months')
  const [requests, setRequests] = useState(0)
  const rafRef = useRef<number | null>(null)

  const activeScopes = (Object.keys(scopes) as Medium[]).filter((m) => scopes[m])

  // Animated "licensed requests" counter while opted in.
  useEffect(() => {
    if (!optedIn) {
      setRequests(0)
      return
    }
    if (reduced) {
      setRequests(TARGET_REQUESTS)
      return
    }
    const start = performance.now()
    const from = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1600)
      const eased = 1 - Math.pow(1 - t, 3)
      setRequests(Math.round(from + (TARGET_REQUESTS - from) * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [optedIn, reduced])

  const toggleScope = (m: Medium) => setScopes((s) => ({ ...s, [m]: !s[m] }))

  const revoke = () => {
    setOptedIn(false)
    setRevokedOnce(true)
  }

  return (
    <section className="noise-overlay relative bg-ink px-6 py-24 md:py-32">
      <div className="mx-auto max-w-container">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-15%' }}
          transition={{ duration: 0.65, ease: EASE }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="eyebrow text-gold">AI-Training Licensing</p>
          <h2 className="h2 mt-4">
            Your catalog, licensed — <span className="text-arc-grad">never scraped.</span>
          </h2>
          <p className="body-lg mt-5 text-text-mid">
            Creators opt in to license their content for AI training through the agent-readable
            licensing controls. Granular scopes, hard expiry, instant revocation — and every
            licensed request pays out through the immutable ledger.
          </p>
        </motion.div>

        <div className="mt-16 grid gap-10 lg:grid-cols-[5fr_6fr]">
          {/* Left: consent panel */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ duration: 0.7, ease: EASE }}
            className="cloud-card flex flex-col p-7"
          >
            <h3 className="h3 mb-1 flex items-center gap-2.5">
              <ScrollText size={19} className="text-gold" aria-hidden="true" />
              Consent panel
            </h3>
            <p className="mb-6 text-sm text-text-low">
              Default is <span className="font-semibold text-text-hi">off</span>. Nothing trains on
              your work until you say so — scope by scope.
            </p>

            <p className="eyebrow mb-3 text-[0.62rem] text-text-low">content scopes</p>
            <div className="space-y-2.5">
              {MEDIA.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleScope(m.id)}
                  aria-pressed={scopes[m.id]}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-card-md border px-4 py-3 text-start transition-all duration-200 ease-cloud-ease',
                    scopes[m.id]
                      ? 'border-gold/45 bg-gold/[0.07]'
                      : 'border-white/12 bg-white/[0.03] hover:border-white/25',
                  )}
                >
                  <span className="flex items-center gap-3">
                    <m.icon size={16} className={scopes[m.id] ? 'text-gold-soft' : 'text-text-low'} aria-hidden="true" />
                    <span>
                      <span className={cn('block text-sm font-semibold', scopes[m.id] ? 'text-text-hi' : 'text-text-mid')}>
                        {m.label}
                      </span>
                      <span className="block font-mono text-[0.62rem] text-text-low">{m.note}</span>
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      'relative w-10 shrink-0 rounded-full border transition-colors duration-200',
                      scopes[m.id] ? 'border-gold/50 bg-gold/25' : 'border-white/15 bg-white/[0.05]',
                    )}
                    style={{ height: 22 }}
                  >
                    <motion.span
                      className="absolute left-0 top-[2px] h-4 w-4 rounded-full"
                      style={{ background: scopes[m.id] ? 'var(--grad-gold-sheen)' : '#6B7186' }}
                      animate={{ x: scopes[m.id] ? 19 : 3 }}
                      transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
                    />
                  </span>
                </button>
              ))}
            </div>

            <p className="eyebrow mb-3 mt-6 text-[0.62rem] text-text-low">license duration</p>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <ModeChip key={d} label={d} active={duration === d} onClick={() => setDuration(d)} />
              ))}
            </div>

            <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
              {!optedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    setOptedIn(true)
                    setRevokedOnce(false)
                  }}
                  disabled={activeScopes.length === 0}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-sm font-semibold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-transform duration-200 ease-snap-ease hover:scale-[1.02] active:scale-95 disabled:opacity-40"
                >
                  <FileBadge2 size={15} aria-hidden="true" />
                  Opt in to training licensing
                </button>
              ) : (
                <button
                  type="button"
                  onClick={revoke}
                  className="inline-flex items-center gap-2 rounded-full border border-danger/45 bg-danger/10 px-5 py-2.5 text-sm font-semibold text-danger transition-colors hover:bg-danger/20"
                >
                  <Ban size={15} aria-hidden="true" />
                  Revoke license
                </button>
              )}
              <AnimatePresence mode="wait">
                <motion.span
                  key={optedIn ? 'on' : revokedOnce ? 'revoked' : 'off'}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className={cn(
                    'mono-data text-[0.68rem]',
                    optedIn ? 'text-success' : revokedOnce ? 'text-danger' : 'text-text-low',
                  )}
                >
                  {optedIn
                    ? '✓ license active · revocable anytime · 48h purge SLA'
                    : revokedOnce
                      ? 'revoked · purge of derived training data ≤ 48h'
                      : 'opted out · zero training access'}
                </motion.span>
              </AnimatePresence>
            </div>
          </motion.div>

          {/* Right: certificate + ledger + counter */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-15%' }}
            transition={{ delay: 0.1, duration: 0.7, ease: EASE }}
            className="flex flex-col gap-5"
          >
            <div className="cloud-card overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 bg-ink-3/70 px-5 py-3">
                <span className="mono-data flex items-center gap-2 text-xs text-text-low">
                  <FileBadge2 size={13} className="text-gold" aria-hidden="true" />
                  license.certificate / KTL-2025-00841
                </span>
                <span
                  className={cn(
                    'mono-data rounded-full border px-2.5 py-0.5 text-[0.6rem]',
                    optedIn
                      ? 'border-success/35 bg-success/10 text-success'
                      : 'border-white/12 bg-white/[0.04] text-text-low',
                  )}
                >
                  {optedIn ? 'active' : 'specimen'}
                </span>
              </div>
              <div className="bg-ink-3/40 p-5">
                <div className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                  {[
                    ['creator', 'did:kinjy:member:demo-0042'],
                    ['scopes', activeScopes.length ? activeScopes.join(' · ') : '— none selected'],
                    ['duration', duration],
                    ['revocation', 'instant · 48h purge SLA'],
                    ['compensation', '70% creator / 25% platform / 5% Pool'],
                    ['routing', 'immutable ledger · settled monthly'],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-baseline justify-between gap-3 border-b border-white/8 pb-1.5">
                      <span className="font-mono text-[0.65rem] uppercase tracking-wider text-text-low">{k}</span>
                      <span className="mono-data text-right text-[0.72rem] text-text-hi">{v}</span>
                    </div>
                  ))}
                </div>
                <p className="mono-data mt-4 text-[0.65rem] text-text-low">
                  usage terms: training only · no redistribution · attribution retained ·
                  provenance tag <span className="text-sky">AI Generated</span> required on outputs
                </p>
              </div>
              <div className="flex items-center justify-between border-t border-white/10 px-5 py-3.5">
                <span className="mono-data text-[0.68rem] text-text-low">licensed requests this month</span>
                <span className="mono-data text-lg font-semibold text-gold-grad" aria-live="polite">
                  {optedIn ? requests.toLocaleString('en-US') : '0'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="eyebrow text-[0.62rem] text-text-low">compensation · immutable ledger</p>
              <LedgerRow id="lg-8841" label="Training license — text corpus (Q4)" amount="+$212.40" reconciled timestamp="Nov 30" />
              <LedgerRow id="lg-8907" label="Voice narration license — podcast set" amount="+$96.15" reconciled timestamp="Nov 30" />
              <LedgerRow id="lg-8912" label="Kinjy Leaders contribution (5%)" amount="+$15.42" reconciled={false} timestamp="Dec 01" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
