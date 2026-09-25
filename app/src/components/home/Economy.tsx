import { useMemo, useRef } from 'react'
import { Link } from 'react-router'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { ArrowRight } from 'lucide-react'
import { CloudCard } from '@/components/ui-kit'
import { useApi } from '@/hooks/useApi'
import { kaluta, type EconomyRules } from '@/lib/api'

gsap.registerPlugin(ScrollTrigger)

/**
 * Blueprint defaults. These exist only so the page still renders correct copy
 * when the ledger service is unreachable — the live figures below are the
 * authority, and they come from `common/economy.py` via /api/ledger/rules.
 * If the two ever disagree, the API is right and these are stale.
 */
const FALLBACK = {
  creator: 40,
  commission: 20,
  leadersPool: 5,
  markup: 20,
  poolEntry: '100',
  poolCap: 10000,
}

const COLORS = {
  creator: '#D9A648',
  sponsor: '#F0C878',
  leaders: '#8FB8E8',
  platform: '#4A52E0',
}

const num = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function buildModel(rules: EconomyRules | null) {
  if (!rules) return { ...FALLBACK, live: false }
  return {
    creator: num(rules.creator_revenue.creator_pct, FALLBACK.creator),
    commission: num(rules.sponsor_commission_pct, FALLBACK.commission),
    leadersPool: num(rules.leaders_pool_pct, FALLBACK.leadersPool),
    markup: num(rules.marketplace.markup_pct, FALLBACK.markup),
    poolEntry: rules.referral_pool?.entry_price ?? FALLBACK.poolEntry,
    poolCap: rules.referral_pool?.cap ?? FALLBACK.poolCap,
    live: true,
  }
}

/** Section 7 — Creator economy: earnings waterfall with count-up (GSAP). */
export default function Economy() {
  const rootRef = useRef<HTMLElement>(null)
  const { data: rules, error } = useApi<EconomyRules>(() => kaluta.economy.rules(), [])

  const model = useMemo(() => buildModel(rules), [rules])

  // The bar is one advertising dollar. The creator is paid first; the
  // commission and the Leaders pool are then percentages of what Kinjy keeps,
  // which is why they read smaller here than the headline rates.
  const segments = useMemo(() => {
    const retained = 100 - model.creator
    const sponsor = (retained * model.commission) / 100
    const leaders = (retained * model.leadersPool) / 100
    return [
      { key: 'creator', label: 'Creator', pct: model.creator, color: COLORS.creator },
      { key: 'sponsor', label: `Their sponsor · ${model.commission}% of our share`, pct: sponsor, color: COLORS.sponsor },
      { key: 'leaders', label: `Kinjy Leaders · ${model.leadersPool}% of our share`, pct: leaders, color: COLORS.leaders },
      { key: 'platform', label: 'Platform', pct: 100 - model.creator - sponsor - leaders, color: COLORS.platform },
    ]
  }, [model])

  const cards = useMemo(
    () => [
      {
        title: 'The direct commission',
        body: `One level. Your sponsor earns ${model.commission}% of Kinjy's revenue on what you do — and nobody above them earns anything.`,
      },
      {
        title: 'Paid from our markup',
        body: `Seller $100 + ${model.markup}% Kinjy markup = $${100 + model.markup}. The commission comes out of the $${model.markup}, never out of the seller's price.`,
      },
      {
        title: 'Kinjy Leaders',
        body: `${model.leadersPool}% of monthly company revenue, split between the 10,000 members who earned the most commission that month.`,
      },
    ],
    [model],
  )

  // Re-runs when the live figures land, so the bars animate to the real widths
  // rather than staying frozen at the fallback ones.
  useGSAP(
    () => {
      const root = rootRef.current
      if (!root) return
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const ctx = gsap.context(() => {
        gsap.utils.toArray<HTMLElement>('.waterfall-seg').forEach((seg, i) => {
          const pct = Number(seg.dataset.pct)
          gsap.fromTo(
            seg,
            { width: '0%' },
            {
              width: `${pct}%`,
              duration: 1.1,
              delay: i * 0.15,
              ease: 'power2.inOut',
              scrollTrigger: { trigger: seg, start: 'top 70%' },
            },
          )
        })
        gsap.utils.toArray<HTMLElement>('.waterfall-num').forEach((el) => {
          const target = Number(el.dataset.value)
          const obj = { v: 0 }
          gsap.to(obj, {
            v: target,
            duration: 1.2,
            ease: 'power2.out',
            scrollTrigger: { trigger: el, start: 'top 70%' },
            onUpdate: () => {
              el.textContent = `${Math.round(obj.v)}%`
            },
          })
        })
        gsap.from('.econ-card', {
          y: 40,
          opacity: 0,
          duration: 0.7,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: { trigger: '.econ-cards', start: 'top 75%' },
        })
      }, root)
      return () => ctx.revert()
    },
    { dependencies: [model], revertOnUpdate: true },
  )

  return (
    <section ref={rootRef} className="noise-overlay bg-ink px-6 py-24 md:py-32">
      <div className="mx-auto max-w-container">
        <h2 className="h2 text-center">A transparent economy for creators and communities.</h2>
        <p className="body-lg mx-auto mt-4 max-w-xl text-center text-text-mid">
          Every ad dollar on Kinjy is split by an immutable, auditable formula.
        </p>
        <p className="caption mt-3 text-center">
          {model.live ? (
            <span className="text-gold-soft">Live from the Kinjy ledger · /api/ledger/rules</span>
          ) : error ? (
            <span className="text-text-low">Showing published figures — the ledger service is unreachable</span>
          ) : (
            <span className="text-text-low">Loading live figures…</span>
          )}
        </p>

        {/* Waterfall */}
        <div className="mt-14">
          <div className="flex h-16 w-full overflow-hidden rounded-card-md border border-white/10">
            {segments.map((s) => (
              <div
                key={s.key}
                className="waterfall-seg flex items-center justify-center overflow-hidden"
                data-pct={s.pct}
                style={{
                  background: `linear-gradient(180deg, ${s.color}CC, ${s.color}88)`,
                  width: `${s.pct}%`,
                }}
              />
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
            {segments.map((s) => (
              <div key={s.key} className="flex items-baseline gap-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: s.color }}
                  aria-hidden="true"
                />
                <span className="waterfall-num mono-data text-lg text-text-hi" data-value={s.pct}>
                  {s.pct}%
                </span>
                <span className="caption">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="econ-cards mt-14 grid gap-4 md:grid-cols-3">
          {cards.map((c) => (
            <CloudCard key={c.title} hoverable className="econ-card p-6">
              <h3 className="text-lg font-semibold text-gold-soft">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-mid">{c.body}</p>
            </CloudCard>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            to="/creators"
            className="inline-flex items-center gap-2 font-semibold text-gold-soft transition-all hover:gap-3"
          >
            See the full economy <ArrowRight size={16} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  )
}
