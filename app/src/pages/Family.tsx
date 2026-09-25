import { Link } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Download, KeyRound, Lock } from 'lucide-react'
import { ArcButton, ProvenanceTag } from '@/components/ui-kit'
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

/**
 * /family — Family Tree & Heritage AI (family.md).
 * Paper treatment (archival warmth) with a twilight “engine room” panel
 * for the relationship-graph architecture.
 */
export default function Family() {
  const reduced = useReducedMotion()

  return (
    <div className="bg-paper text-paper-ink">
      {/* ── Section 1 — Page hero (paper) ─────────────────────────────── */}
      <section className="px-6 py-20 lg:py-28">
        <div className="mx-auto grid max-w-container items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow text-[#9A6B1F]">Module H — Family Tree</p>
            <WordRise
              as="h1"
              text="Every family is a living graph."
              className="display-lg mt-4 block text-paper-ink"
              rise={40}
              stagger={0.08}
            />
            <motion.p
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6, ease: cloudEase }}
              className="body-lg mt-5 max-w-xl text-[#5A5245]"
            >
              Persons and relationships — verified by the people who know, computed
              across infinite generations, and never invented by AI.
            </motion.p>
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.6, ease: cloudEase }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <ArcButton size="lg">Start your tree</ArcButton>
              <a
                href="#verification"
                className="inline-flex items-center gap-2 rounded-full border border-[#241F16]/20 px-8 py-4 font-semibold text-paper-ink transition-colors duration-200 hover:border-[#D9A648] hover:text-[#9A6B1F]"
              >
                How verification works ↓
              </a>
            </motion.div>
          </div>

          {/* archival frame + overlapping mini tree */}
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: cloudEase }}
            className="relative"
          >
            <div className="overflow-hidden rounded-card-xl shadow-[0_32px_70px_-24px_rgba(36,31,22,0.45)] ring-1 ring-[#D9A648]/30">
              <div className="rounded-card-xl border-2 border-[#D9A648]/60">
                <motion.img
                  src="/family-archive-1.jpg"
                  alt="Three generations of an East African family on a veranda at golden hour"
                  className="aspect-[3/2] w-full object-cover"
                  initial={false}
                  animate={reduced ? undefined : { scale: [1, 1.08, 1] }}
                  transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
            </div>
            <div className="absolute -bottom-8 -left-6 w-32 lg:-left-12 lg:w-44">
              <HeroMiniTree />
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Section 2 — The graph beneath (twilight engine room) ─────── */}
      <section className="twilight-field noise-overlay px-6 py-24 text-text-hi">
        <div className="mx-auto grid max-w-container items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="eyebrow text-gold">Architecture</p>
            <h2 className="h2 mt-3">A relationship graph is the truth. The tree is just a view.</h2>
            <ul className="mt-8 space-y-6">
              {ARCHITECTURE_POINTS.map((p, i) => (
                <motion.li
                  key={p.label}
                  initial={reduced ? false : { opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, amount: 0.6 }}
                  transition={{ delay: i * 0.12, duration: 0.5, ease: cloudEase }}
                  className="border-l-2 border-gold/40 pl-4"
                >
                  <p className="mono-data text-[0.78rem] font-semibold tracking-wide text-gold-soft">{p.label}</p>
                  <p className="mt-1 text-[0.95rem] leading-relaxed text-text-mid">{p.body}</p>
                </motion.li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-7">
            <FamilyTreeGraph />
          </div>
        </div>
      </section>

      {/* ── Section 3 — Trust by corroboration ────────────────────────── */}
      <section id="verification" className="px-6 py-24">
        <div className="mx-auto max-w-container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow text-[#9A6B1F]">Trust by corroboration</p>
            <h2 className="h2 mt-3 text-paper-ink">Nothing enters the tree unverified.</h2>
          </div>
          <div className="mt-14">
            <VerificationJourney />
          </div>
        </div>
      </section>

      {/* ── Section 4 — “How are we related?” path finder ────────────── */}
      <section id="path-finder" className="bg-paper-2 px-6 py-24">
        <div className="mx-auto max-w-container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow text-[#9A6B1F]">Path finder</p>
            <h2 className="h2 mt-3 text-paper-ink">“How are we related?”</h2>
            <p className="body-lg mt-4 text-[#5A5245]">
              Ask the graph. The shortest verified path lights up hop by hop — and the
              shared ancestors reveal themselves.
            </p>
          </div>
          <div className="mt-12">
            <PathFinder />
          </div>
        </div>
      </section>

      {/* ── Section 5 — Family Heritage AI ────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-container items-start gap-12 lg:grid-cols-2">
          <div className="lg:sticky lg:top-28">
            <p className="eyebrow text-[#9A6B1F]">Family Heritage AI</p>
            <h2 className="h2 mt-3 text-paper-ink">Your archive, brought back to life.</h2>
            <ul className="mt-7 space-y-5 text-[1.02rem] leading-relaxed text-[#5A5245]">
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#D9A648]" />
                Upload old photos, letters and recordings → AI crafts your{' '}
                <strong className="text-paper-ink">family history</strong>, an{' '}
                <strong className="text-paper-ink">interactive timeline</strong>, a narrated{' '}
                <strong className="text-paper-ink">documentary</strong>, and{' '}
                <strong className="text-paper-ink">biographies</strong>.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#D9A648]" />
                Everything becomes a <strong className="text-paper-ink">searchable archive</strong> —
                “find Grandfather’s 1968 letter” just works.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#D9A648]" />
                <span>
                  <strong className="text-paper-ink">Originals are always preserved</strong> —
                  AI-enhanced copies live alongside, clearly labeled.{' '}
                  <ProvenanceTag kind="ai-assisted" className="ml-1 align-middle" />
                </span>
              </li>
            </ul>
            <p className="caption mt-6 !text-[#6B5F4E]">
              AI assists the archive; it never edits the truth. It never infers
              paternity, religion or ethnicity — and it never fabricates relatives.
            </p>
          </div>
          <HeritageShowcase />
        </div>
      </section>

      {/* ── Section 5b — Heritage Interview Agent ─────────────────────── */}
      <section className="bg-paper-2 px-6 py-24" aria-label="Heritage Interview Agent">
        <div className="mx-auto max-w-container">
          <HeritageInterview />
        </div>
      </section>

      {/* ── Section 6 — Privacy & permanence strip ────────────────────── */}
      <section className="bg-paper-2 px-6 py-20">
        <div className="mx-auto grid max-w-container gap-6 md:grid-cols-3">
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
          ].map((c, i) => (
            <motion.div
              key={c.title}
              initial={reduced ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.7 }}
              transition={{ delay: i * 0.1, duration: 0.55, ease: cloudEase }}
              className="rounded-card-lg border border-[#241F16]/10 bg-[#FFFDF8]/70 p-6 shadow-[0_16px_40px_-16px_rgba(36,31,22,0.2)] backdrop-blur-sm"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#D9A648]/15 text-[#9A6B1F]">
                <c.icon size={20} />
              </span>
              <h3 className="h3 mt-4 text-paper-ink">{c.title}</h3>
              <p className="mt-2 text-[0.95rem] leading-relaxed text-[#5A5245]">{c.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Section 6b — Year in review & Reunion Agent ───────────────── */}
      <section className="px-6 py-24" aria-label="Family year in review and reunion planner">
        <div className="mx-auto max-w-container">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="eyebrow text-[#9A6B1F]">The year, remembered together</p>
            <h2 className="h2 mt-3 text-paper-ink">Your family’s year — told back to you, and the next one planned.</h2>
          </div>
          <YearInReview />
        </div>
      </section>

      {/* ── Section 7 — CTA ───────────────────────────────────────────── */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="h2 text-paper-ink">Begin with one person. The graph grows with you.</h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <ArcButton size="lg">Start your family tree</ArcButton>
            <Link
              to="/memorials"
              className="inline-flex items-center gap-2 rounded-full border border-[#241F16]/20 px-8 py-4 font-semibold text-paper-ink transition-colors duration-200 hover:border-[#D9A648] hover:text-[#9A6B1F]"
            >
              Visit the Digital Graveyard <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
