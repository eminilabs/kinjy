import { useEffect, useState } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { disablePush, enablePush, pushState, type PushState } from '@/lib/push'
import { cn } from '@/lib/utils'

/**
 * The switch for browser notifications.
 *
 * Permission is asked from this click and nowhere else. A site that asks on
 * load is why people have learned to press Block without reading, and a
 * blocked permission cannot be asked for again from the page — the member has
 * to find it in browser settings, which most never will. One badly timed
 * prompt costs the channel permanently.
 *
 * It renders nothing when it cannot work: a browser with no Push API, or an
 * installation with no VAPID keys. A dead switch invites somebody to press it
 * and conclude the product is broken.
 */
export default function PushToggle({ className }: { className?: string }) {
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    pushState()
      .then((s) => alive && setState(s))
      .catch(() => alive && setState('unavailable'))
    return () => {
      alive = false
    }
  }, [])

  if (state === null || state === 'unsupported' || state === 'unavailable') return null

  if (state === 'denied') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-text-low',
          className,
        )}
        // Said plainly, because the page genuinely cannot fix this: the browser
        // will not show the prompt again once it has been refused.
        title="Notifications are blocked for this site. Turn them back on in your browser settings."
      >
        <BellOff size={12} aria-hidden="true" />
        Blocked
      </span>
    )
  }

  const on = state === 'on'
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true)
        try {
          setState(on ? await disablePush() : await enablePush())
        } finally {
          setBusy(false)
        }
      }}
      aria-pressed={on}
      title={on ? 'Notifications are on for this device' : 'Get notified when the app is closed'}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold disabled:opacity-50',
        on ? 'text-text-mid hover:text-text-hi' : 'text-text-low hover:text-text-mid',
        className,
      )}
    >
      {busy ? (
        <Loader2 size={12} className="animate-spin" aria-hidden="true" />
      ) : on ? (
        <Bell size={12} aria-hidden="true" />
      ) : (
        <BellOff size={12} aria-hidden="true" />
      )}
      {on ? 'Notifications on' : 'Notify me'}
    </button>
  )
}
