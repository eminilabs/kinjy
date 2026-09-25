import { motion } from 'framer-motion'
import { Fingerprint, Server, Database, KeyRound, X, MailCheck, Smartphone, Usb, BellRing, Laptop } from 'lucide-react'

const CHIPS = [
  { icon: MailCheck, label: 'Email OTP' },
  { icon: Smartphone, label: 'Authenticator apps' },
  { icon: Usb, label: 'Hardware keys' },
  { icon: BellRing, label: 'Login alerts' },
  { icon: Laptop, label: 'Device management' },
]

/**
 * PasskeysSection — refinement #5. Device-level passkeys: biometrics unlock locally;
 * only a public key travels. Explicitly contrasted with a crossed-out central
 * biometric database.
 */
export default function PasskeysSection() {
  return (
    <section aria-labelledby="passkeys-heading" className="twilight-field noise-overlay py-24">
      <div className="mx-auto grid max-w-container items-center gap-12 px-6 lg:grid-cols-[5fr_6fr]">
        {/* Copy */}
        <div>
          <p className="eyebrow text-gold">Sign-in security</p>
          <h2 id="passkeys-heading" className="h2 mt-3">
            Your face never leaves your phone.
          </h2>
          <p className="body-lg mt-5 max-w-lg text-text-mid">
            Kinjy uses <strong className="text-text-hi">device-level passkeys</strong> — your
            phone or computer unlocks locally with its own biometrics. There is{' '}
            <strong className="text-gold-soft">no central fingerprint or facial database</strong>{' '}
            to breach. Nothing biometric is ever transmitted or stored by us.
          </p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            {CHIPS.map((chip, i) => (
              <motion.span
                key={chip.label}
                initial={{ opacity: 0, scale: 0.7 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.65 }}
                transition={{ duration: 0.4, delay: i * 0.08, ease: [0.34, 1.56, 0.64, 1] }}
                className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/5 px-3.5 py-2 text-[0.8rem] font-semibold text-text-hi"
              >
                <chip.icon size={14} className="text-sky" aria-hidden="true" />
                {chip.label}
              </motion.span>
            ))}
          </div>
        </div>

        {/* Visual: phone → public key → server; crossed-out biometric DB */}
        <div className="cloud-card relative p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-center gap-4 md:justify-between">
            {/* Phone */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative flex h-36 w-[76px] items-center justify-center rounded-[18px] border border-white/20 bg-ink-3 shadow-cloud">
                <span className="absolute top-1.5 h-1 w-8 rounded-full bg-white/20" aria-hidden="true" />
                <motion.span
                  animate={{ opacity: [0.55, 1, 0.55], scale: [1, 1.08, 1] }}
                  transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-gold-soft drop-shadow-[0_0_10px_rgba(240,200,120,0.7)]"
                >
                  <Fingerprint size={34} strokeWidth={1.6} />
                </motion.span>
              </div>
              <p className="mono-data text-[0.65rem] text-text-low">unlocks locally</p>
            </div>

            {/* Arc + travelling key token (fixed 140px so offset-path matches 1:1) */}
            <div className="relative h-20 w-[140px] shrink-0" aria-hidden="true">
              <svg viewBox="0 0 140 80" width={140} height={80} fill="none">
                <path
                  id="passkey-arc"
                  d="M4 60 C 40 12, 100 12, 136 60"
                  stroke="url(#passkey-grad)"
                  strokeWidth={1.6}
                  strokeDasharray="4 5"
                  opacity={0.7}
                />
                <defs>
                  <linearGradient id="passkey-grad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#F0C878" />
                    <stop offset="55%" stopColor="#D9A648" />
                    <stop offset="100%" stopColor="#8FB8E8" />
                  </linearGradient>
                </defs>
              </svg>
              <motion.span
                className="absolute top-0 start-0 flex items-center gap-1.5 rounded-full border border-gold/50 bg-ink px-2.5 py-1"
                animate={{
                  offsetDistance: ['0%', '100%'],
                  opacity: [0, 1, 1, 0],
                }}
                style={{ offsetPath: "path('M4 60 C 40 12, 100 12, 136 60')" }}
                transition={{ duration: 3.5, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }}
              >
                <KeyRound size={11} className="text-gold-soft" />
                <span className="mono-data text-[0.6rem] text-gold-soft">public key</span>
              </motion.span>
            </div>

            {/* Server */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-20 w-16 flex-col items-center justify-center gap-1.5 rounded-card-md border border-white/20 bg-ink-3 shadow-cloud">
                <Server size={26} className="text-sky" strokeWidth={1.6} />
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                </span>
              </div>
              <p className="mono-data text-[0.65rem] text-text-low">kaluta server</p>
            </div>
          </div>

          {/* Crossed-out biometric database */}
          <div className="mt-6 flex items-center justify-center gap-3 border-t border-white/8 pt-5">
            <motion.div
              animate={{ x: [0, -2, 2, -1, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="relative flex items-center gap-2.5 rounded-card-md border border-danger/30 px-4 py-2.5 opacity-20"
            >
              <Database size={20} className="text-danger" strokeWidth={1.6} />
              <span className="mono-data text-[0.68rem] text-danger">central biometric DB</span>
              <span className="absolute inset-0 flex items-center justify-center">
                <X size={44} className="text-danger" strokeWidth={2.4} aria-hidden="true" />
              </span>
            </motion.div>
            <p className="mono-data text-[0.68rem] text-text-low">
              no biometric storage —<br />
              nothing to breach
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
