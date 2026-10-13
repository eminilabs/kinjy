import { Link } from 'react-router'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowRight, Download, KeyRound, Lock, Share2 } from 'lucide-react'
import PublicShell from '@/components/landing/PublicShell'
import { ClosingStage, Eyebrow, Stage } from '@/components/landing/PageKit'
import { KL_BTN_GHOST, KL_BTN_GOLD, KL_CARD } from '@/components/landing/kl-classes'
import { MODULE_TONES } from '@/components/platform/tones'
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

const SECTION = 'kl-pad-x border-t border-[var(--kl-paper-2)] py-[clamp(72px,9vw,120px)]'

/**
 * /family — Family Tree, on the landing's paper design. Every claim on this page is one the app keeps (NOT-DONE.md, FT-07).
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
            Persons and relationships — confirmed by the people who know them, computed
            across as many generations as you record, and never invented by AI.
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
          <h2 className="kl-h2 mt-5">Every person starts as pending, and is confirmed by those who know them.</h2>
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
            Ask the graph. The shortest recorded path lights up hop by hop — and the
            shared ancestors reveal themselves.
          </p>
        </div>
        <div className="mt-12">
          <PathFinder />
        </div>
      </section>

      {/* ── Section 5 — Memories and timeline (written by members; nothing is generated) ── */}
      <section className={SECTION}>
        <div className="mx-auto max-w-3xl text-center">
          <Eyebrow>Memories</Eyebrow>
          <h2 className="kl-h2 mt-5">What the family remembers, kept with the person.</h2>
          <ul className="mx-auto mt-8 max-w-xl space-y-5 text-left text-[17px] leading-relaxed text-[var(--kl-mid)]">
            <li className="flex gap-3">
              <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-[var(--kl-gold)]" />
              <span>
                Members write <strong className="text-[var(--kl-ink)]">memories</strong> on a person’s page: who they were, what happened, when.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-[var(--kl-gold)]" />
              <span>
                Each person has a <strong className="text-[var(--kl-ink)]">timeline</strong> built from their own record and their dated memories.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="mt-2.5 h-2 w-2 shrink-0 rounded-full bg-[var(--kl-gold)]" />
              <span>Only members of the tree can read them, as far as their role allows.</span>
            </li>
          </ul>
          <p className="mt-7 text-[13px] leading-relaxed text-[var(--kl-low)]">
            Nothing here is generated. Photos, documents and recordings, and any AI help to organise them, are not part of Kinjy yet.
          </p>
        </div>
      </section>

      {/* ── Section 6 — Privacy & permanence strip ────────────────────── */}
      <section className={SECTION}>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
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
