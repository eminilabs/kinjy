import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { FEATURES } from '@/lib/features'
import { CHAT, COMMUNITIES, COMPOSER_TOOLS } from './data'

function FeatureText({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div>
      {icon}
      <h3 className="kl-h3 mb-5">{title}</h3>
      <p className="kl-lead max-w-[440px]" style={{ fontSize: 18, lineHeight: 1.55 }}>
        {children}
      </p>
    </div>
  )
}

function Stage({ gradient, glow, children }: { gradient: string; glow: ReactNode; children: ReactNode }) {
  return (
    <div className="relative min-h-[440px] overflow-hidden rounded-[20px] p-10" style={{ background: gradient }} aria-hidden="true">
      {glow}
      {children}
    </div>
  )
}

const iconBox = 'mb-7 grid h-[72px] w-[72px] place-items-center rounded-[10px]'

/** Calls are named only while they are switched on (lib/features.ts). */
const TALK_CHANNELS = FEATURES.calls ? 'landing.features.talkCalls' : 'landing.features.talk'

export default function LandingFeatures() {
  const { t } = useTranslation()
  return (
    <>
      <section className="kl-pad-x pb-10 pt-[120px] text-center">
        <h2 className="kl-h2 mx-auto max-w-[820px]" style={{ fontSize: 'clamp(40px, 5.4vw, 68px)' }}>
          {t('landing.features.title')}
        </h2>
      </section>

      <section id="commus" className="kl-split kl-pad-x gap-14 py-[60px]">
        <FeatureText
          title={t('landing.features.t1')}
          icon={
            <div className={`${iconBox} kl-sheen shadow-[0_14px_30px_-14px_rgba(169,118,28,.6)]`} aria-hidden="true">
              <div className="flex">
                <span className="h-5 w-5 rounded-full bg-[var(--kl-night)]" />
                <span className="-ms-1.5 h-5 w-5 rounded-full border-[3px] border-[var(--kl-night)]" />
              </div>
            </div>
          }
        >
          {t('landing.features.communities')}
        </FeatureText>
        <Stage
          gradient="linear-gradient(160deg, var(--kl-stage-a), var(--kl-stage-b))"
          glow={<div className="absolute -right-[60px] -top-[60px] h-[260px] w-[260px] rounded-full bg-[var(--kl-sky)] opacity-50 blur-[70px]" />}
        >
          <div className="relative mx-auto flex max-w-[420px] flex-col gap-3.5">
            {COMMUNITIES.map((g) => (
              <div
                key={g.name}
                className="kl-glass kl-float flex items-center gap-3.5 rounded-[10px] p-3.5 shadow-[0_16px_30px_-18px_var(--kl-shadow)]"
                style={{ marginInlineStart: g.offset, ['--kl-dur' as string]: g.dur }}
              >
                <div className="kl-serif grid h-[52px] w-[52px] place-items-center rounded-[10px] text-xl font-semibold text-[var(--kl-on-pastel)]" style={{ background: g.bg }}>
                  {g.i}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-base font-bold">{t(g.name)}</div>
                  <div className="flex items-center gap-1.5 text-[13px] text-[var(--kl-low)]">
                    <span className="kl-pulse h-[7px] w-[7px] rounded-full bg-[var(--kl-gold-deep)]" />
                    {t(g.meta)}
                  </div>
                </div>
                <span className="rounded-[20px] border border-[var(--kl-invert-border)] bg-[var(--kl-invert)] px-4 py-[9px] text-[13px] font-semibold text-[var(--kl-invert-ink)]">{t('landing.features.join')}</span>
              </div>
            ))}
          </div>
        </Stage>
      </section>

      <section id="creation" className="kl-split kl-pad-x gap-14 py-[60px]">
        <Stage
          gradient="linear-gradient(200deg, var(--kl-stage-b), var(--kl-stage-a))"
          glow={<div className="absolute -bottom-[60px] -left-10 h-[240px] w-[240px] rounded-full bg-[var(--kl-coral)] opacity-35 blur-[80px]" />}
        >
          <div className="kl-glass relative mx-auto max-w-[380px] rounded-2xl p-[18px] shadow-[0_30px_50px_-28px_var(--kl-shadow)]">
            <div className="mb-3 text-[15px] font-bold">{t('landing.features.newPost')}</div>
            <div
              className="kl-mono grid h-[170px] place-items-center rounded-[10px] text-[11px] text-[var(--kl-low)]"
              style={{ background: 'repeating-linear-gradient(45deg, var(--kl-paper-2) 0 8px, var(--kl-paper) 8px 16px)' }}
            >
              {t('landing.features.photos')}
            </div>
            <div className="mb-1.5 mt-4 h-2 overflow-hidden rounded-[9px] bg-[var(--kl-paper-2)]">
              <div className="kl-grow h-full rounded-[9px]" style={{ background: 'linear-gradient(90deg, #F0C878, #D9A648, #8FB8E8)', ['--kl-dur' as string]: '4s' }} />
            </div>
            <div className="my-3.5 flex flex-wrap gap-2">
              {COMPOSER_TOOLS.map((tool) => (
                <span key={tool} className="rounded-[20px] border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] px-[13px] py-2 text-[13px] font-semibold">
                  {t(tool)}
                </span>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[var(--kl-low)]">{t('landing.features.shareIn')}</span>
              <span className="rounded-[20px] bg-[var(--kl-coral)] px-5 py-2.5 text-sm font-bold text-white">{t('landing.features.publish')}</span>
            </div>
          </div>
        </Stage>
        <FeatureText
          title={t('landing.features.t2')}
          icon={
            <div className={`${iconBox} bg-[var(--kl-coral)] shadow-[0_14px_30px_-14px_rgba(224,120,86,.6)]`} aria-hidden="true">
              <span className="h-6 w-6 rotate-45 rounded bg-white" />
            </div>
          }
        >
          {t('landing.features.publishText')}
        </FeatureText>
      </section>

      <section id="echanges" className="kl-split kl-pad-x gap-14 pb-[120px] pt-[60px]">
        <FeatureText
          title={t('landing.features.t3')}
          icon={
            <div className={`${iconBox} bg-[var(--kl-sky)] shadow-[0_14px_30px_-14px_rgba(143,184,232,.8)]`} aria-hidden="true">
              <span className="h-6 w-[30px] bg-[var(--kl-night)]" style={{ borderRadius: '10px 10px 10px 2px' }} />
            </div>
          }
        >
          {t(TALK_CHANNELS)} {t('landing.features.talkTail')}
        </FeatureText>
        <Stage
          gradient="linear-gradient(150deg, var(--kl-stage-a), var(--kl-stage-b))"
          glow={<div className="kl-sheen absolute -left-[60px] -top-10 h-[260px] w-[260px] rounded-full opacity-45 blur-[80px]" />}
        >
          <div className="relative mx-auto flex max-w-[380px] flex-col gap-2.5">
            <div className="kl-glass mb-1.5 flex items-center gap-2.5 rounded-[10px] px-3.5 py-2.5">
              <div className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-[var(--kl-gold-soft)] text-sm font-extrabold text-[var(--kl-on-pastel)]">R</div>
              <div className="leading-[1.2]">
                <div className="text-sm font-bold">{t('landing.features.group')}</div>
                <div className="text-xs text-[var(--kl-low)]">{t('landing.features.online')}</div>
              </div>
            </div>
            {CHAT.map((c) => (
              <div
                key={t(c.text)}
                className="kl-rise max-w-[78%] px-4 py-3 text-[15px] leading-[1.4] shadow-[0_12px_24px_-16px_rgba(0,0,0,.3)]"
                style={{
                  alignSelf: c.mine ? 'flex-end' : 'flex-start',
                  borderRadius: c.mine ? '20px 20px 6px 20px' : '20px 20px 20px 6px',
                  background: c.mine ? (c.gold ? '#D9A648' : 'var(--kl-invert)') : 'var(--kl-bubble)',
                  color: c.mine ? (c.gold ? '#0B0E1D' : 'var(--kl-invert-ink)') : 'var(--kl-ink)',
                  ['--kl-delay' as string]: c.delay,
                }}
              >
                {t(c.text)}
              </div>
            ))}
            <div className="flex gap-[5px] self-start bg-[var(--kl-bubble)] px-[18px] py-3.5" style={{ borderRadius: '20px 20px 20px 6px' }}>
              {['0s', '.15s', '.3s'].map((d) => (
                <span key={d} className="kl-typing h-2 w-2 rounded-full bg-[var(--kl-ink)]" style={{ ['--kl-delay' as string]: d }} />
              ))}
            </div>
          </div>
        </Stage>
      </section>
    </>
  )
}
