import { motion, useReducedMotion } from 'framer-motion'
import { Braces, BotMessageSquare, TrendingUp } from 'lucide-react'
import { Chip, SubSection } from './primitives'

const CLARITY = 94

/**
 * StructuredMetadata (C8) — machine-readable branding & SEO panel: JSON-LD
 * snippet, entity clarity score, and the external-AI-agent acquisition note.
 */
export default function StructuredMetadata() {
  const reduceMotion = useReducedMotion()
  return (
    <SubSection
      id="structured-metadata"
      eyebrow="C8 · Machine-Readable Branding & SEO"
      title={
        <>
          <Braces size={19} className="me-2 inline text-gold" aria-hidden="true" />
          Legible to humans. Legible to machines.
        </>
      }
      blurb="Every public route ships structured metadata — JSON-LD entities, OpenGraph, and a stable knowledge graph — so search engines and external AI agents describe Kinjy correctly on our terms, not theirs."
    >
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        {/* JSON-LD snippet card */}
        <div className="overflow-hidden rounded-card-md border border-white/8">
          <p className="mono-data flex items-center gap-2 border-b border-white/10 bg-ink-3/80 px-4 py-2.5 text-[0.7rem] uppercase tracking-[0.12em] text-text-low">
            <Braces size={12} aria-hidden="true" /> application/ld+json · every route
          </p>
          <pre className="mono-data overflow-x-auto p-4 text-[0.72rem] leading-relaxed">
            <code>
              <span className="text-text-low">{'{'}</span>{'\n'}
              {'  '}<span className="text-sky">"@context"</span>
              <span className="text-text-low">: </span>
              <span className="text-gold-soft">"https://schema.org"</span>
              <span className="text-text-low">,</span>{'\n'}
              {'  '}<span className="text-sky">"@type"</span>
              <span className="text-text-low">: </span>
              <span className="text-gold-soft">"Organization"</span>
              <span className="text-text-low">,</span>{'\n'}
              {'  '}<span className="text-sky">"name"</span>
              <span className="text-text-low">: </span>
              <span className="text-gold-soft">"Kinjy"</span>
              <span className="text-text-low">,</span>{'\n'}
              {'  '}<span className="text-sky">"description"</span>
              <span className="text-text-low">: </span>
              <span className="text-gold-soft">"AI-powered global social OS — feeds, family,</span>{'\n'}
              {'    '}<span className="text-gold-soft">memorials, creators and commerce in one ledger."</span>
              <span className="text-text-low">,</span>{'\n'}
              {'  '}<span className="text-sky">"sameAs"</span>
              <span className="text-text-low">: [</span>
              <span className="text-gold-soft">"kg.kinjy.com/entity/kinjy"</span>
              <span className="text-text-low">],</span>{'\n'}
              {'  '}<span className="text-sky">"knowsLanguage"</span>
              <span className="text-text-low">: [</span>
              <span className="text-gold-soft">"en"</span>
              <span className="text-text-low">, </span>
              <span className="text-gold-soft">"sw"</span>
              <span className="text-text-low">, </span>
              <span className="text-gold-soft">"fr"</span>
              <span className="text-text-low">, </span>
              <span className="text-gold-soft">"ar"</span>
              <span className="text-text-low">, </span>
              <span className="text-gold-soft">"zh"</span>
              <span className="text-text-low">]</span>{'\n'}
              <span className="text-text-low">{'}'}</span>
            </code>
          </pre>
          <div className="mono-data flex flex-wrap gap-1.5 border-t border-white/8 bg-ink-3/60 px-4 py-2.5">
            {['Organization', 'Product', 'FAQPage', 'BreadcrumbList'].map((t) => (
              <Chip key={t} tone="sky">{t}</Chip>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {/* Entity clarity score */}
          <div className="rounded-card-md border border-white/8 bg-ink-3/50 p-4">
            <p className="caption font-bold uppercase tracking-[0.14em] text-text-mid">Entity clarity score</p>
            <div className="mt-2 flex items-end gap-2">
              <p className="mono-data text-[2rem] leading-none text-gold-soft">{CLARITY}</p>
              <p className="mono-data pb-0.5 text-[0.72rem] text-text-low">/ 100 · knowledge-graph audit</p>
            </div>
            <div className="mt-3 h-2 rounded-full bg-white/8">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-gold-soft to-gold"
                initial={reduceMotion ? { width: `${CLARITY}%` } : { width: 0 }}
                whileInView={{ width: `${CLARITY}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
              />
            </div>
            <p className="mono-data mt-2 text-[0.68rem] text-text-low">
              name · logo · founding · pricing · modules — all disambiguated, zero collisions
            </p>
          </div>

          {/* Agent acquisition note */}
          <div className="flex-1 rounded-card-md border border-sky/25 bg-sky/[0.05] p-4">
            <p className="caption flex items-center gap-2 font-bold uppercase tracking-[0.14em] text-sky">
              <BotMessageSquare size={13} aria-hidden="true" /> Interpretable by external AI agents
            </p>
            <p className="mt-2 text-sm leading-relaxed text-text-mid">
              When an external assistant is asked "what is Kinjy?", it answers from{' '}
              <strong className="text-text-hi">our</strong> structured graph — correct pricing, correct modules,
              correct values.
            </p>
            <p className="mono-data mt-3 flex items-center gap-2 text-[0.72rem] text-success">
              <TrendingUp size={13} aria-hidden="true" /> agent-referral signups +18% QoQ — the newest acquisition channel
            </p>
          </div>
        </div>
      </div>
    </SubSection>
  )
}
