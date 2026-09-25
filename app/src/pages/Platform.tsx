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

/** Section 7 — CTA with a playful arc drawn between the two buttons. */
function PlatformCta() {
  const reduced = useReducedMotion()
  return (
    <section className="twilight-field noise-overlay relative overflow-hidden px-6 py-24 md:py-32" aria-label="Call to action">
      <div className="relative mx-auto max-w-2xl text-center">
        <p className="eyebrow text-gold">The Whole Map</p>
        <h2 className="h2 mt-4">See it alive.</h2>
        <div className="relative mt-10">
          {/* Arc connector between the buttons */}
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
          <div className="relative flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-10">
            <Link
              to="/app"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-8 py-4 text-base font-bold text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition hover:brightness-110"
            >
              Open the app demo <ArrowRight size={17} />
            </Link>
            <Link
              to="/assistant"
              className="cloud-glass inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-semibold text-text-hi transition hover:border-gold/40 hover:text-gold-soft"
            >
              Meet Kinjy Assistant <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

/** Route /platform — The 15 Modules: constellation, detail blocks, universal nav, Cloud mode, AI agents. */
export default function Platform() {
  return (
    <>
      <PlatformHero />
      <Constellation />
      <ModuleBlocks />
      <UniversalNav />
      <CloudModeLab />
      <AgentsGrid />
      <LiveIntelligence />
      <PlatformCta />
    </>
  )
}
