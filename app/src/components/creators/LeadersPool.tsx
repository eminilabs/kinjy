import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Crown, ShieldCheck, Trophy, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Eyebrow, Stage } from '@/components/landing/PageKit'
import { MODULE_TONES } from '@/components/platform/tones'

gsap.registerPlugin(ScrollTrigger)

// Ranked by commission earned in the month, not by head count: the programme
// rewards introductions that turned into business, which is the behaviour it
// exists to reward.
const LEADERS = [
  { name: 'Demo K.', earned: 4820, avatar: '0% 0%' },
  { name: 'Juma M.', earned: 3910, avatar: '33.3% 0%' },
  { name: 'Neema T.', earned: 3145, avatar: '66.6% 0%' },
  { name: 'Chen W.', earned: 2890, avatar: '100% 0%' },
  { name: 'Marie D.', earned: 2404, avatar: '0% 50%' },
  { name: 'Baraka S.', earned: 2170, avatar: '33.3% 50%' },
  { name: 'Layla H.', earned: 1988, avatar: '66.6% 50%' },
  { name: 'Peter O.', earned: 1731, avatar: '100% 50%' },
]

const PIPELINE = ['Snapshot', 'Fraud review', 'Payment batch']
const SHARE = 0.42
const CIRC = 2 * Math.PI * 26

/** Section 5 — Kinjy Leaders: 5% of monthly revenue, top 10,000 by commission. */
export default function LeadersPool() {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.from('.leader-row', {
        x: -40,
        opacity: 0,
        duration: 0.5,
        stagger: 0.07,
        ease: 'power3.out',
        scrollTrigger: { trigger: '.leaderboard', start: 'top 70%' },
      })
      gsap.fromTo(
        '.lsr-arc',
        { strokeDashoffset: CIRC },
        {
          strokeDashoffset: CIRC * (1 - SHARE / 1.2),
          duration: 1,
          ease: 'power2.inOut',
          scrollTrigger: { trigger: '.lsr-donut', start: 'top 75%' },
        },
      )
      // gold pulse travels the pipeline on a 2s loop while visible
      gsap.fromTo(
        '.pool-pulse',
        { left: '0%', opacity: 0 },
        {
          left: '100%',
          opacity: 1,
          duration: 2,
          repeat: -1,
          ease: 'power1.inOut',
          scrollTrigger: { trigger: '.pool-pipeline', start: 'top 85%', toggleActions: 'play pause resume pause' },
        },
      )
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={rootRef} className="kl-pad-x border-t border-[var(--kl-paper-2)] py-[clamp(72px,9vw,120px)]">
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-[clamp(40px,6vw,96px)] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Copy */}
        <div className="min-w-0">
          <Eyebrow>Kinjy Leaders</Eyebrow>
          <h2 className="kl-h2 mt-5">5% of what Kinjy earns, every month.</h2>
          <ul className="mt-10 border-t border-[var(--kl-paper-2)]">
            {[
              {
                icon: Trophy,
                title: 'The top 10,000 by commission earned',
                body: 'Ranked on the direct commission you actually earned during the calendar month — not on how many people you signed up.',
              },
              {
                icon: Users,
                title: 'Your share = your commission ÷ the top 10,000’s commission',
                body: 'Proportional, so second place is not a consolation prize. Members outside the top 10,000 are not in the denominator, which is what makes a place worth holding.',
              },
              {
                icon: Crown,
                title: 'Funded as the money is earned',
                body: '5% of every revenue split is set aside the moment it is recognised, so the pool is real money already on the balance sheet — not a promise against next month.',
              },
              {
                icon: ShieldCheck,
                title: 'Snapshot → fraud review → payment batch',
                body: 'The month is frozen, screened, then paid in one batch. A commission that was later clawed back does not count towards a place.',
              },
            ].map((b, i) => (
              <li key={b.title} className="flex items-start gap-4 border-b border-[var(--kl-paper-2)] py-5">
                <span
                  className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
                  style={{ background: MODULE_TONES[i % 4][1], color: MODULE_TONES[i % 4][0] }}
                >
                  <b.icon size={18} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-semibold">{b.title}</h3>
                  <p className="mt-1 text-[15px] leading-relaxed text-[var(--kl-mid)]">{b.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="kl-mono mt-6 rounded-[12px] bg-[var(--kl-paper)] px-4 py-3 text-[13px] text-[var(--kl-gold-deep)]">
            your share = your commission this month ÷ Σ commission of the top 10,000
          </p>
        </div>

        {/* Leaderboard + donut + pipeline, on a stage */}
        <Stage className="min-w-0 p-[clamp(14px,3vw,36px)] lg:sticky lg:top-24" glows={['#D9A648', 'var(--kl-sky)']}>
          <div className="leaderboard rounded-[20px] bg-[var(--kl-surface)] p-5 shadow-[0_30px_60px_-36px_var(--kl-shadow)]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--kl-paper-2)] pb-4">
              <div>
                <p className="kl-serif text-xl font-semibold">Kinjy Leaders — November</p>
                <p className="kl-mono mt-0.5 text-[11px] text-[var(--kl-low)]">9,982 / 10,000 qualifying</p>
              </div>
              <span className="kl-mono rounded-full bg-[#DDF0E5] px-3 py-1 text-[11px] text-[#2E7D57]">snapshot frozen ✓</span>
            </div>
            <div className="mt-2 grid gap-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-6">
              <ol>
                {LEADERS.map((l, i) => (
                  <li
                    key={l.name}
                    className={cn(
                      'leader-row flex items-center gap-3 rounded-[12px] px-2 py-2 transition-colors hover:bg-[var(--kl-paper)]',
                      i === 0 && 'bg-[var(--kl-paper)]',
                    )}
                  >
                    <span className={cn('kl-mono w-6 text-end text-xs', i < 3 ? 'font-semibold text-[var(--kl-gold-deep)]' : 'text-[var(--kl-low)]')}>{i + 1}</span>
                    <span
                      aria-hidden="true"
                      className="h-8 w-8 shrink-0 rounded-full bg-cover"
                      style={{ backgroundImage: 'url(/avatars-set.jpg)', backgroundSize: '400% 300%', backgroundPosition: l.avatar }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{l.name}</span>
                    <span className="kl-mono text-sm text-[var(--kl-gold-deep)]">${l.earned.toLocaleString()}</span>
                  </li>
                ))}
              </ol>
              {/* share donut beside the top entry */}
              <div className="lsr-donut mx-auto flex flex-col items-center justify-center gap-2 self-start pt-2 sm:pt-4">
                <div className="relative h-28 w-28">
                  <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="var(--kl-paper-2)" strokeWidth="6" />
                    <circle
                      className="lsr-arc"
                      cx="32"
                      cy="32"
                      r="26"
                      fill="none"
                      stroke="url(#lsrGrad)"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={CIRC}
                      strokeDashoffset={CIRC * (1 - SHARE / 1.2)}
                    />
                    <defs>
                      <linearGradient id="lsrGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                        <stop offset="0" stopColor="#F0C878" />
                        <stop offset="1" stopColor="#D9A648" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="kl-serif text-lg font-semibold">{SHARE.toFixed(2)}%</span>
                    <span className="kl-mono text-[9px] uppercase tracking-wider text-[var(--kl-low)]">share</span>
                  </div>
                </div>
                <p className="text-center text-xs text-[var(--kl-low)]">rank #1 share<br />of the pool</p>
              </div>
            </div>

            {/* monthly pipeline */}
            <div className="pool-pipeline relative mt-5 border-t border-[var(--kl-paper-2)] pt-5">
              <div className="relative flex items-center justify-between">
                <span className="absolute inset-x-4 top-4 h-px border-t border-dashed border-[var(--kl-dash)]" aria-hidden="true" />
                <span
                  className="pool-pulse absolute top-4 h-2 w-10 -translate-y-1/2 rounded-full"
                  style={{ background: 'linear-gradient(90deg, transparent, #D9A648)', filter: 'blur(1px)' }}
                  aria-hidden="true"
                />
                {PIPELINE.map((p, i) => (
                  <div key={p} className="relative flex flex-col items-center gap-1.5">
                    <span className="kl-sheen kl-mono flex h-8 w-8 items-center justify-center rounded-full text-[11px]" aria-hidden="true">
                      {i + 1}
                    </span>
                    <span className="text-center text-xs text-[var(--kl-mid)]">{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Stage>
      </div>
    </section>
  )
}
