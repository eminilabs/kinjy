import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import AppShell from '@/components/app/AppShell'
import { useAuth } from '@/hooks/useAuth'
import { ApiError, kaluta } from '@/lib/api'

type Outcome = { kind: 'working' } | { kind: 'joined'; communityId?: string; already: boolean } | { kind: 'invalid' } | { kind: 'error'; message: string }

/**
 * Where an invite link lands. Redeeming spends a use, so it runs exactly once
 * per mount (the ref also survives React's double-invoked dev effects). Every
 * refusal reads the same on purpose: the page must not reveal whether a token
 * once existed.
 */
export default function JoinByLink() {
  const { token = '' } = useParams()
  const { user } = useAuth()
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'working' })
  const started = useRef(false)

  // AppShell sends a signed-out viewer to sign-in, but this component mounts
  // regardless, so wait for a session before spending the link's use.
  useEffect(() => {
    if (started.current || !token || !user) return
    started.current = true
    kaluta.communities
      .redeemLink(token)
      .then((result) =>
        setOutcome({ kind: 'joined', communityId: result.community_id, already: !!result.already }),
      )
      .catch((err) =>
        setOutcome(
          err instanceof ApiError && (err.status === 404 || err.status === 410)
            ? { kind: 'invalid' }
            : { kind: 'error', message: err instanceof ApiError ? err.message : 'Could not use this link' },
        ),
      )
  }, [token, user])

  return (
    <AppShell title="Invite link">
      <div className="cloud-card p-5">
        {outcome.kind === 'working' && <p className="text-sm text-text-low">Checking your invite link…</p>}
        {outcome.kind === 'joined' && (
          <>
            <p className="text-sm text-gold-soft">
              {outcome.already ? 'You are already in this community.' : 'You are in. Welcome.'}
            </p>
            <Link
              to={outcome.communityId ? `/communities?open=${outcome.communityId}` : '/communities'}
              className="mt-3 inline-flex rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-sm font-bold text-ink"
            >
              Open the community
            </Link>
          </>
        )}
        {outcome.kind === 'invalid' && (
          <>
            <p className="text-sm text-text-mid">This link is not valid any more.</p>
            <Link to="/communities" className="mt-3 inline-flex text-sm font-semibold text-sky hover:underline">
              Back to communities
            </Link>
          </>
        )}
        {outcome.kind === 'error' && (
          <p role="alert" className="text-sm text-red-200">
            {outcome.message}
          </p>
        )}
      </div>
    </AppShell>
  )
}
