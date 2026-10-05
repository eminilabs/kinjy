import { Link } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import PlatformHero from '@/components/platform/Hero'
import Constellation from '@/components/platform/Constellation'
import ModuleBlocks from '@/components/platform/ModuleBlocks'
import UniversalNav from '@/components/platform/UniversalNav'
import CloudModeLab from '@/components/platform/CloudModeLab'
import AgentsGrid from '@/components/platform/AgentsGrid'
import LiveIntelligence from '@/components/platform/LiveIntelligence'
import { LINE_EASE } from '@/components/platform/shared'
import { FEATURES } from '@/lib/features'
import PublicShell from '@/components/landing/PublicShell'

/** Section 7 — CTA: the landing's closing night panel, with the arc drawn between the two buttons. */
function PlatformCta() {
  const reduced = useReducedMotion()
  return (
    <section className="mx-auto max-w-[1320px] px-4 pt-[120px]" aria-label="Call to action">
      <div
        className="relative overflow-hidden rounded-[20px] px-[clamp(24px,6vw,80px)] py-[clamp(100px,10vw,130px)] text-center"
        style={{ background: 'linear-gradient(180deg, var(--kl-stage-a), var(--kl-stage-b))' }}
      >
        <div aria-hidden="true" className="kl-sheen absolute -left-16 -top-20 h-[300px] w-[300px] rounded-full opacity-40 blur-[90px]" />
        <div aria-hidden="true" className="absolute -bottom-24 -right-10 h-[300px] w-[300px] rounded-full bg-[var(--kl-sky)] opacity-40 blur-[90px]" />
        <p className="kl-mono relative text-xs tracking-[.14em] text-[var(--kl-gold-deep)]">THE WHOLE MAP</p>
        <h2
          className="kl-serif relative mx-auto mt-5 max-w-[900px] font-semibold"
          style={{ fontSize: 'clamp(48px, 8vw, 112px)', lineHeight: 0.92, letterSpacing: '-.02em' }}
        >
          See it alive.
        </h2>
        <div className="relative mt-12">
          {/* Arc connector between the buttons — only when there are two. */}
          {FEATURES.assistant && (
            <svg
              aria-hidden="true"
              viewBox="0 0 480 60"
              className="pointer-events-none absolute left-1/2 top-1/2 hidden w-[480px] -translate-x-1/2 -translate-y-1/2 sm:block"
            >
              <defs>
                <linearGradient id="cta-arc" x1="0" y1="0" x2="1" y2="0">
                  <stop stopColor="#F0C878" />
                  <stop offset="0.55" stopColor="#D9A648" />
                  <stop offset="1" stopColor="#8FB8E8" />
                </linearGradient>
              </defs>
              <motion.path
                d="M 40 52 Q 240 -18 440 52"
                fill="none"
                stroke="url(#cta-arc)"
                strokeWidth="1.5"
                strokeDasharray="4 5"
                initial={reduced ? false : { pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true, amount: 0.8 }}
                transition={{ duration: 0.9, ease: LINE_EASE }}
              />
            </svg>
          )}
          <div className="relative flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-10">
            <Link
              to="/app"
              className="kl-sheen inline-flex items-center gap-2 rounded-[20px] px-8 py-4 text-[17px] font-bold shadow-[0_14px_30px_-12px_rgba(169,118,28,.55)] transition-transform hover:-translate-y-0.5"
            >
              Open the app demo <ArrowRight size={17} />
            </Link>
            {FEATURES.assistant && (
              <Link
                to="/assistant"
                className="inline-flex items-center gap-2 rounded-[20px] border border-[var(--kl-paper-2)] bg-[var(--kl-surface)] px-8 py-4 text-[17px] font-semibold transition hover:border-[#D9A648]"
              >
                Meet Kinjy Assistant <ArrowRight size={17} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

/** Route /platform — The 15 Modules: constellation, detail blocks, universal nav, Cloud mode, AI agents. */
export default function Platform() {
  return (
    <PublicShell>
      <div className="mx-auto max-w-[1320px] px-4">
        <PlatformHero />
        <Constellation />
        <ModuleBlocks />
      </div>
      <UniversalNav />
      <CloudModeLab />
      <div className="mx-auto max-w-[1320px] px-4">
        <AgentsGrid />
        {/* Live rooms and their captions are the livestream feature. */}
        {FEATURES.live && <LiveIntelligence />}
      </div>
      <PlatformCta />
    </PublicShell>
  )
}
