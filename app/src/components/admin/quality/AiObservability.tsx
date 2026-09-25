import { Activity, AlertTriangle, Route } from 'lucide-react'
import { Chip, Dot, SubSection } from './primitives'
import type { Tone } from './primitives'
import { cn } from '@/lib/utils'

interface Provider {
  name: string
  share: string
  cost: string
  p95: string
  groundedness: string
  tone: Tone
  status: string
}

const PROVIDERS: Provider[] = [
  { name: 'Kimi K2 · Moonshot', share: '46%', cost: '$0.38 / 1M tok', p95: '1.7s', groundedness: '97.4%', tone: 'success', status: 'healthy' },
  { name: 'DeepSeek V3', share: '31%', cost: '$0.27 / 1M tok', p95: '1.9s', groundedness: '94.1%', tone: 'warning', status: 'drift watch' },
  { name: 'GPT-4o mini · OpenAI', share: '14%', cost: '$0.60 / 1M tok', p95: '1.4s', groundedness: '96.9%', tone: 'success', status: 'healthy' },
  { name: 'Claude Haiku · Anthropic', share: '9%', cost: '$0.80 / 1M tok', p95: '1.2s', groundedness: '97.8%', tone: 'success', status: 'healthy' },
]

const ROUTING_LOG: { ts: string; path: string; decision: string; reason: string }[] = [
  { ts: '14:02:11', path: 'translate SW→EN · E2E draft', decision: 'on-device 1.8B', reason: 'privacy class: sealed' },
  { ts: '14:02:09', path: 'assistant answer · FR', decision: 'kimi-k2', reason: 'groundedness rank #1' },
  { ts: '14:02:04', path: 'moderation triage · AR', decision: 'claude-haiku', reason: 'lowest p95 under load' },
  { ts: '14:01:58', path: 'memorial summary · EN', decision: 'deepseek-v3', reason: 'cost tier: economy' },
  { ts: '14:01:52', path: 'translate ZH→SW', decision: 'kimi-k2', reason: 'drift reroute from deepseek' },
]

/**
 * AiObservability (C3) — per-provider telemetry through the AI Gateway: cost,
 * latency and groundedness per provider, drift alerting, and the routing
 * decision log.
 */
export default function AiObservability() {
  return (
    <SubSection
      id="ai-observability"
      eyebrow="C3 · AI Observability"
      title={
        <>
          <Activity size={19} className="me-2 inline text-gold" aria-hidden="true" />
          Every token, measured.
        </>
      }
      blurb="All providers sit behind the AI Gateway — telemetry is provider-independent: cost per token, p95 latency, groundedness score. The router re-routes on drift before users feel it."
    >
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        {/* Provider telemetry table */}
        <div className="overflow-hidden rounded-card-md border border-white/8">
          <div className="mono-data grid grid-cols-[1fr_70px_90px] items-center gap-3 border-b border-white/10 bg-ink-3/80 px-4 py-2.5 text-[0.7rem] uppercase tracking-[0.12em] text-text-low md:grid-cols-[1fr_56px_120px_72px_110px_100px]">
            <span>Provider</span>
            <span className="text-end">Share</span>
            <span className="text-end">Status</span>
            <span className="hidden text-end md:inline">Cost</span>
            <span className="hidden text-end md:inline">p95</span>
            <span className="hidden text-end md:inline">Grounded.</span>
          </div>
          {PROVIDERS.map((p) => (
            <div
              key={p.name}
              className="mono-data grid grid-cols-[1fr_70px_90px] items-center gap-3 border-b border-white/5 px-4 py-3 text-[0.78rem] hover:bg-white/[0.03] md:grid-cols-[1fr_56px_120px_72px_110px_100px]"
            >
              <span className="flex min-w-0 items-center gap-2 text-text-hi">
                <Dot tone={p.tone} className="shrink-0" />
                <span className="truncate">{p.name}</span>
              </span>
              <span className="text-end text-text-mid">{p.share}</span>
              <span className="flex justify-end">
                <Chip tone={p.tone}>{p.status}</Chip>
              </span>
              <span className="hidden text-end text-text-low md:inline">{p.cost}</span>
              <span className="hidden text-end text-text-mid md:inline">{p.p95}</span>
              <span
                className={cn(
                  'hidden text-end md:inline',
                  p.tone === 'warning' ? 'font-semibold text-warning' : 'text-success',
                )}
              >
                {p.groundedness}
              </span>
            </div>
          ))}
        </div>

        {/* Drift alert card */}
        <aside className="flex flex-col rounded-card-md border border-warning/30 bg-warning/[0.05] p-4">
          <p className="caption flex items-center gap-2 font-bold uppercase tracking-[0.14em] text-warning">
            <AlertTriangle size={13} aria-hidden="true" /> Drift alert
          </p>
          <p className="mt-2 text-sm leading-relaxed text-text-mid">
            <span className="mono-data text-warning">DeepSeek V3</span> groundedness drifted{' '}
            <strong className="text-text-hi">−2.1 pts over 7d</strong> on SW translation paths.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-text-mid">
            Router auto-shifted <span className="mono-data text-gold-soft">12% of traffic</span> to Kimi K2. Eval
            harness re-runs nightly; provider returns when the gate passes 3 consecutive runs.
          </p>
          <div className="mono-data mt-auto space-y-1 pt-4 text-[0.68rem] text-text-low">
            <p>alert: DRIFT-229 · opened 2025-11-26 04:00 UTC</p>
            <p>owner: gateway-router · auto-remediated</p>
          </div>
        </aside>
      </div>

      {/* Routing decision log */}
      <div className="mt-4 overflow-hidden rounded-card-md border border-white/8">
        <p className="mono-data flex items-center gap-2 border-b border-white/10 bg-ink-3/80 px-4 py-2.5 text-[0.7rem] uppercase tracking-[0.12em] text-text-low">
          <Route size={12} aria-hidden="true" /> Routing decision log · live tail
        </p>
        <div className="mono-data divide-y divide-white/5 text-[0.74rem]">
          {ROUTING_LOG.map((r) => (
            <div key={r.ts + r.path} className="grid grid-cols-[64px_1fr] items-baseline gap-x-3 px-4 py-2.5 hover:bg-white/[0.03] md:grid-cols-[72px_1fr_150px_1fr]">
              <span className="text-text-low">{r.ts}</span>
              <span className="truncate text-text-hi">{r.path}</span>
              <span className="truncate text-sky">→ {r.decision}</span>
              <span className="truncate text-text-low">{r.reason}</span>
            </div>
          ))}
        </div>
      </div>
    </SubSection>
  )
}
