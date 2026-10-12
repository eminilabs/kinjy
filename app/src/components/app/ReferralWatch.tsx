import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { kaluta } from '@/lib/api'
import { pendingRef, refFromSearch, rememberInviter, rememberRef } from '@/lib/share'

/**
 * Keeps hold of the invitation, wherever it arrives and however far the
 * visitor wanders before signing up.
 *
 * An invite link credits the member who sent it through `?ref=`. Until now
 * that code was only ever read on one page - the shared-post page - so a link
 * to anywhere else lost it on arrival, and even a shared post lost it for
 * anyone already signed in, because a member lands on the feed rather than on
 * that page. An invitation to the home page, the pricing page, a profile, a
 * community: all of them credited nobody.
 *
 * This watches every navigation instead, so the code is caught once on
 * whichever page the link happened to point at, and then followed through the
 * rest of the visit:
 *
 *   kinjy.com/?ref=K7QMX2P9  ->  pricing  ->  a profile  ->  join
 *                                                            ^ still credited
 *
 * Three rules, which together are what "it must not be lost" means:
 *
 * - A page with no code **does not clear** one. Browsing is not declining an
 *   invitation, and every page after the first has no `?ref=` on it.
 * - Something that is not a code does not clear one either.
 * - A different, real code **replaces** it. Coming back on somebody else's
 *   link means somebody else invited you, and that is the link that brought
 *   you here.
 *
 * "Real" is settled by asking the server rather than by looking at the shape,
 * because the shape cannot settle it: a code is six to eight characters of
 * A-Z0-9, and so is the word "whatsapp". A tracking parameter picked up from
 * a mangled share would otherwise walk over the code of the member who
 * actually did the inviting. The lookup also brings back their name, which is
 * what lets the sign-up page say who invited you.
 *
 * It survives a reload and a closed tab because it is in localStorage, and it
 * is spent and cleared at sign-up, so it never follows one browser into a
 * second account.
 *
 * Renders nothing. Mounted once, inside the router.
 */
export default function ReferralWatch() {
  const { search } = useLocation()

  useEffect(() => {
    const candidate = refFromSearch(search)
    if (!candidate) return
    // Already the one we are holding: nothing to check and nothing to write.
    if (candidate === pendingRef()) return

    let cancelled = false
    void (async () => {
      try {
        const inviter = await kaluta.auth.referral(candidate)
        if (cancelled) return
        rememberRef(inviter.code)
        rememberInviter(inviter.display_name)
      } catch {
        // Either the code is not one of ours, or the lookup could not be
        // made at all. Both end the same way when something is already
        // stored: keep it. An unverified code is not worth the invitation we
        // are already holding.
        //
        // With nothing stored there is nothing to protect, so a well-formed
        // code is kept unverified rather than dropped - a visitor who arrived
        // on a real link while the network was flapping should still credit
        // the person who sent it, and an unknown code costs nothing because
        // the sign-up drops it rather than refusing the account.
        if (cancelled || pendingRef()) return
        rememberRef(candidate)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [search])

  return null
}
