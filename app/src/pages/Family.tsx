import { Link } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Download, KeyRound, Lock, Share2 } from 'lucide-react'
import { ArcButton } from '@/components/ui-kit'
import FamilyTreeGraph from '@/components/family/FamilyTreeGraph'
import VerificationJourney from '@/components/family/VerificationJourney'
import PathFinder from '@/components/family/PathFinder'
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
    label: 'One person, one node — relatives join by invitation',
    body: 'Invite a relative to claim their place: they accept explicitly, and nothing is shown to them before. Separate trees are not merged automatically.',
  },
]

/**
 * /family — Family Tree. Every claim on this page is one the app keeps (see NOT-DONE.md, FT-07).
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
              Persons and relationships — confirmed by the people who know them,
              computed across as many generations as you record, and never invented by AI.
            </motion.p>
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.6, ease: cloudEase }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <Link to="/join?mode=signup"><ArcButton size="lg">Start your tree</ArcButton></Link>
              <a
                href="#verification"
                className="inline-flex items-center gap-2 rounded-full border border-[#241F16]/20 px-8 py-4 font-semibold text-paper-ink transition-colors duration-200 hover:border-[#D9A648] hover:text-[#9A6B1F]"
              >
                How confirmation works ↓
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
            <h2 className="h2 mt-3 text-paper-ink">Every person starts as pending, and is confirmed by those who know them.</h2>
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
              Ask the graph. The shortest recorded path lights up hop by hop — and the
              shared ancestors reveal themselves.
            </p>
          </div>
          <div className="mt-12">
            <PathFinder />
          </div>
        </div>
      </section>

      {/* ── Section 5 — Memories and timeline (written by members; nothing is generated) ── */}
      <section className="px-6 py-24">
        <div className="mx-auto max-w-container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="eyebrow text-[#9A6B1F]">Memories</p>
            <h2 className="h2 mt-3 text-paper-ink">What the family remembers, kept with the person.</h2>
            <ul className="mx-auto mt-7 max-w-xl space-y-4 text-left text-[1.02rem] leading-relaxed text-[#5A5245]">
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#D9A648]" />
                Members write <strong className="text-paper-ink">memories</strong> on a person’s page: who they were, what happened, when.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#D9A648]" />
                Each person has a <strong className="text-paper-ink">timeline</strong> built from their own record and their dated memories.
              </li>
              <li className="flex gap-3">
                <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#D9A648]" />
                Only members of the tree can read them, as far as their role allows.
              </li>
            </ul>
            <p className="caption mt-6 !text-[#6B5F4E]">
              Nothing here is generated. Photos, documents and recordings, and any AI help to organise them, are not part of Kinjy yet.
            </p>
          </div>
        </div>
      </section>

      {/* ── Section 6 — Privacy & permanence strip ────────────────────── */}
      <section className="bg-paper-2 px-6 py-20">
        <div className="mx-auto grid max-w-container gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: Lock,
              title: 'Private by default',
              body: 'A tree is only seen by the people you invite, and a family tie gives no access by itself. Roles: owner, contributor, viewer.',
            },
            {
              icon: Share2,
              title: 'Share one branch',
              body: 'Show a relative one branch only — a person, their descendants and partners — read-only. The rest of the tree stays hidden from them.',
            },
            {
              icon: KeyRound,
              title: 'Trusted contacts',
              body: 'Name up to three members who could take over if you cannot. They must accept, and taking over waits 30 days during which any owner can cancel.',
            },
            {
              icon: Download,
              title: 'Export for owners',
              body: 'Owners can download the tree as a GEDCOM file. Living people and unverified records are hidden as “Private”; no photos or documents.',
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

      {/* ── Section 7 — CTA ───────────────────────────────────────────── */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="h2 text-paper-ink">Begin with one person. The graph grows with you.</h2>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Link to="/join?mode=signup"><ArcButton size="lg">Start your family tree</ArcButton></Link>
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
