import { Link } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowRight, Download, KeyRound, Lock } from 'lucide-react'
import { ProvenanceTag } from '@/components/ui-kit'
import PublicShell from '@/components/landing/PublicShell'
import { ClosingStage, Eyebrow, Stage } from '@/components/landing/PageKit'
import { KL_BTN_GHOST, KL_BTN_GOLD, KL_CARD } from '@/components/landing/kl-classes'
import { MODULE_TONES } from '@/components/platform/tones'
import FamilyTreeGraph from '@/components/family/FamilyTreeGraph'
import VerificationJourney from '@/components/family/VerificationJourney'
import PathFinder from '@/components/family/PathFinder'
import HeritageShowcase from '@/components/family/HeritageShowcase'
import HeritageInterview from '@/components/family/HeritageInterview'
import YearInReview from '@/components/family/YearInReview'
import HeroMiniTree from '@/components/family/HeroMiniTree'
import WordRise from '@/components/family/WordRise'

const cloudEase = [0.22, 1, 0.36, 1] as [number, number, number, number]

const ARCHITECTURE_POINTS = [
  {
    label: 'Person Nodes + Relationship Edges',
    body: 'parent_of · spouse_of · adoptive_parent_of · guardian_of — the graph is the backend truth.',
  },
  {
    label: 'Derived relationships, computed dynamically',
    body: 'Grandparent, uncle, cousin, in-law: never stored, always calculated from the graph.',
  },
  {
    label: 'The Kinjy Level model',
    body: 'Level 0 is you. Level 1 Parents above and Children below, Level 2 beyond — indefinite depth, lazy-loaded as you explore.',
  },
  {
    label: 'Trees merge through shared Person Nodes',
    body: 'One person, one node, many family views. Your tree and your cousin’s tree are the same graph.',
  },
]

const SECTION = 'kl-pad-x border-t border-[var(--kl-paper-2)] py-[clamp(72px,9vw,120px)]'

/**
 * /family — Family Tree & Heritage AI (family.md), on the landing's paper design.
 */
export default function Family() {
  const reduced = useReducedMotion()
  const rise = (delay: number) =>
    reduced ? {} : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { delay, duration: 0.6, ease: cloudEase } }

  return (
    <PublicShell>
      {/* ── Section 1 — Page hero ─────────────────────────────────────── */}
      <header className="kl-split kl-pad-x gap-[clamp(40px,6vw,96px)] pb-24 pt-14">
        <div className="min-w-0">
          <motion.div {...rise(0.1)}>
            <Eyebrow>Module H · Family Tree</Eyebrow>
          </motion.div>
          <WordRise
            as="h1"
            text="Every family is a living graph."
            className="kl-serif mt-6 block text-[clamp(44px,6.6vw,96px)] font-semibold leading-[0.96] tracking-[-0.02em]"
            rise={40}
            stagger={0.08}
          />
          <motion.p className="mt-8 max-w-[480px] text-[19px] leading-[1.55] text-[var(--kl-mid)]" {...rise(0.45)}>
            Persons and relationships — verified by the people who know, computed
            across infinite generations, and never invented by AI.
          </motion.p>
          <motion.div className="mt-10 flex flex-wrap items-center gap-4" {...rise(0.6)}>
            <Link to="/app" className={KL_BTN_GOLD}>
              Start your tree <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <a href="#verification" className={KL_BTN_GHOST}>
              How verification works <ArrowDown size={16} aria-hidden="true" />
            </a>
          </motion.div>
        </div>

        {/* archival frame + overlapping mini tree */}
        <motion.div className="relative min-w-0" {...rise(0.3)}>
          <Stage glows={['var(--kl-gold)', 'var(--kl-sky)']} className="p-4 sm:p-6">
            <div className="overflow-hidden rounded-[14px] shadow-[0_24px_48px_-28px_var(--kl-shadow)] ring-1 ring-[var(--kl-gold)]/40">
              <motion.img
                src="/family-archive-1.jpg"
                alt="Three generations of an East African family on a veranda at golden hour"
                className="aspect-[3/2] w-full object-cover"
                initial={false}
                animate={reduced ? undefined : { scale: [1, 1.08, 1] }}
                transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </Stage>
          <div className="absolute -bottom-8 left-4 w-28 rounded-[16px] bg-[var(--kl-surface)] p-2 shadow-[0_20px_40px_-26px_var(--kl-shadow)] sm:-left-6 sm:w-40 lg:-left-10">
            <HeroMiniTree />
          </div>
        </motion.div>
      </header>

      {/* ── Section 2 — The graph beneath ─────────────────────────────── */}
      <section className={SECTION}>
        <div className="grid items-center gap-12 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-5">
            <Eyebrow>Architecture</Eyebrow>
            <h2 className="kl-h2 mt-5">A relationship graph is the truth. The tree is just a view.</h2>
            <ul className="mt-10 space-y-6">
              {ARCHITECTURE_POINTS.map((p, i) => (
                <motion.li
                  key={p.label}
                  initial={reduced ? false : { opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ delay: i * 0.12, duration: 0.5, ease: cloudEase }}
                  className="border-l-2 border-[var(--kl-gold)] pl-4"
                >
                  <p className="kl-mono text-[0.78rem] font-semibold tracking-wide text-[var(--kl-gold-deep)]">{p.label}</p>
                  <p className="mt-1 text-[15px] leading-relaxed text-[var(--kl-mid)]">{p.body}</p>
                </motion.li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 lg:col-span-7">
            <FamilyTreeGraph />
          </div>
        </div>
      </section>

      {/* ── Section 3 — Trust by corroboration ────────────────────────── */}
      <section id="verification" className={SECTION}>
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>Trust by corroboration</Eyebrow>
          <h2 className="kl-h2 mt-5">Nothing enters the tree unverified.</h2>
        </div>
        <div className="mt-14">
          <VerificationJourney />
        </div>
      </section>

      {/* ── Section 4 — “How are we related?” path finder ────────────── */}
      <section id="path-finder" className={SECTION}>
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>Path finder</Eyebrow>
          <h2 className="kl-h2 mt-5">“How are we related?”</h2>
          <p className="mx-auto mt-5 max-w-xl text-[18px] leading-[1.6] text-[var(--kl-mid)]">
            Ask the graph. The shortest verified path lights up hop by hop — and the
            shared ancestors reveal themselves.
          </p>
        </div>
        <div className="mt-12">
          <PathFinder />
        </div>
      </section>

      {/* ── Section 5 — Family Heritage AI ────────────────────────────── */}
      <section className={SECTION}>
        <div className="grid items-start gap-12 lg:grid-cols-2">
          <div className="min-w-0 lg:sticky lg:top-28">
            <Eyebrow>Family Heritage AI</Eyebrow>
            <h2 className="kl-h2 mt-5">Your archive, brought back to life.</h2>
            <ul className="mt-8 space-y-5 text-[17px] leading-relaxed text-[var(--kl-mid)]">
              <li className="flex gap-3">
                <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-[var(--kl-gold)]" />
                <span>
                  Upload old photos, letters and recordings → AI crafts your{' '}
                  <strong className="text-[var(--kl-ink)]">family history</strong>, an{' '}
                  <strong className="text-[var(--kl-ink)]">interactive timeline</strong>, a narrated{' '}
                  <strong className="text-[var(--kl-ink)]">documentary</strong>, and{' '}
                  <strong className="text-[var(--kl-ink)]">biographies</strong>.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-[var(--kl-gold)]" />
                <span>
                  Everything becomes a <strong className="text-[var(--kl-ink)]">searchable archive</strong> —
                  “find Grandfather’s 1968 letter” just works.
                </span>
              </li>
              <li className="flex gap-3">
                <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-[var(--kl-gold)]" />
                <span>
                  <strong className="text-[var(--kl-ink)]">Originals are always preserved</strong> —
                  AI-enhanced copies live alongside, clearly labeled.{' '}
                  <ProvenanceTag kind="ai-assisted" className="ml-1 align-middle" />
                </span>
              </li>
            </ul>
            <p className="mt-7 text-[13px] leading-relaxed text-[var(--kl-low)]">
              AI assists the archive; it never edits the truth. It never infers
              paternity, religion or ethnicity — and it never fabricates relatives.
            </p>
          </div>
          <div className="min-w-0">
            <HeritageShowcase />
          </div>
        </div>
      </section>

      {/* ── Section 5b — Heritage Interview Agent ─────────────────────── */}
      <section className={SECTION} aria-label="Heritage Interview Agent">
        <HeritageInterview />
      </section>

      {/* ── Section 6 — Privacy & permanence strip ────────────────────── */}
      <section className={SECTION}>
        <div className="grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Lock,
              title: 'Family-only by default',
              body: 'Trees are private. Sharing is per-branch — your maternal line never sees the paternal side unless you say so.',
            },
            {
              icon: KeyRound,
              title: 'Legacy contacts',
              body: 'Name who stewards the tree if you no longer can, so the record outlives any one keeper.',
            },
            {
              icon: Download,
              title: 'Export anytime',
              body: 'GEDCOM-friendly data portability. Your family data is yours — take it wherever you go.',
            },
          ].map((c, i) => {
            const [ink, tile] = MODULE_TONES[i % MODULE_TONES.length]
            return (
              <motion.div
                key={c.title}
                initial={reduced ? false : { opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.5 }}
                transition={{ delay: i * 0.1, duration: 0.55, ease: cloudEase }}
                className={`${KL_CARD} p-7`}
              >
                <span className="grid h-11 w-11 place-items-center rounded-[12px]" style={{ background: tile, color: ink }}>
                  <c.icon size={20} aria-hidden="true" />
                </span>
                <h3 className="kl-serif mt-5 text-[26px] font-semibold leading-tight">{c.title}</h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--kl-mid)]">{c.body}</p>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* ── Section 6b — Year in review & Reunion Agent ───────────────── */}
      <section className={SECTION} aria-label="Family year in review and reunion planner">
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <Eyebrow>The year, remembered together</Eyebrow>
          <h2 className="kl-h2 mt-5">Your family’s year — told back to you, and the next one planned.</h2>
        </div>
        <YearInReview />
      </section>

      {/* ── Section 7 — CTA ───────────────────────────────────────────── */}
      <ClosingStage
        eyebrow="Start your tree"
        glow="var(--kl-sky)"
        title={
          <>
            Begin with one person. <span className="italic text-[var(--kl-gold-deep)]">The graph grows with you.</span>
          </>
        }
      >
        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link to="/app" className={KL_BTN_GOLD}>
            Start your family tree <ArrowRight size={17} aria-hidden="true" />
          </Link>
          <Link to="/memorials" className={KL_BTN_GHOST}>
            Visit the Digital Graveyard <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </ClosingStage>
    </PublicShell>
  )
}
