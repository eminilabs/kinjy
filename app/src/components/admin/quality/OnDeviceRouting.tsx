import { motion, useReducedMotion } from 'framer-motion'
import { Smartphone, Cloud, Lock, ShieldCheck, HeartHandshake, Baby } from 'lucide-react'
import { Chip, SubSection } from './primitives'

const PATHS = [
  {
    icon: Baby,
    name: 'Teen mode conversations',
    route: 'on-device 1.8B',
    badges: ['on-device only', 'no telemetry'],
    device: true,
  },
  {
    icon: Lock,
    name: 'E2E encrypted chats',
    route: 'on-device 1.8B',
    badges: ['E2E sealed', 'zero cloud copy'],
    device: true,
  },
  {
    icon: HeartHandshake,
    name: 'Memorial & grief content',
    route: 'on-device → consent-gated cloud',
    badges: ['dignity class', 'consent gate'],
    device: true,
  },
  {
    icon: ShieldCheck,
    name: 'Public feed summaries',
    route: 'cloud · gateway pool',
    badges: ['public corpus'],
    device: false,
  },
]

/**
 * OnDeviceRouting (C4) — privacy-sensitive paths routed to on-device small models.
 * A device-vs-cloud routing diagram with privacy badges and the signature golden arc.
 */
export default function OnDeviceRouting() {
  const reduceMotion = useReducedMotion()

  return (
    <SubSection
      id="on-device-routing"
      eyebrow="C4 · On-Device Small Models"
      title={
        <>
          <Smartphone size={19} className="me-2 inline text-gold" aria-hidden="true" />
          Some thoughts never leave the device.
        </>
      }
      blurb="Privacy-sensitive paths — teen mode, E2E chats, memorial content — route to a 1.8B-parameter on-device model by policy, not preference. The gateway cannot see sealed traffic; it only sees a routing receipt."
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        {/* Routing diagram */}
        <div className="rounded-card-md border border-white/8 bg-ink-3/50 p-5">
          <div className="relative grid grid-cols-[1fr_72px_1fr] items-center gap-2">
            {/* device node */}
            <div className="rounded-card-md border border-gold/35 bg-gold/[0.07] p-4 text-center">
              <Smartphone size={22} className="mx-auto text-gold-soft" aria-hidden="true" />
              <p className="mono-data mt-2 text-[0.72rem] text-gold-soft">on-device</p>
              <p className="mono-data text-[0.62rem] text-text-low">1.8B param · 41ms p95</p>
              <div className="mt-2 flex flex-wrap justify-center gap-1">
                <Chip tone="gold">sealed</Chip>
              </div>
            </div>

            {/* arc connector */}
            <svg viewBox="0 0 72 48" className="h-12 w-full" aria-hidden="true">
              <defs>
                <linearGradient id="od-arc-grad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#F0C878" />
                  <stop offset="55%" stopColor="#D9A648" />
                  <stop offset="100%" stopColor="#8FB8E8" />
                </linearGradient>
              </defs>
              <motion.path
                d="M4 38 C 24 6, 48 6, 68 38"
                fill="none"
                stroke="url(#od-arc-grad)"
                strokeWidth="1.6"
                initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
              />
              <circle cx="4" cy="38" r="2.4" fill="#F0C878" />
              <circle cx="68" cy="38" r="2.4" fill="#8FB8E8" />
            </svg>

            {/* cloud node */}
            <div className="rounded-card-md border border-sky/30 bg-sky/[0.06] p-4 text-center">
              <Cloud size={22} className="mx-auto text-sky" aria-hidden="true" />
              <p className="mono-data mt-2 text-[0.72rem] text-sky">AI Gateway · cloud</p>
              <p className="mono-data text-[0.62rem] text-text-low">4 providers · consent-gated</p>
              <div className="mt-2 flex flex-wrap justify-center gap-1">
                <Chip tone="sky">audited</Chip>
              </div>
            </div>
          </div>
          <p className="mono-data mt-4 text-[0.68rem] leading-relaxed text-text-low">
            policy engine decides per request class. sealed classes resolve on-device; the gateway receives a signed
            routing receipt — never the payload.
          </p>
        </div>

        {/* Path table */}
        <div className="overflow-hidden rounded-card-md border border-white/8">
          <div className="mono-data grid grid-cols-[1fr_auto] items-center gap-3 border-b border-white/10 bg-ink-3/80 px-4 py-2.5 text-[0.7rem] uppercase tracking-[0.12em] text-text-low">
            <span>Privacy path</span>
            <span className="text-end">Route</span>
          </div>
          {PATHS.map((p) => (
            <div
              key={p.name}
              className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-white/5 px-4 py-3 hover:bg-white/[0.03]"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-semibold text-text-hi">
                  <p.icon size={14} className={p.device ? 'text-gold-soft' : 'text-sky'} aria-hidden="true" />
                  <span className="truncate">{p.name}</span>
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {p.badges.map((b) => (
                    <Chip key={b} tone={p.device ? 'gold' : 'sky'}>
                      {p.device && <Lock size={9} aria-hidden="true" />}
                      {b}
                    </Chip>
                  ))}
                </div>
              </div>
              <span className="mono-data text-end text-[0.72rem] text-text-mid">{p.route}</span>
            </div>
          ))}
        </div>
      </div>
    </SubSection>
  )
}
