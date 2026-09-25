import { motion, useReducedMotion } from 'framer-motion'
import { AlertTriangle, CheckCheck, GitPullRequest, Scale, Search, ShieldCheck, Spline, Users } from 'lucide-react'
import Avatar from './Avatar'
import { siblingsByCloseness, PERSON_MAP } from './tree-data'

const cloudEase = [0.22, 1, 0.36, 1] as [number, number, number, number]
const snapEase = [0.34, 1.56, 0.64, 1] as [number, number, number, number]

function Chip({ tone, children }: { tone: 'pending' | 'verified' | 'dispute'; children: string }) {
  const styles = {
    pending: 'border-[#E0A33E]/50 bg-[#E0A33E]/10 text-[#9A6B1F]',
    verified: 'border-[#2F8F66]/50 bg-[#3FB27F]/15 text-[#2F8F66]',
    dispute: 'border-[#DE5C5C]/50 bg-[#DE5C5C]/10 text-[#B54343]',
  } as const
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 mono-data text-[0.68rem] font-semibold tracking-wider ${styles[tone]}`}>
      {children}
    </span>
  )
}

/** Animated PENDING → VERIFIED chip flip (300ms snap once the arc completes). */
function FlippingChip({ delay }: { delay: number }) {
  const reduced = useReducedMotion()
  return (
    <span className="relative inline-grid">
      <motion.span
        className="col-start-1 row-start-1"
        initial={{ opacity: 1, rotateX: 0 }}
        whileInView={{ opacity: 0, rotateX: -90 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ delay: reduced ? 0 : delay, duration: 0.3, ease: snapEase }}
      >
        <Chip tone="pending">PENDING</Chip>
      </motion.span>
      <motion.span
        className="col-start-1 row-start-1"
        initial={{ opacity: 0, rotateX: 90 }}
        whileInView={{ opacity: 1, rotateX: 0 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ delay: reduced ? 0 : delay, duration: 0.3, ease: snapEase }}
      >
        <Chip tone="verified">VERIFIED ✓</Chip>
      </motion.span>
    </span>
  )
}

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.35, duration: 0.7, ease: cloudEase },
  }),
}

/**
 * Trust by corroboration (family.md §3): Propose → Confirm → Dispute
 * workflow cards joined by a drawn arc, plus the 4-card governance strip.
 */
export default function VerificationJourney() {
  const reduced = useReducedMotion()
  const siblings = siblingsByCloseness('kito')

  return (
    <div>
      {/* Three workflow cards connected by a drawn arc */}
      <div className="relative">
        <svg
          className="pointer-events-none absolute left-0 top-0 hidden h-full w-full lg:block"
          viewBox="0 0 1200 320"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <motion.path
            d="M 200,290 C 400,340 420,40 600,60 C 780,40 800,340 1000,290"
            fill="none"
            stroke="url(#verifyArc)"
            strokeWidth={2}
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: reduced ? 0 : 2.1, ease: [0.65, 0, 0.35, 1] }}
          />
          <defs>
            <linearGradient id="verifyArc" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F0C878" />
              <stop offset="55%" stopColor="#D9A648" />
              <stop offset="100%" stopColor="#8FB8E8" />
            </linearGradient>
          </defs>
        </svg>

        <div className="relative grid gap-6 lg:grid-cols-3">
          {/* 1 — Propose */}
          <motion.article
            custom={0}
            variants={cardVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
            className="rounded-card-lg border border-[#241F16]/10 bg-[#FFFDF8] p-6 shadow-[0_16px_40px_-16px_rgba(36,31,22,0.25)]"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#D9A648]/15 text-[#9A6B1F]">
                <GitPullRequest size={20} />
              </span>
              <Chip tone="pending">PENDING</Chip>
            </div>
            <h3 className="h3 mt-4 text-paper-ink">1 · Propose</h3>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-[#5A5245]">
              A member adds a relative — a Person Node plus a typed Relationship Edge
              (<span className="mono-data text-[0.78rem]">parent_of</span>,{' '}
              <span className="mono-data text-[0.78rem]">spouse_of</span>,{' '}
              <span className="mono-data text-[0.78rem]">adoptive_parent_of</span>…).
              Nothing is assumed; the edge enters <strong>PENDING</strong>.
            </p>
          </motion.article>

          {/* 2 — Confirm */}
          <motion.article
            custom={1}
            variants={cardVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
            className="rounded-card-lg border border-[#D9A648]/40 bg-[#FFFDF8] p-6 shadow-[0_16px_40px_-16px_rgba(36,31,22,0.25)]"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#3FB27F]/15 text-[#2F8F66]">
                <CheckCheck size={20} />
              </span>
              <FlippingChip delay={1.75} />
            </div>
            <h3 className="h3 mt-4 text-paper-ink">2 · Confirm</h3>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-[#5A5245]">
              The other party confirms the relationship — a gold seal draws in and the
              edge becomes <strong>VERIFIED</strong>. For the deceased, who cannot
              speak for themselves, <strong>3 closely-related members</strong> must
              corroborate:
            </p>
            <div className="mt-3 flex items-center gap-3 rounded-card-sm bg-[#3FB27F]/8 p-3">
              <div className="flex -space-x-2">
                {(['rehema', 'pendo', 'kito'] as const).map((id, i) => (
                  <motion.span
                    key={id}
                    initial={{ opacity: 0, scale: 0.5 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ delay: reduced ? 0 : 1.2 + i * 0.2, duration: 0.3, ease: snapEase }}
                  >
                    <Avatar cell={PERSON_MAP[id].cell} size={34} name={PERSON_MAP[id].name} className="ring-2 ring-[#3FB27F]" />
                  </motion.span>
                ))}
              </div>
              <p className="caption !text-[#2F8F66]">
                3 of 3 corroborations gathered for <strong>Juma</strong> (deceased) → VERIFIED
              </p>
            </div>
          </motion.article>

          {/* 3 — Dispute */}
          <motion.article
            custom={2}
            variants={cardVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.5 }}
            className="rounded-card-lg border border-[#241F16]/10 bg-[#FFFDF8] p-6 shadow-[0_16px_40px_-16px_rgba(36,31,22,0.25)]"
          >
            <div className="flex items-center justify-between">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#DE5C5C]/12 text-[#B54343]">
                <Scale size={20} />
              </span>
              <Chip tone="dispute">DISPUTED</Chip>
            </div>
            <h3 className="h3 mt-4 text-paper-ink">3 · Dispute</h3>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-[#5A5245]">
              Disagreements open a <strong>structured dispute workflow</strong> — evidence
              notes, statements from both branches, and admin review. The edge is held,
              never silently deleted, until the family record is resolved.
            </p>
          </motion.article>
        </div>
      </div>

      {/* Governance strip — 4 mini-cards */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.5, ease: cloudEase }}
          className="rounded-card-md border border-[#241F16]/10 bg-[#FFFDF8]/80 p-4"
        >
          <Users size={18} className="text-[#9A6B1F]" />
          <h4 className="mt-2 text-sm font-bold text-paper-ink">Closeness ranking</h4>
          <p className="caption mt-1 !text-[#6B5F4E]">
            Full siblings before half-siblings — computed from shared parents, consistently.
          </p>
          <div className="mt-2 space-y-1">
            {siblings.map((s, i) => (
              <p key={s.id} className="mono-data text-[0.68rem] text-[#6B5F4E]">
                {i + 1}. {PERSON_MAP[s.id].name} — <span className={s.kind === 'full' ? 'text-[#2F8F66]' : 'text-[#9A6B1F]'}>{s.kind} sibling</span>
              </p>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.5, delay: 0.1, ease: cloudEase }}
          className="rounded-card-md border border-[#241F16]/10 bg-[#FFFDF8]/80 p-4"
        >
          <Search size={18} className="text-[#9A6B1F]" />
          <h4 className="mt-2 text-sm font-bold text-paper-ink">Duplicate detection — never auto-merge</h4>
          <p className="caption mt-1 !text-[#6B5F4E]">
            Suspected duplicates are flagged side-by-side for human confirmation.
            A merge only ever happens when a person decides it.
          </p>
          <p className="mono-data mt-2 inline-block rounded-full border border-[#E0A33E]/40 bg-[#E0A33E]/10 px-2 py-0.5 text-[0.65rem] text-[#9A6B1F]">
            2 possible matches · awaiting review
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.5, delay: 0.2, ease: cloudEase }}
          className="rounded-card-md border border-[#241F16]/10 bg-[#FFFDF8]/80 p-4"
        >
          <ShieldCheck size={18} className="text-[#9A6B1F]" />
          <h4 className="mt-2 text-sm font-bold text-paper-ink">AI never infers — never fabricates</h4>
          <p className="caption mt-1 !text-[#6B5F4E]">
            AI does not infer paternity, religion or ethnicity, and never invents
            relatives. Only verified edges enter the graph.
          </p>
          <p className="mono-data mt-2 inline-flex items-center gap-1 rounded-full border border-[#DE5C5C]/40 bg-[#DE5C5C]/8 px-2 py-0.5 text-[0.65rem] text-[#B54343]">
            <AlertTriangle size={10} /> inference: blocked
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.5, delay: 0.3, ease: cloudEase }}
          className="rounded-card-md border border-[#241F16]/10 bg-[#FFFDF8]/80 p-4"
        >
          <Spline size={18} className="text-[#9A6B1F]" />
          <h4 className="mt-2 text-sm font-bold text-paper-ink">Common ancestor & path finder</h4>
          <p className="caption mt-1 !text-[#6B5F4E]">
            Ask “How are we related?” and watch the shortest path light up across
            the graph — try it below.
          </p>
          <a href="#path-finder" className="mono-data mt-2 inline-block text-[0.68rem] text-[#9A6B1F] underline decoration-[#D9A648]/50 underline-offset-4">
            Open the path finder ↓
          </a>
        </motion.div>
      </div>
    </div>
  )
}
