import { Camera, Check, X, Accessibility, GitPullRequest, ScanEye } from 'lucide-react'
import { Chip, Dot, SubSection } from './primitives'
import { cn } from '@/lib/utils'

const PIPELINE: { label: string; ok: boolean | 'blocked' }[] = [
  { label: 'build', ok: true },
  { label: 'screenshot diff', ok: true },
  { label: 'axe a11y', ok: true },
  { label: 'PR gate', ok: 'blocked' },
]

const AXE_ROWS: { rule: string; detail: string; pass: boolean }[] = [
  { rule: 'color-contrast', detail: '0 violations · 214 elements scanned', pass: true },
  { rule: 'landmark-roles', detail: 'pass · header/nav/main/footer present', pass: true },
  { rule: 'focus-order', detail: 'pass · keyboard map verified, LTR + RTL', pass: true },
  { rule: 'aria-labels', detail: 'pass · 61 interactive nodes labelled', pass: true },
  { rule: 'reduced-motion', detail: 'pass · ambient loops collapse correctly', pass: true },
]

const PR_GATES: { pr: string; title: string; state: 'green' | 'blocked'; detail: string }[] = [
  { pr: '#486', title: 'platform-eng · AI ops console', state: 'green', detail: '0.1% diff · axe clean · merge allowed' },
  { pr: '#479', title: 'feed-modes-v2', state: 'blocked', detail: '0.9% diff > 0.5% threshold · human review required' },
]

/** Tiny CSS-drawn "screenshot" of a UI card — before/after thumbnails. */
function Thumb({ variant }: { variant: 'before' | 'after' }) {
  return (
    <div
      className="h-full w-full rounded-[6px] border border-white/10 bg-ink p-1.5"
      aria-hidden="true"
    >
      {/* navbar */}
      <div className="flex items-center gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-gold" />
        <span className="h-[3px] w-8 rounded bg-white/25" />
        <span className="ms-auto h-[3px] w-4 rounded bg-gold/70" />
      </div>
      {/* hero block */}
      <div className={cn('mt-1.5 h-5 rounded-sm', variant === 'after' ? 'bg-indigo/60' : 'bg-indigo-deep/80')} />
      {/* card rows */}
      <div className="mt-1 flex gap-1">
        <div className="h-4 flex-1 rounded-sm bg-white/10" />
        <div className={cn('h-4 flex-1 rounded-sm', variant === 'after' ? 'bg-white/15' : 'bg-white/10')} />
        <div className="h-4 flex-1 rounded-sm bg-white/10" />
      </div>
    </div>
  )
}

/**
 * VisualA11yCi (C7) — CI pipeline strip: visual regression screenshots with diff
 * badges, axe accessibility check rows, and PR gate states.
 */
export default function VisualA11yCi() {
  return (
    <SubSection
      id="visual-a11y-ci"
      eyebrow="C7 · Visual Regression + Accessibility CI"
      title={
        <>
          <ScanEye size={19} className="me-2 inline text-gold" aria-hidden="true" />
          Pixels and focus rings are tested too.
        </>
      }
      blurb="Every PR renders key routes headlessly, diffs screenshots against the golden set, and runs axe across the accessibility tree. Visual or a11y regressions gate the merge — design quality is enforced by pipeline, not vigilance."
    >
      {/* Pipeline strip */}
      <div className="flex flex-wrap items-center gap-1.5" aria-label="CI pipeline stages">
        {PIPELINE.map((s, i) => (
          <span key={s.label} className="flex items-center gap-1.5">
            {i > 0 && <span className="h-px w-5 bg-white/15 sm:w-8" aria-hidden="true" />}
            <span
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-3 py-1.5',
                s.ok === true && 'border-success/30 bg-success/10',
                s.ok === 'blocked' && 'border-danger/40 bg-danger/10',
              )}
            >
              <Dot tone={s.ok === true ? 'success' : 'danger'} />
              <span
                className={cn(
                  'mono-data text-[0.65rem] uppercase tracking-[0.12em]',
                  s.ok === true ? 'text-success' : 'text-danger',
                )}
              >
                {s.label}
              </span>
            </span>
          </span>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Screenshot diffs */}
        <div className="rounded-card-md border border-white/8 bg-ink-3/50 p-4">
          <p className="caption flex items-center gap-2 font-bold uppercase tracking-[0.14em] text-text-mid">
            <Camera size={13} className="text-gold" aria-hidden="true" /> Screenshot diff · /feeds route
          </p>
          <div className="mt-3 grid grid-cols-[1fr_1fr_auto] items-center gap-3">
            <div className="aspect-[16/10]">
              <Thumb variant="before" />
              <p className="mono-data mt-1.5 text-center text-[0.62rem] uppercase tracking-[0.12em] text-text-low">before · golden</p>
            </div>
            <div className="aspect-[16/10]">
              <Thumb variant="after" />
              <p className="mono-data mt-1.5 text-center text-[0.62rem] uppercase tracking-[0.12em] text-text-low">after · PR #486</p>
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <Chip tone="gold">0.1% diff</Chip>
              <span className="mono-data text-[0.6rem] text-text-low">threshold 0.5%</span>
              <Chip tone="success">
                <Check size={9} aria-hidden="true" /> pass
              </Chip>
            </div>
          </div>
          <p className="mono-data mt-3 text-[0.68rem] text-text-low">
            12 routes × 3 viewports × LTR/RTL · 216 snapshots in 2m 08s
          </p>
        </div>

        {/* axe rows */}
        <div className="overflow-hidden rounded-card-md border border-white/8">
          <p className="mono-data flex items-center gap-2 border-b border-white/10 bg-ink-3/80 px-4 py-2.5 text-[0.7rem] uppercase tracking-[0.12em] text-text-low">
            <Accessibility size={12} aria-hidden="true" /> axe-core · WCAG 2.2 AA
          </p>
          <div className="mono-data divide-y divide-white/5 text-[0.74rem]">
            {AXE_ROWS.map((a) => (
              <div key={a.rule} className="grid grid-cols-[130px_1fr_24px] items-center gap-3 px-4 py-2.5 hover:bg-white/[0.03]">
                <span className="truncate text-sky">{a.rule}</span>
                <span className="truncate text-text-mid">{a.detail}</span>
                <span className="flex justify-end text-success">
                  <Check size={13} aria-hidden="true" />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* PR gate states */}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {PR_GATES.map((g) => (
          <div
            key={g.pr}
            className={cn(
              'flex items-center gap-3 rounded-card-md border p-3.5',
              g.state === 'green' ? 'border-success/25 bg-success/[0.05]' : 'border-danger/30 bg-danger/[0.05]',
            )}
          >
            <GitPullRequest size={16} className={g.state === 'green' ? 'text-success' : 'text-danger'} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="mono-data truncate text-[0.75rem] text-text-hi">
                PR {g.pr} · {g.title}
              </p>
              <p className="mono-data truncate text-[0.68rem] text-text-low">{g.detail}</p>
            </div>
            {g.state === 'green' ? (
              <Chip tone="success">
                <Check size={10} aria-hidden="true" /> gate green
              </Chip>
            ) : (
              <Chip tone="danger">
                <X size={10} aria-hidden="true" /> blocked
              </Chip>
            )}
          </div>
        ))}
      </div>
    </SubSection>
  )
}
