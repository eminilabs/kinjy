import { useState } from 'react'
import { Link } from 'react-router'
import { RailCard } from '@/components/app/AppShell'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta } from '@/lib/api'
import ErrorLine from './ErrorLine'

const BADGE_LABEL: Record<string, string> = {
  helpful_contributor: 'Helpful Contributor',
  expert: 'Expert',
  community_builder: 'Community Builder',
  verified_creator: 'Verified Creator',
  family_historian: 'Family Historian',
  local_expert: 'Local Expert',
}

/**
 * The creator's standing, beside the tools: are they paid, what do they keep, who
 * subscribes, what have they earned recognition for. Everything here is read from
 * the server; the one switch is the one the blueprint makes a deliberate choice —
 * becoming a creator is opting into being paid, and that is for adults.
 */
export default function CreatorPanel() {
  const me = useApi(() => kaluta.creators.me(), [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const data = me.data

  const enable = async () => {
    setBusy(true)
    setError(null)
    try {
      await kaluta.creators.enable()
      me.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not turn it on')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <RailCard title="Your creator account">
        {me.loading && !data && <p className="text-xs">Loading…</p>}
        {data && data.monetization_enabled && (
          <div className="space-y-1.5 text-xs">
            <p>
              <strong className="text-text-hi">Monetization is on.</strong> You keep {data.share_pct}% of the advertising revenue your content earns.
            </p>
            <p>
              {data.subscribers} {data.subscribers === 1 ? 'subscriber' : 'subscribers'}
            </p>
            <p>
              Payouts need a verified identity and a wallet address — see{' '}
              <Link to="/earn" className="font-semibold text-text-hi underline underline-offset-2">
                Earning
              </Link>
              .
            </p>
          </div>
        )}
        {data && !data.monetization_enabled && data.monetization_allowed && (
          <div className="space-y-2 text-xs">
            <p>Turn monetization on to be paid for what you make and to offer subscriptions.</p>
            <button
              type="button"
              onClick={() => void enable()}
              disabled={busy}
              className="rounded-full bg-gold-soft px-4 py-1.5 text-xs font-bold text-ink disabled:opacity-40"
            >
              {busy ? 'Turning on…' : 'Turn monetization on'}
            </button>
          </div>
        )}
        {data && !data.monetization_enabled && !data.monetization_allowed && (
          <p className="text-xs">You can create in your original language. Monetization, translation and newsletter sending require a confirmed adult account.</p>
        )}
        {(error ?? me.error) && <ErrorLine text={(error ?? me.error) as string} className="mt-2 !text-xs" />}
      </RailCard>

      <RailCard title="Recognition">
        {data && data.badges.length > 0 ? (
          <ul className="space-y-1 text-xs">
            {data.badges.map((b) => (
              <li key={b.badge}>
                <strong className="text-text-hi">{BADGE_LABEL[b.badge] ?? b.badge}</strong>
                {b.reason ? ` — ${b.reason}` : ''}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs">No badges yet. They recognise quality, not how much you post.</p>
        )}
      </RailCard>

      <RailCard title="Plans">
        <p className="text-xs">
          Manage your paid plan and payment history in{' '}
          <Link to="/subscription" className="font-semibold text-text-hi underline underline-offset-2">
            Your subscription
          </Link>
          .
        </p>
      </RailCard>
    </>
  )
}
