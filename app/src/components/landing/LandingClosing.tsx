import { Link } from 'react-router'
import { ASSISTANT_SKILLS, FOOTER_COLUMNS, PLANS, TESTIMONIALS, TRUST } from './data'
import { Brand, StoreBadges } from './shared'
import { useJoinTarget } from './useJoinTarget'

const NIGHT_FIELD = 'radial-gradient(120% 120% at 20% 0%, #242142 0%, #0B0E1D 65%)'

export function LandingAssistant() {
  return (
    <section
      id="assistant"
      className="kl-split kl-night-section mx-[clamp(12px,2vw,24px)] gap-[72px] overflow-hidden rounded-[20px] px-[clamp(20px,5vw,64px)] py-[140px] text-[var(--kl-night-text)]"
      style={{ background: NIGHT_FIELD }}
    >
      <div>
        <div className="relative mb-10 h-[132px] w-[132px]" aria-hidden="true">
          <div className="kl-orb-ring kl-spin absolute inset-[-20px] rounded-full opacity-55 blur-[30px]" style={{ ['--kl-dur' as string]: '9s' }} />
          <div className="kl-orb-ring kl-spin absolute inset-0 rounded-full" style={{ ['--kl-dur' as string]: '6s' }} />
          <div className="absolute inset-2.5 rounded-full" style={{ background: 'radial-gradient(circle at 35% 30%, #8FB8E8, #4A52E0 55%, #242142)' }} />
        </div>
        <h2 className="kl-h2 mb-6 text-[var(--kl-night-text)]">Un assistant qui parle votre langue.</h2>
        <p className="mb-8 max-w-[460px] text-lg leading-[1.6] text-[var(--kl-night-mid)]">
          Posez-lui une question sur Kinjy, par écrit ou à voix haute. Il répond en français, anglais, swahili, arabe ou
          chinois, et cite d’où vient sa réponse.
        </p>
        <div className="flex max-w-[480px] flex-wrap gap-2">
          {ASSISTANT_SKILLS.map((k) => (
            <span key={k} className="kl-night-glass rounded-[10px] px-3.5 py-[9px] text-sm">
              {k}
            </span>
          ))}
        </div>
      </div>
      <div className="flex w-full max-w-[440px] flex-col gap-3 justify-self-center" aria-hidden="true">
        <div className="kl-night-glass max-w-[85%] self-start px-[18px] py-4" style={{ borderRadius: '16px 16px 16px 4px' }}>
          <div className="text-base leading-[1.45]">Mti wa familia unafanyaje kazi?</div>
          <div className="mt-2.5 border-t border-white/15 pt-2.5 text-sm text-[var(--kl-gold-soft)]">
            Question posée en swahili · réponse en swahili
          </div>
        </div>
        <div className="kl-sheen max-w-[85%] self-end px-[18px] py-3.5 text-base leading-[1.45] text-[var(--kl-night)]" style={{ borderRadius: '16px 16px 4px 16px' }}>
          Kila uhusiano unathibitishwa na ndugu zako. Hakuna mwingine anayeona mti wako.
        </div>
        <div className="flex items-center gap-2.5 self-start rounded-[10px] bg-[var(--kl-night-2)] px-4 py-3 text-[13px] text-[var(--kl-night-mid)]">
          <span className="kl-orb-ring h-2.5 w-2.5 rounded-full" />
          Source : Arbre familial · aide Kinjy
        </div>
      </div>
    </section>
  )
}

export function LandingPricing() {
  const join = useJoinTarget()
  const tone = {
    plain: { bg: 'var(--kl-surface)', color: 'var(--kl-ink)', border: 'var(--kl-paper-2)', tick: 'var(--kl-gold-deep)', btnBg: 'var(--kl-paper)', btnColor: 'var(--kl-ink)' },
    paper: { bg: 'var(--kl-paper)', color: 'var(--kl-ink)', border: 'var(--kl-paper-2)', tick: 'var(--kl-gold-deep)', btnBg: 'var(--kl-invert)', btnColor: 'var(--kl-invert-ink)' },
    night: { bg: 'var(--kl-invert)', color: 'var(--kl-invert-ink)', border: 'var(--kl-invert-border)', tick: '#F0C878', btnBg: 'linear-gradient(135deg,#F0C878,#D9A648)', btnColor: '#0B0E1D' },
  }
  return (
    <section id="tarifs" className="kl-pad-x py-[140px]">
      <div className="mb-14 flex flex-wrap items-end justify-between gap-8">
        <h2 className="kl-h2">Commencez gratuitement.</h2>
        <p className="kl-lead max-w-[380px]">
          Les quinze modules sont accessibles dès la formule gratuite. Les formules payantes retirent la publicité et
          ajoutent des outils avancés.
        </p>
      </div>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))' }}>
        {PLANS.map((p) => {
          const t = tone[p.tone]
          return (
            <div key={p.name} className="flex flex-col rounded-2xl border p-8" style={{ background: t.bg, color: t.color, borderColor: t.border }}>
              <div className="text-[15px] font-semibold">{p.name}</div>
              <div className="mb-7 mt-5 flex items-baseline gap-1.5">
                <span className="kl-serif text-[56px] font-semibold leading-none tracking-[-.02em]">{p.price}</span>
                <span className="text-[15px] opacity-70">/ mois</span>
              </div>
              <ul className="mb-8 flex flex-1 flex-col gap-3">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2.5 text-[15px] leading-[1.45]">
                    <span style={{ color: t.tick }} aria-hidden="true">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to={join.to.startsWith('/join') ? join.to : '/pricing'}
                className="rounded-[10px] p-3.5 text-center text-[15px] font-bold"
                style={{ background: t.btnBg, color: t.btnColor }}
              >
                {join.to.startsWith('/join') ? p.cta : 'Voir les formules'}
              </Link>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function LandingTrust() {
  return (
    <section id="confiance" className="kl-pad-x mx-auto max-w-[1320px] pb-10 pt-[120px]">
      <div className="mb-12 flex flex-wrap items-end justify-between gap-8">
        <h2 className="kl-h2 max-w-[640px]" style={{ fontSize: 'clamp(40px, 5vw, 64px)' }}>
          Un espace sûr, par défaut.
        </h2>
        <p className="max-w-[400px] text-lg leading-[1.5] text-[var(--kl-mid)]">
          Vos données, votre fil, vos règles. La confiance n’est pas une option cachée dans les paramètres.
        </p>
      </div>
      <div className="border-t-2 border-[var(--kl-ink)]">
        {TRUST.map((t) => (
          <div key={t.n} className="flex flex-wrap items-baseline gap-x-12 gap-y-4 border-b border-[var(--kl-paper-2)] py-9">
            <div className="flex flex-[1_1_360px] items-baseline gap-7">
              <span className="kl-mono w-7 flex-none text-[13px] tracking-[.08em] text-[var(--kl-gold-deep)]">{t.n}</span>
              <h3 className="kl-serif m-0 font-semibold leading-[1.1] tracking-[-.02em]" style={{ fontSize: 'clamp(26px, 2.6vw, 34px)' }}>
                {t.title}
              </h3>
            </div>
            <p className="m-0 max-w-[520px] flex-[1_1_360px] text-[17px] leading-[1.6] text-[var(--kl-mid)]">{t.text}</p>
          </div>
        ))}
      </div>

      {TESTIMONIALS.length > 0 && (
        <div className="mt-[120px] grid gap-y-12" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))' }}>
          {TESTIMONIALS.map((r) => (
            <figure key={r.name} className="m-0 flex flex-col justify-between gap-10 border-s border-[var(--kl-paper-2)] px-[clamp(20px,2.5vw,36px)] py-2">
              <div>
                <div className="kl-serif h-8 text-[64px] leading-[.6] text-[var(--kl-gold)]" aria-hidden="true">“</div>
                <blockquote className="kl-serif m-0 text-[22px] font-medium leading-[1.35] tracking-[-.01em]">{r.quote}</blockquote>
              </div>
              <figcaption className="flex items-center gap-3">
                <img src={r.photo} alt="" className="h-12 w-12 flex-none rounded-full bg-[var(--kl-paper-2)] object-cover" />
                <div className="leading-[1.3]">
                  <div className="text-[15px] font-bold">{r.name}</div>
                  <div className="text-sm text-[var(--kl-low)]">{r.meta}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  )
}

export function LandingFinalCta() {
  const join = useJoinTarget()
  return (
    <section id="rejoindre" className="mx-auto max-w-[1320px] px-4 pb-4 pt-20">
      <div
        className="kl-night-section relative overflow-hidden rounded-[20px] px-[clamp(24px,6vw,80px)] py-[clamp(110px,10vw,130px)] text-center"
        style={{ background: 'radial-gradient(120% 140% at 50% 0%, #242142 0%, #0B0E1D 70%)' }}
      >
        <div
          className="kl-floatb kl-night-glass absolute left-6 top-6 grid h-[62px] w-[72px] place-items-center text-[30px] text-[var(--kl-coral)] opacity-90 backdrop-blur-md"
          style={{ borderRadius: '22px 22px 22px 4px', ['--kl-dur' as string]: '5s' }}
          aria-hidden="true"
        >
          ♥
        </div>
        <div
          className="kl-float kl-night-glass absolute bottom-6 right-6 grid h-16 w-16 place-items-center rounded-[10px] text-[30px] text-[var(--kl-gold-soft)] backdrop-blur-md"
          style={{ ['--kl-dur' as string]: '6s' }}
          aria-hidden="true"
        >
          ✦
        </div>
        <div className="relative z-[1]">
          <h2
            className="kl-serif mx-auto mb-6 max-w-[900px] font-semibold text-[var(--kl-night-text)]"
            style={{ fontSize: 'clamp(48px, 8vw, 112px)', lineHeight: 0.92, letterSpacing: '-.02em', textWrap: 'balance' }}
          >
            Votre tribu vous attend.
          </h2>
          <p className="mx-auto mb-10 max-w-[520px] text-xl leading-[1.5] text-[var(--kl-night-mid)]">
            Inscription gratuite. Créez votre profil en moins d’une minute.
          </p>
          <div className="flex flex-col items-center gap-6">
            <Link to={join.to} className="kl-sheen rounded-[10px] px-7 py-3.5 text-[17px] font-bold text-[var(--kl-night)]">
              {join.to.startsWith('/join') ? 'Créer mon compte' : join.label} →
            </Link>
            <div className="max-w-[520px]">
              <StoreBadges framed />
            </div>
          </div>
        </div>
      </div>
      <footer className="px-2 pb-7 pt-14 text-sm text-[var(--kl-mid)]">
        <div className="grid gap-10" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 170px), 1fr))' }}>
          <div className="flex flex-col gap-3">
            <Brand size={39} text={20} />
            <p className="max-w-[220px] leading-[1.5]">Un seul compte pour vos proches, vos communautés et votre famille.</p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-[.08em] text-[var(--kl-ink)]">{col.title}</h3>
              <ul className="flex flex-col gap-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="hover:text-[var(--kl-gold-deep)]">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--kl-paper-2)] pt-6">
          <span>© {new Date().getFullYear()} Kinjy</span>
          <Link to="/join?mode=signup" className="font-semibold text-[var(--kl-gold-deep)] hover:underline">
            Rejoindre Kinjy →
          </Link>
        </div>
      </footer>
    </section>
  )
}
