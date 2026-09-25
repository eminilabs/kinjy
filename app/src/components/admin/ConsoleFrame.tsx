import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  ScrollText,
  ShieldCheck,
  Radar,
  Trophy,
  Zap,
  Layers,
  Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const RAIL = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: Users, label: 'Members', active: false },
  { icon: ScrollText, label: 'Ledger', active: false },
  { icon: ShieldCheck, label: 'KYC', active: false },
  { icon: Radar, label: 'Fraud', active: false },
  { icon: Trophy, label: 'Kinjy Leaders', active: false },
  { icon: Zap, label: 'AI Watch', active: false, badge: true },
  { icon: Layers, label: 'Moderation', active: false },
  { icon: Activity, label: 'System', active: false },
]

/**
 * ConsoleFrame — the admin page presented as a "product screenshot brought to life":
 * full-width console frame (r-xl, solid ink-2) with a left icon rail. Rail icons
 * draw in sequence; the frame itself scales 0.97→1 on load (handled by the page).
 */
export default function ConsoleFrame({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-card-xl border border-white/10 bg-ink-2 shadow-cloud">
      <div className="flex">
        {/* Left icon rail */}
        <nav
          aria-label="Admin modules"
          className="hidden md:flex w-[76px] shrink-0 flex-col items-center gap-1 border-r border-white/8 bg-ink-3/60 py-5"
        >
          {RAIL.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.06, duration: 0.42, ease: [0.34, 1.56, 0.64, 1] }}
              className="relative"
            >
              <button
                type="button"
                title={item.label}
                aria-label={item.label}
                aria-current={item.active ? 'page' : undefined}
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-card-md transition-colors duration-200 ease-cloud-ease',
                  item.active
                    ? 'bg-gold/15 text-gold-soft shadow-[inset_0_0_0_1px_rgba(217,166,72,0.35)]'
                    : 'text-text-low hover:bg-white/5 hover:text-text-hi',
                )}
              >
                <item.icon size={19} strokeWidth={1.8} />
              </button>
              {item.badge && (
                <span
                  className="absolute -top-0.5 -end-0.5 h-2.5 w-2.5 rounded-full bg-gold shadow-[0_0_8px_rgba(217,166,72,0.8)]"
                  aria-label="1 unread advisory"
                />
              )}
            </motion.div>
          ))}
        </nav>

        {/* Main console area */}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  )
}
