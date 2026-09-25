import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Crown, ShieldCheck, Trophy, Users } from 'lucide-react'

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
    <section ref={rootRef} className="noise-overlay twilight-field px-6 py-24 md:py-32">
      <div className="mx-auto grid max-w-container items-center gap-14 lg:grid-cols-12">
        {/* Copy */}
        <div className="lg:col-span-5">
          <p className="eyebrow text-gold">Kinjy Leaders</p>
          <h2 className="h2 mt-4">5% of what Kinjy earns, every month.</h2>
          <ul className="mt-7 space-y-5">
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
            ].map((b) => (
              <li key={b.title} className="flex items-start gap-4">
                <span className="cloud-glass mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-card-sm">
                  <b.icon size={18} className="text-gold" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="font-semibold text-text-hi">{b.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-text-mid">{b.body}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mono-data mt-6 rounded-card-sm border border-gold/25 bg-gold/[0.06] px-4 py-3 text-gold-soft">
            your share = your commission this month ÷ Σ commission of the top 10,000
          </p>
        </div>

        {/* Leaderboard + donut + pipeline */}
        <div className="lg:col-span-7">
          <div className="leaderboard cloud-card p-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div>
                <p className="text-sm font-semibold text-text-hi">Kinjy Leaders — November</p>
                <p className="mono-data text-[0.65rem] text-text-low">9,982 / 10,000 qualifying</p>
              </div>
              <span className="mono-data rounded-full bg-gold/15 px-3 py-1 text-[0.68rem] text-gold-soft">
                snapshot frozen ✓
              </span>
            </div>
            <div className="mt-2 grid gap-1 sm:grid-cols-[1fr_auto] sm:gap-6">
              <ol>
                {LEADERS.map((l, i) => (
                  <li
                    key={l.name}
                    className="leader-row flex items-center gap-3 rounded-card-sm px-2 py-2 transition-colors hover:bg-white/[0.04]"
                  >
                    <span className="mono-data w-6 text-end text-text-low">{i + 1}</span>
                    <span
                      aria-hidden="true"
                      className="h-8 w-8 shrink-0 rounded-full border border-white/15 bg-cover"
                      style={{ backgroundImage: 'url(/avatars-set.jpg)', backgroundSize: '400% 300%', backgroundPosition: l.avatar }}
                    />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-hi">{l.name}</span>
                    <span className="mono-data text-gold-soft">${l.earned.toLocaleString()}</span>
                  </li>
                ))}
              </ol>
              {/* share donut beside the top entry */}
              <div className="lsr-donut mx-auto flex flex-col items-center justify-center gap-2 self-start pt-2 sm:pt-4">
                <div className="relative h-24 w-24">
                  <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
                    <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
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
                    <span className="mono-data text-sm font-semibold text-gold-soft">{SHARE.toFixed(2)}%</span>
                    <span className="text-[0.6rem] uppercase tracking-wider text-text-low">share</span>
                  </div>
                </div>
                <p className="caption text-center">rank #1 share<br />of the pool</p>
              </div>
            </div>

            {/* monthly pipeline */}
            <div className="pool-pipeline relative mt-5 border-t border-white/10 pt-5">
              <div className="relative flex items-center justify-between">
                <span className="absolute inset-x-4 top-1/2 h-px -translate-y-1/2 bg-white/12" aria-hidden="true" />
                <span
                  className="pool-pulse absolute top-1/2 h-2 w-10 -translate-y-1/2 rounded-full"
                  style={{ background: 'linear-gradient(90deg, transparent, #F0C878)', filter: 'blur(1px)' }}
                  aria-hidden="true"
                />
                {PIPELINE.map((p, i) => (
                  <div key={p} className="relative flex flex-col items-center gap-1.5">
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-full border border-gold/40 bg-ink-2 mono-data text-[0.65rem] text-gold-soft"
                      aria-hidden="true"
                    >
                      {i + 1}
                    </span>
                    <span className="caption text-center">{p}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
