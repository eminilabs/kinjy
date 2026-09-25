import { motion } from 'framer-motion'
import { Camera, ScanSearch, ClipboardCheck, Calculator, Send, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const STAGES = [
  { icon: Camera, name: 'Snapshot', detail: '1st · 00:00 UTC', state: 'done' },
  { icon: ScanSearch, name: 'Fraud review', detail: 'anti-fraud sweep', state: 'done' },
  { icon: ClipboardCheck, name: 'Qualification audit', detail: 'reversed commission excluded', state: 'current' },
  { icon: Calculator, name: 'Final calculation', detail: 'share × pool', state: 'queued' },
  { icon: Send, name: 'Payment batch', detail: 'ledger-posted', state: 'queued' },
] as const

const LEADERS = [
  { rank: 1, name: 'Amara J.', earned: '$8,412', share: '0.0873%', payout: '$4,363.07' },
  { rank: 2, name: 'Wei Chen', earned: '$7,905', share: '0.0820%', payout: '$4,100.10' },
  { rank: 3, name: 'Nadia B.', earned: '$7,233', share: '0.0750%', payout: '$3,751.56' },
  { rank: 4, name: 'Kofi M.', earned: '$6,890', share: '0.0715%', payout: '$3,573.65' },
  { rank: 5, name: 'Sofia R.', earned: '$6,104', share: '0.0633%', payout: '$3,165.98' },
  { rank: 6, name: 'Tunde O.', earned: '$5,877', share: '0.0610%', payout: '$3,048.24' },
  { rank: 7, name: 'Mei L.', earned: '$5,420', share: '0.0562%', payout: '$2,811.20' },
  { rank: 8, name: 'Jonas K.', earned: '$4,998', share: '0.0518%', payout: '$2,592.32' },
]

/**
 * LeadersPoolSection — the monthly Kinjy Leaders pipeline
 * (snapshot → fraud review → qualification audit → final calculation → payment batch),
 * Share formula banner, top-8 leaderboard of 10,000.
 */
export default function LeadersPoolSection() {
  return (
    <section aria-labelledby="pool-heading" className="border-t border-white/8 px-5 py-10 md:px-8">
      <p className="eyebrow text-gold">Kinjy Leaders operations</p>
      <h2 id="pool-heading" className="h3 mt-2 text-xl">
        10,000 leaders. One verifiable formula.
      </h2>

      {/* Formula banner */}
      <div className="mt-5 overflow-x-auto rounded-card-md border border-gold/35 bg-gold/[0.08] px-5 py-4">
        <p className="mono-data whitespace-nowrap text-[0.8rem] text-gold-soft">
          share = the leader's direct commission this month ÷ the total commission of the qualifying 10,000
        </p>
        <p className="mono-data mt-1 text-[0.7rem] text-text-low">
          this month: $96,400,000 in direct commission · pool $5,000,000 · payout = share × pool
        </p>
      </div>

      {/* Pipeline */}
      <div className="relative mt-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-0">
          {STAGES.map((stage, i) => (
            <div key={stage.name} className="relative flex flex-1 items-center gap-3 md:flex-col md:gap-0">
              {/* connector */}
              {i < STAGES.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute start-[21px] top-11 h-6 w-px bg-white/12 md:start-auto md:end-[-50%] md:top-[21px] md:h-px md:w-full"
                />
              )}
              <motion.div
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ duration: 0.42, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className="relative z-10 flex md:flex-col md:items-center md:text-center w-full gap-3"
              >
                <span
                  className={cn(
                    'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border',
                    stage.state === 'done' && 'border-success/40 bg-success/10 text-success',
                    stage.state === 'current' && 'border-gold/60 bg-gold/15 text-gold-soft',
                    stage.state === 'queued' && 'border-white/12 bg-ink-3 text-text-low',
                  )}
                >
                  {stage.state === 'done' ? <Check size={17} /> : <stage.icon size={17} strokeWidth={1.9} />}
                  {stage.state === 'current' && (
                    <motion.span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full border border-gold/50"
                      animate={{ scale: [1, 1.35], opacity: [0.8, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                    />
                  )}
                </span>
                <div className="md:mt-2.5">
                  <p className="text-sm font-semibold text-text-hi">{stage.name}</p>
                  <p className="caption">{stage.detail}</p>
                  <p
                    className={cn(
                      'mono-data mt-0.5 text-[0.65rem] uppercase tracking-[0.14em]',
                      stage.state === 'done' && 'text-success',
                      stage.state === 'current' && 'text-gold-soft',
                      stage.state === 'queued' && 'text-text-low',
                    )}
                  >
                    {stage.state === 'done' ? 'complete' : stage.state === 'current' ? 'in progress' : 'queued'}
                  </p>
                </div>
              </motion.div>
            </div>
          ))}
        </div>

        {/* travelling pulse */}
        <motion.span
          aria-hidden="true"
          className="absolute top-[21px] hidden h-2 w-2 rounded-full bg-gold-soft shadow-[0_0_10px_rgba(240,200,120,0.9)] md:block"
          animate={{ left: ['2%', '98%'], opacity: [0, 1, 1, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: [0.65, 0, 0.35, 1] }}
        />
      </div>

      {/* Leaderboard */}
      <div className="mt-8 overflow-hidden rounded-card-md border border-white/8">
        <div className="mono-data grid grid-cols-[36px_1fr_90px_90px_104px] gap-3 border-b border-white/10 bg-ink-3/80 px-4 py-2.5 text-[0.7rem] uppercase tracking-[0.12em] text-text-low">
          <span>#</span>
          <span>Member</span>
          <span className="text-end">Commission</span>
          <span className="text-end">Share</span>
          <span className="text-end">Est. payout</span>
        </div>
        {LEADERS.map((l, i) => (
          <motion.div
            key={l.rank}
            initial={{ opacity: 0, x: -14 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.36, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
            className="mono-data grid grid-cols-[36px_1fr_90px_90px_104px] items-center gap-3 border-b border-white/5 px-4 py-2.5 text-[0.8rem] last:border-0 hover:bg-white/[0.03]"
          >
            <span className={cn(l.rank <= 3 ? 'text-gold-soft' : 'text-text-low')}>{l.rank}</span>
            <span className="truncate text-text-hi">{l.name}</span>
            <span className="text-end text-text-mid">{l.earned}</span>
            <span className="text-end text-sky">{l.share}</span>
            <span className="text-end text-gold-soft">{l.payout}</span>
          </motion.div>
        ))}
        <p className="mono-data px-4 py-2.5 text-[0.7rem] text-text-low">
          showing top 8 of 10,000 qualifying leaders · L1s re-verified every snapshot
        </p>
      </div>
    </section>
  )
}
