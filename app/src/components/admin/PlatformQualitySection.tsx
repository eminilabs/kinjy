import { TerminalSquare } from 'lucide-react'
import EvalHarness from './quality/EvalHarness'
import FeatureFlags from './quality/FeatureFlags'
import AiObservability from './quality/AiObservability'
import OnDeviceRouting from './quality/OnDeviceRouting'
import PerformanceBudgets from './quality/PerformanceBudgets'
import ReconciliationBots from './quality/ReconciliationBots'
import VisualA11yCi from './quality/VisualA11yCi'
import StructuredMetadata from './quality/StructuredMetadata'

/**
 * PlatformQualitySection — "Platform Quality & AI Operations": a living engineering
 * console appended to the Admin page. Mono-data tables, LedgerRow-style rows and
 * status chips covering the AI evaluation harness, feature flags, AI observability,
 * on-device routing, performance budgets, reconciliation bots, visual/a11y CI and
 * machine-readable branding.
 */
export default function PlatformQualitySection() {
  return (
    <section aria-labelledby="platform-quality-heading" className="border-t border-white/8 px-5 py-12 md:px-8">
      <p className="eyebrow text-gold">System · Engineering console</p>
      <h2 id="platform-quality-heading" className="h3 mt-2 flex items-center gap-2 text-2xl">
        <TerminalSquare size={22} className="text-gold" aria-hidden="true" />
        Platform Quality &amp; AI Operations
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-text-mid">
        The machinery behind the calm: AI features gated by eval suites, rollouts staged behind kill
        switches, every provider observed, every byte budgeted, every ledger row swept nightly, and a
        brand that machines can read as clearly as people.
      </p>

      <div className="mt-10">
        <EvalHarness />
        <FeatureFlags />
        <AiObservability />
        <OnDeviceRouting />
        <PerformanceBudgets />
        <ReconciliationBots />
        <VisualA11yCi />
        <StructuredMetadata />
      </div>
    </section>
  )
}
