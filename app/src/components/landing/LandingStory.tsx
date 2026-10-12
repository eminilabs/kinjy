import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FEATURES } from '@/lib/features'
import { ALGORITHMS, ECONOMY_STEPS, FAMILY_TREE, FORMATS } from './data'

function FeedChooser() {
  const { t } = useTranslation()
  const [current, setCurrent] = useState(0)
  const algo = ALGORITHMS[current]
  return (
    <section
      id="fil"
      className="kl-split mx-[clamp(12px,2vw,24px)] mt-20 gap-[72px] rounded-[20px] bg-[var(--kl-paper)] px-[clamp(20px,5vw,64px)] py-[140px]"
    >
      <div>
        <h2 className="kl-h2 mb-6">{t('landing.story.algoTitle')}</h2>
        <p className="kl-lead mb-10">{t('landing.story.algoText')}</p>
        <div className="flex max-w-[440px] flex-col gap-2" role="radiogroup" aria-label={t('landing.story.feedModes')}>
          {ALGORITHMS.map((a, i) => {
            const on = i === current
            return (
              <button
                key={t(a.name)}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setCurrent(i)}
                className="flex items-center justify-between gap-4 rounded-[10px] border px-5 py-4 text-left text-base font-semibold transition-colors"
                style={{
                  background: on ? 'var(--kl-invert)' : 'var(--kl-surface)',
                  color: on ? 'var(--kl-invert-ink)' : 'var(--kl-ink)',
                  borderColor: on ? 'var(--kl-invert-border)' : 'var(--kl-paper-2)',
                }}
              >
                {t(a.name)}
                <span className="kl-mono text-xs opacity-75">{t(a.mark)}</span>
              </button>
            )
          })}
        </div>
      </div>
      <div className="w-full max-w-[440px] justify-self-center rounded-2xl bg-[var(--kl-surface)] p-5 shadow-[0_40px_70px_-40px_var(--kl-shadow)]" aria-live="polite">
        <div className="mb-2 flex items-baseline justify-between border-b border-[var(--kl-paper-2)] px-1 pb-4 pt-1">
          <span className="kl-serif text-[22px] font-semibold">{t(algo.name)}</span>
          <span className="text-[13px] text-[var(--kl-low)]">{t('landing.story.yourFeed')}</span>
        </div>
        <p className="mx-1 mb-4 mt-2 text-sm leading-[1.5] text-[var(--kl-mid)]">{t(algo.desc)}</p>
        {algo.posts.map((p) => (
          <div key={p.who + p.what} className="flex items-center gap-3.5 border-t border-[var(--kl-paper)] px-1 py-3.5">
            <div className="grid h-[42px] w-[42px] flex-none place-items-center rounded-full text-sm font-bold text-[var(--kl-on-pastel)]" style={{ background: p.bg }}>
              {p.i}
            </div>
            <div className="min-w-0 flex-1 leading-[1.35]">
              <div className="text-[15px] font-semibold">{p.who}</div>
              <div className="text-sm text-[var(--kl-mid)]">{t(p.what)}</div>
            </div>
            <span className="kl-mono flex-none text-[11px] text-[var(--kl-gold-deep)]">{t(p.tag)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function CreateOnce() {
  const { t } = useTranslation()
  // Branches fan out to the format rows; y in % of the column, one per row.
  const rows = FORMATS.length
  const ys = FORMATS.map((_, i) => ((i + 0.5) / rows) * 100)
  return (
    <section id="formats" className="kl-split kl-pad-x gap-[72px] py-[140px]">
      <div>
        <h2 className="kl-h2 mb-6">{t('landing.story.formatsTitle')}</h2>
        <p className="kl-lead">
          {t('landing.story.formatsText')}
        </p>
      </div>
      <div className="grid items-center" style={{ gridTemplateColumns: 'minmax(0,1fr) 72px minmax(0,1fr)' }} aria-hidden="true">
        <div className="rounded-2xl border border-[var(--kl-invert-border)] bg-[var(--kl-invert)] p-[22px] text-[var(--kl-invert-ink)] shadow-[0_30px_60px_-30px_rgba(11,14,29,.6)]">
          <div className="kl-mono mb-3.5 text-[11px] tracking-[.1em] text-[var(--kl-gold-soft)]">{t('landing.story.draft')}</div>
          <div className="kl-serif mb-3 text-[21px] leading-[1.25]">{t('landing.story.draftTitle')}</div>
          <div className="text-sm leading-[1.5] text-[var(--kl-night-mid)]">{t('landing.story.draftMeta')}</div>
        </div>
        <div className="relative self-stretch">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
            <g fill="none" stroke="#D9A648" strokeWidth="2" strokeLinecap="round">
              {ys.map((y) => (
                <path key={y} d={`M0 50 C 55 50, 45 ${y}, 100 ${y}`} vectorEffect="non-scaling-stroke" />
              ))}
            </g>
          </svg>
          <span className="absolute -left-[5px] top-1/2 -mt-[5px] h-2.5 w-2.5 rounded-full bg-[var(--kl-gold)] shadow-[0_0_0_4px_var(--kl-bg)]" />
        </div>
        <div className="flex flex-col gap-2">
          {FORMATS.map((f) => (
            <div
              key={t(f.name)}
              className="relative flex items-center justify-between gap-2.5 rounded-[10px] px-4 py-[13px] text-[15px] font-semibold"
              style={{ background: f.ready ? 'var(--kl-paper)' : 'transparent', border: f.ready ? '1px solid transparent' : '1px dashed var(--kl-dash)', color: f.ready ? 'var(--kl-ink)' : 'var(--kl-low)' }}
            >
              <span className="absolute -left-1 top-1/2 -mt-1 h-2 w-2 rounded-full" style={{ background: f.ready ? '#D9A648' : 'var(--kl-dash)' }} />
              {t(f.name)}
              <span className="text-xs font-medium text-[var(--kl-low)]">{t(f.meta)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Heritage() {
  const { t } = useTranslation()
  return (
    <section id="famille" className="kl-split kl-pad-x gap-[72px] border-t border-[var(--kl-paper-2)] py-[140px]">
      <div className="relative flex flex-col items-center rounded-[20px] bg-[var(--kl-paper)] px-6 py-10" aria-hidden="true">
        {FAMILY_TREE.map((generation, g) => (
          <div key={g} className="flex flex-col items-center">
            <div className="w-px bg-[var(--kl-gold)]" style={{ height: g ? 36 : 0 }} />
            <div className="flex flex-wrap justify-center gap-3.5">
              {generation.map((p) => (
                <div key={p.n} className="flex w-[92px] flex-col items-center gap-2 text-center">
                  <div
                    className="grid h-[58px] w-[58px] place-items-center rounded-full border-[3px] border-[var(--kl-cutout)] text-[15px] font-bold text-[var(--kl-on-pastel)] shadow-[0_10px_20px_-12px_var(--kl-shadow)]"
                    style={{ background: p.bg }}
                  >
                    {p.i}
                  </div>
                  <div className="leading-[1.25]">
                    <div className="text-sm font-semibold">{t(p.n)}</div>
                    <div className="text-xs text-[var(--kl-low)]">{p.y}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div>
        <h2 className="kl-h2 mb-6">{t('landing.story.heritageTitle')}</h2>
        <p className="kl-lead mb-9">
          {t('landing.story.heritageText')}
        </p>
        <div className="flex max-w-[420px] items-center gap-4 rounded-2xl border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] p-3">
          <img src="/landing/memorial.jpg" alt="" className="h-[88px] w-[88px] flex-none rounded-[10px] bg-[var(--kl-paper-2)] object-cover" loading="lazy" />
          <div className="leading-[1.35]">
            <div className="kl-mono text-[11px] tracking-[.1em] text-[var(--kl-gold-deep)]">{t('landing.story.memorial')}</div>
            <div className="kl-serif text-xl font-semibold">Rose Mensah</div>
            <div className="text-[13px] text-[var(--kl-low)]">{t('landing.story.memorialMeta')}</div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Economy() {
  const { t } = useTranslation()
  return (
    <section id="economie" className="kl-split kl-pad-x gap-[72px] border-t border-[var(--kl-paper-2)] py-[140px]">
      <div>
        <div
          className="kl-serif mt-5 font-medium text-[var(--kl-gold-deep)]"
          style={{ fontSize: 'clamp(140px, 18vw, 240px)', lineHeight: 0.85, letterSpacing: '-.04em' }}
        >
          20 %
        </div>
        <p className="kl-lead mt-6 max-w-[420px]">{t('landing.story.econText')}</p>
      </div>
      <div>
        <h2 className="kl-h2 mb-6">{t('landing.story.econTitle')}</h2>
        <div className="mt-10 flex flex-col">
          {ECONOMY_STEPS.map((s) => (
            <div key={s.n} className="grid gap-4 border-t border-[var(--kl-paper-2)] py-[22px]" style={{ gridTemplateColumns: '56px minmax(0,1fr)' }}>
              <span className="kl-mono pt-1 text-[13px] text-[var(--kl-gold-deep)]">{s.n}</span>
              <div>
                <div className="kl-serif mb-1.5 text-[22px] font-semibold">{t(s.t)}</div>
                <div className="text-base leading-[1.55] text-[var(--kl-mid)]">{t(s.d)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function LandingStory() {
  return (
    <>
      <FeedChooser />
      <CreateOnce />
      {/* The family tree is its subject; it goes with it, as HeritageBand did. */}
      {FEATURES.familyTree && <Heritage />}
      <Economy />
    </>
  )
}
