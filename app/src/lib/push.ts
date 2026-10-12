import { kaluta } from '@/lib/api'

/**
 * Turning browser notifications on, and off again.
 *
 * Three things have to line up and any of them can be missing: the browser has
 * to support service workers and the Push API, the member has to grant
 * permission, and this installation has to have VAPID keys. So every function
 * here reports what happened rather than throwing - "not supported on this
 * browser" and "you said no" are different answers and the screen says which.
 *
 * Permission is never asked for on load. A site that asks the moment it opens
 * is the reason most people have learned to press Block without reading, and a
 * blocked permission cannot be asked for again - the member has to go into
 * browser settings, which most never will. So it is asked once, from a switch
 * they turned on.
 */

export type PushState = 'unsupported' | 'unavailable' | 'denied' | 'off' | 'on'

/**
 * base64url, as the Push API wants the application server key.
 *
 * Returns an ArrayBuffer rather than a Uint8Array: a Uint8Array may be backed
 * by a SharedArrayBuffer, which `applicationServerKey` does not accept, and
 * the buffer is what the browser actually wants.
 */
function toKey(base64url: string): ArrayBuffer {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  const bytes = new Uint8Array(new ArrayBuffer(binary.length))
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function supported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!supported()) return null
  try {
    // `ready` rather than a bare register: on a fresh load the worker may be
    // installing, and subscribing against a registration that is not active
    // yet fails with an error that reads like a refusal.
    await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    return await navigator.serviceWorker.ready
  } catch {
    return null
  }
}

/** What to show on the switch, without asking anybody anything. */
export async function pushState(): Promise<PushState> {
  if (!supported()) return 'unsupported'
  let available = false
  try {
    available = (await kaluta.push.key()).available
  } catch {
    return 'unavailable'
  }
  if (!available) return 'unavailable'
  if (Notification.permission === 'denied') return 'denied'

  const reg = await registration()
  if (!reg) return 'unsupported'
  const existing = await reg.pushManager.getSubscription()
  return existing ? 'on' : 'off'
}

/**
 * Ask, subscribe, and tell the server. Returns the state afterwards, so the
 * caller never has to guess what the browser decided.
 */
export async function enablePush(): Promise<PushState> {
  if (!supported()) return 'unsupported'

  const { available, public_key: publicKey } = await kaluta.push.key()
  if (!available || !publicKey) return 'unavailable'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off'

  const reg = await registration()
  if (!reg) return 'unsupported'

  // An existing subscription is reused rather than replaced: unsubscribing and
  // resubscribing hands out a new endpoint, and the old row would keep being
  // pushed to until it failed its way out.
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      // Required by every browser: a push that shows nothing is not allowed,
      // which suits us - a silent push would be a way to wake a member's
      // device without telling them.
      userVisibleOnly: true,
      applicationServerKey: toKey(publicKey),
    }))

  const json = subscription.toJSON()
  if (!json.keys?.p256dh || !json.keys?.auth) return 'off'
  await kaluta.push.subscribe({
    endpoint: subscription.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  })
  return 'on'
}

/** Stop pushing to this browser. The permission itself is the member's to keep. */
export async function disablePush(): Promise<PushState> {
  const reg = await registration()
  const subscription = await reg?.pushManager.getSubscription()
  if (subscription) {
    // The server first: if unsubscribing locally succeeded and the row stayed,
    // this browser would go on being pushed to until the endpoint died.
    try {
      await kaluta.push.unsubscribe(subscription.endpoint)
    } catch {
      /* the row ages out on repeated failure; the local state matters more */
    }
    await subscription.unsubscribe()
  }
  return 'off'
}
