import { Check, X, OctagonX, FlaskConical } from 'lucide-react'
import { Chip, Dot, SubSection } from './primitives'
import { cn } from '@/lib/utils'

interface Suite {
  id: string
  name: string
  metric: string
  result: string
  gate: string
  pass: boolean
  failing?: boolean
}

const SUITES: Suite[] = [
  { id: 'eval-groundedness-en', name: 'Groundedness · English', metric: 'citation-supported claims', result: '98.2%', gate: '≥ 95%', pass: true },
  { id: 'eval-groundedness-sw', name: 'Groundedness · Kiswahili', metric: 'citation-supported claims', result: '91.0%', gate: '≥ 95%', pass: false, failing: true },
  { id: 'eval-groundedness-fr', name: 'Groundedness · Français', metric: 'citation-supported claims', result: '96.8%', gate: '≥ 95%', pass: true },
  { id: 'eval-groundedness-ar', name: 'Groundedness · العربية', metric: 'citation-supported claims', result: '95.4%', gate: '≥ 95%', pass: true },
  { id: 'eval-groundedness-zh', name: 'Groundedness · 中文', metric: 'citation-supported claims', result: '96.1%', gate: '≥ 95%', pass: true },
  { id: 'eval-hallucination', name: 'Hallucination rate · all locales', metric: 'unsupported claims / 1k answers', result: '1.8%', gate: '≤ 2.5%', pass: true },
  { id: 'eval-latency', name: 'Latency · assistant answers', metric: 'p95, streaming first token', result: '1.9s', gate: '≤ 2.5s', pass: true },
]

/**
 * EvalHarness (C1) — AI evaluation harness: regression suites run as unit tests
 * for every AI feature, with per-language quality gates and a CI gate that blocks
 * unsafe model swaps.
 */
export default function EvalHarness() {
  return (
    <SubSection
      id="eval-harness"
      eyebrow="C1 · AI Evaluation Harness"
      title={
        <>
          <FlaskConical size={19} className="me-2 inline text-gold" aria-hidden="true" />
          Unit tests for AI behaviour.
        </>
      }
      blurb="Every AI feature ships with a regression suite — groundedness per language, hallucination rate, latency. The suites run in CI exactly like unit tests, and the quality gate blocks model swaps that regress any locale."
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Suite table */}
        <div className="overflow-hidden rounded-card-md border border-white/8">
          <div className="mono-data grid grid-cols-[1fr_84px_80px_64px] items-center gap-3 border-b border-white/10 bg-ink-3/80 px-4 py-2.5 text-[0.7rem] uppercase tracking-[0.12em] text-text-low md:grid-cols-[110px_1fr_90px_90px_70px]">
            <span className="hidden md:inline">Suite ID</span>
            <span>Suite</span>
            <span className="text-end">Result</span>
            <span className="text-end">Gate</span>
            <span className="text-end">Status</span>
          </div>
          {SUITES.map((s) => (
            <div
              key={s.id}
              className={cn(
                'mono-data grid grid-cols-[1fr_84px_80px_64px] items-center gap-3 border-b border-white/5 px-4 py-3 text-[0.78rem] md:grid-cols-[110px_1fr_90px_90px_70px]',
                s.failing ? 'bg-danger/[0.07]' : 'hover:bg-white/[0.03]',
              )}
            >
              <span className="hidden truncate text-text-low md:inline">{s.id.replace('eval-', '')}</span>
              <span className="min-w-0">
                <span className="block truncate text-text-hi">{s.name}</span>
                <span className="block truncate text-[0.68rem] text-text-low">{s.metric}</span>
              </span>
              <span className={cn('text-end', s.pass ? 'text-text-hi' : 'font-semibold text-danger')}>{s.result}</span>
              <span className="text-end text-text-low">{s.gate}</span>
              <span className="flex justify-end">
                {s.pass ? (
                  <Chip tone="success">
                    <Check size={10} aria-hidden="true" /> pass
                  </Chip>
                ) : (
                  <Chip tone="danger">
                    <X size={10} aria-hidden="true" /> fail
                  </Chip>
                )}
              </span>
            </div>
          ))}
          <div className="mono-data flex items-center justify-between gap-3 bg-ink-3/60 px-4 py-2.5 text-[0.7rem] text-text-low">
            <span>run #4,812 · main@9f3c2a1 · 7 suites · 3m 41s</span>
            <span className="text-danger">6/7 passing — gate armed</span>
          </div>
        </div>

        {/* CI gate visualization */}
        <aside
          aria-label="CI quality gate status"
          className="flex flex-col rounded-card-md border border-danger/30 bg-danger/[0.05] p-4"
        >
          <p className="caption font-bold uppercase tracking-[0.14em] text-danger">CI quality gate</p>
          <p className="mono-data mt-2 text-[0.75rem] text-text-mid">
            candidate: <span className="text-gold-soft">kimi-k2.6-turbo</span> → production
          </p>

          {/* pipeline strip */}
          <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
            <span className="flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1">
              <Dot tone="success" />
              <span className="mono-data text-[0.62rem] uppercase tracking-[0.1em] text-success">eval suite</span>
            </span>
            <span className="h-px flex-1 bg-gradient-to-r from-success/50 to-danger/60" />
            <span className="flex items-center gap-1.5 rounded-full border border-danger/40 bg-danger/15 px-2.5 py-1 shadow-[0_0_12px_rgba(222,92,92,0.35)]">
              <Dot tone="danger" />
              <span className="mono-data text-[0.62rem] uppercase tracking-[0.1em] text-danger">gate</span>
            </span>
            <span className="h-px flex-1 bg-white/10" />
            <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 opacity-50">
              <Dot tone="neutral" />
              <span className="mono-data text-[0.62rem] uppercase tracking-[0.1em] text-text-low">deploy</span>
            </span>
          </div>

          <div className="mt-4 rounded-card-sm border border-danger/30 bg-ink-2 p-3.5">
            <p className="mono-data flex items-start gap-2 text-[0.72rem] leading-relaxed text-danger">
              <OctagonX size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              <span>
                MODEL SWAP BLOCKED
                <span className="mt-1 block text-text-mid">
                  Swahili groundedness <strong className="text-danger">91%</strong> &lt;{' '}
                  <strong className="text-text-hi">95%</strong> gate. Candidate retained in shadow mode; current
                  production model continues serving.
                </span>
              </span>
            </p>
          </div>

          <p className="mono-data mt-auto pt-4 text-[0.68rem] text-text-low">
            gate policy: any locale regression blocks promotion — no override without two human approvers.
          </p>
        </aside>
      </div>
    </SubSection>
  )
}
