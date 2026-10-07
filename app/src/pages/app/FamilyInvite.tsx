import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ApiError, kaluta } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { forgetInvite, pendingInvite, rememberInvite, tokenFromHash } from '@/components/family/tree/inviteToken'

type Look = { state: 'loading' } | { state: 'invalid' } | { state: 'visitor' } | { state: 'member'; name: string; hasNode: boolean; own: boolean }

const NEXT = encodeURIComponent('/tree/invite')

/**
 * Where an invitation link lands. Public: the person invited may have no account yet.
 *
 * It says almost nothing before the member decides: a visitor learns only that the link
 * is good, a signed-in member learns whose place it offers. The tree is never loaded
 * here. Nothing is attached until the member presses Accept.
 */
export default function FamilyInvite() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [token] = useState(() => tokenFromHash(window.location.hash) || pendingInvite())
  const [look, setLook] = useState<Look>({ state: 'loading' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [declined, setDeclined] = useState(false)

  // Keep the token across the sign-in, and take it out of the address bar.
  useEffect(() => {
    if (!token) return
    rememberInvite(token)
    if (window.location.hash) window.history.replaceState(null, '', window.location.pathname)
  }, [token])

  const signedIn = Boolean(user)
  useEffect(() => {
    if (!token) return
    let live = true
    kaluta.family
      .lookupInvitation(token)
      .then((r) => {
        if (!live) return
        setLook(signedIn ? { state: 'member', name: r.person_given_name ?? '', hasNode: Boolean(r.already_has_node), own: Boolean(r.own) } : { state: 'visitor' })
      })
      .catch(() => live && setLook({ state: 'invalid' }))
    return () => {
      live = false
    }
  }, [token, signedIn])

  const accept = async () => {
    setBusy(true)
    setError(null)
    try {
      await kaluta.family.acceptInvitation(token)
      forgetInvite()
      navigate('/tree', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.')
      setBusy(false)
    }
  }

  const decline = async () => {
    setBusy(true)
    try {
      await kaluta.family.declineInvitation(token)
    } catch {
      /* declining a link that is already dead is the same outcome */
    }
    forgetInvite()
    setDeclined(true)
    setBusy(false)
  }

  const button = 'inline-flex min-h-11 items-center rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-sm font-bold text-ink disabled:opacity-60'
  const quiet = 'inline-flex min-h-11 items-center rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-text-hi'

  return (
    <section className="mx-auto w-full max-w-lg px-6 py-12">
      <div className="cloud-card p-6">
        {declined ? (
          <>
            <h1 className="h3">Invitation declined</h1>
            <p className="mt-2 text-sm leading-relaxed text-text-mid">Nothing was attached to your account.</p>
            <Link to="/" className="mt-5 inline-block text-sm font-semibold text-gold hover:underline">Go to Kinjy</Link>
          </>
        ) : !token || look.state === 'invalid' ? (
          <>
            <h1 className="h3">This invitation is not valid</h1>
            <p className="mt-2 text-sm leading-relaxed text-text-mid">
              It may have expired, been used or been withdrawn. If somebody sent you this link, ask them for a new one.
            </p>
            <Link to="/" className="mt-5 inline-block text-sm font-semibold text-gold hover:underline">Go to Kinjy</Link>
          </>
        ) : look.state === 'loading' ? (
          <p className="caption">Checking the invitation…</p>
        ) : look.state === 'visitor' ? (
          <>
            <h1 className="h3">You are invited to claim your place in a family tree</h1>
            <p className="mt-2 text-sm leading-relaxed text-text-mid">
              Sign in or create an account to see whose place this is. Nothing of the tree is shown to you until you accept: accepting makes you part of that family tree, and you will be told exactly what you will see before you choose.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to={`/join?mode=signup&next=${NEXT}`} className={button}>Create an account</Link>
              <Link to={`/join?mode=signin&next=${NEXT}`} className={quiet}>Sign in</Link>
            </div>
            <button type="button" onClick={decline} disabled={busy} className="mt-4 text-xs text-text-low underline underline-offset-2">
              Decline this invitation
            </button>
          </>
        ) : (
          <>
            <h1 className="h3">Is this you?</h1>
            <p className="mt-2 text-sm leading-relaxed text-text-mid">
              A relative has added <strong className="text-text-hi">{look.name}</strong> to their family tree and invites you to claim that place. If this is not you, decline.
            </p>
            <div className="mt-4 rounded-card-md border border-white/10 p-4" aria-labelledby="after-accept">
              <h2 id="after-accept" className="text-sm font-semibold text-text-hi">If you accept, you join this family tree</h2>
              <p className="mt-2 text-sm text-text-mid">Your account is attached to {look.name}’s place, and you will be able to see:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-text-mid">
                <li>every person connected to that place by the family links already recorded: parents, partners, children, brothers and sisters, and the people beyond them;</li>
                <li>for each of them: name, gender if given, dates and places of birth and death, photo, biography and how they are related to you;</li>
                <li>the photos, documents and recordings kept for those people.</li>
              </ul>
              <p className="mt-2 text-sm text-text-mid">
                You will also be able to add relatives and links, and to confirm or dispute entries. You can change or remove only what you add yourself, and you can remove your own place later.
              </p>
              <p className="mt-2 text-sm text-text-mid">The tree is private by default: it is shown to the people in it, and to others only as its owner’s privacy settings allow.</p>
            </div>
            {look.own && <p className="mt-3 text-sm text-text-mid" role="status">You made this invitation, so you cannot accept it.</p>}
            {look.hasNode && (
              <p className="mt-3 text-sm text-text-mid" role="status">
                You already have a place in a family tree. Two places are never merged automatically, so this invitation cannot be accepted with this account.
              </p>
            )}
            {error && <p className="mt-3 text-sm text-red-300" role="alert">{error}</p>}
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={accept} disabled={busy || look.own || look.hasNode} className={button}>Yes, this is me: join this tree</button>
              <button type="button" onClick={decline} disabled={busy} className={quiet}>Decline</button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
