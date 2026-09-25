import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Info } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { ApiError, kaluta } from '@/lib/api'
import { Panel, inputClass } from './primitives'
import { cn } from '@/lib/utils'

/**
 * Blueprint §4 — self-service deactivation and deletion.
 *
 * Three rules the blueprint is explicit about, all visible in this component:
 *   · identity is confirmed (the password), so nobody else can close the account
 *   · the cooling period is the member's choice, and signing back in cancels it
 *   · **no justification is asked** — there is deliberately no "why are you
 *     leaving?" field here, and adding one would be a dark pattern.
 */
export default function CloseAccount() {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const [mode, setMode] = useState<'deactivate' | 'delete'>('deactivate')
  const [password, setPassword] = useState('')
  const [cooling, setCooling] = useState(30)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const submit = async () => {
    setBusy(true)
    setError(null)
    try {
      const result = await kaluta.account.closeAccount({
        password,
        mode,
        cooling_period_days: mode === 'delete' ? cooling : 0,
      })
      setDone(
        result.effective_at
          ? `Your account is scheduled for deletion on ${new Date(result.effective_at).toLocaleDateString()}. ${result.note}`
          : `Your account is deactivated. ${result.note}`,
      )
      await signOut()
      setTimeout(() => navigate('/', { replace: true }), 4000)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not complete the request')
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <Panel title="Account closed" subtitle="You will be returned to the home page.">
        <p className="text-sm text-text-mid">{done}</p>
      </Panel>
    )
  }

  return (
    <Panel
      title="Deactivate or delete"
      subtitle="Your account, your decision. We do not ask you to justify it."
    >
      <div className="flex flex-wrap gap-2">
        {(['deactivate', 'delete'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setMode(m)
              setConfirming(false)
            }}
            className={cn(
              'rounded-full border px-4 py-2 text-sm font-semibold transition-colors',
              mode === m
                ? 'border-gold/50 bg-gold/10 text-gold-soft'
                : 'border-white/12 text-text-mid hover:text-text-hi',
            )}
          >
            {m === 'deactivate' ? 'Deactivate' : 'Delete permanently'}
          </button>
        ))}
      </div>

      <p className="mt-4 text-sm leading-relaxed text-text-mid">
        {mode === 'deactivate'
          ? 'Your profile and posts are hidden. Nothing is erased, and signing in restores everything exactly as it was.'
          : 'Your account enters a cooling period. Sign in again before it ends and the deletion is cancelled — after that, the erasure is permanent.'}
      </p>

      {mode === 'delete' && (
        <label className="mt-5 block">
          <span className="caption mb-1.5 block">Cooling period — {cooling} days</span>
          <input
            type="range"
            min={0}
            max={90}
            step={1}
            value={cooling}
            onChange={(e) => setCooling(Number(e.target.value))}
            className="w-full accent-[#D9A648]"
          />
          <span className="caption mt-1 block">
            {cooling === 0 ? 'Immediate — no chance to change your mind.' : 'You can cancel at any point by signing in.'}
          </span>
        </label>
      )}

      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-6 rounded-full border border-red-400/35 px-5 py-2.5 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/10"
        >
          Continue
        </button>
      ) : (
        <div className="mt-6 rounded-card-sm border border-red-400/25 bg-red-500/5 p-4">
          <label className="block">
            <span className="caption mb-1.5 block">Confirm it is you — enter your password</span>
            <input
              className={inputClass}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </label>

          {error && (
            <p role="alert" className="mt-3 text-sm text-red-200">
              {error}
            </p>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={busy || password === ''}
              className="rounded-full bg-red-500/85 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
            >
              {mode === 'deactivate' ? 'Deactivate my account' : 'Delete my account'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-full border border-white/12 px-5 py-2.5 text-sm font-semibold text-text-mid"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <p className="caption mt-5 flex items-start gap-2">
        <Info size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
        Handled entirely from your settings, with no support ticket and no retention interview —
        GDPR and PDPA compliant.
      </p>
    </Panel>
  )
}
