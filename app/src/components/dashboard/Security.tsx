import { useState } from 'react'
import { Fingerprint, Monitor, Plus, ShieldCheck } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta, passkeysSupported, type DeviceSession, type Passkey } from '@/lib/api'
import { Badge, Panel, PanelState } from './primitives'

const when = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** "Mozilla/5.0 (Windows NT 10.0…) Chrome/…" → "Chrome on Windows". */
function describeDevice(session: DeviceSession): string {
  if (session.device_label) return session.device_label
  const ua = session.user_agent ?? ''
  const browser =
    /Edg\//.test(ua) ? 'Edge'
    : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) ? 'Safari'
    : 'Browser'
  const os =
    /Windows/.test(ua) ? 'Windows'
    : /Android/.test(ua) ? 'Android'
    : /iPhone|iPad/.test(ua) ? 'iOS'
    : /Mac OS X/.test(ua) ? 'macOS'
    : /Linux/.test(ua) ? 'Linux'
    : 'Unknown device'
  return `${browser} on ${os}`
}

/**
 * Security — device management and passkeys (blueprint §5).
 *
 * The panel states plainly what Kinjy does *not* hold: there is no central
 * fingerprint or face database. A passkey row is a public key and a counter;
 * the biometric never leaves the member's device.
 */
export default function Security() {
  const sessions = useApi<DeviceSession[]>(() => kaluta.account.sessions(), [])
  const passkeys = useApi<Passkey[]>(() => kaluta.account.passkeys(), [])
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const addPasskey = async () => {
    setAdding(true)
    setError(null)
    try {
      await kaluta.account.registerPasskey()
      passkeys.reload()
    } catch (err) {
      // A refused prompt throws NotAllowedError; that is a choice, not a fault.
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof DOMException && err.name === 'NotAllowedError'
            ? 'Cancelled — nothing was registered.'
            : 'Could not register a passkey on this device.'
      setError(message)
    } finally {
      setAdding(false)
    }
  }

  const revoke = async (id: string) => {
    setBusy(id)
    setError(null)
    try {
      await kaluta.account.revokeSession(id)
      sessions.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign that device out')
    } finally {
      setBusy(null)
    }
  }

  const active = (sessions.data ?? []).filter((s) => !s.revoked_at)

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel
        title="Devices"
        subtitle="Every place you are signed in. Revoking one does not touch the others."
      >
        <PanelState loading={sessions.loading} error={sessions.error ?? error} empty={active.length === 0}>
          <ul className="space-y-3">
            {active.map((session) => (
              <li
                key={session.id}
                className="flex items-start justify-between gap-4 rounded-card-sm border border-white/8 bg-ink-2/40 p-3.5"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-text-hi">
                    <Monitor size={14} className="shrink-0 text-text-low" aria-hidden="true" />
                    {describeDevice(session)}
                  </p>
                  <p className="caption mt-1 truncate">
                    {session.ip ?? 'unknown IP'} · last seen {when(session.last_seen_at)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => revoke(session.id)}
                  disabled={busy === session.id}
                  className="shrink-0 rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-text-mid transition-colors hover:border-red-400/40 hover:text-red-200 disabled:opacity-40"
                >
                  Sign out
                </button>
              </li>
            ))}
          </ul>
        </PanelState>
      </Panel>

      <Panel
        title="Passkeys"
        subtitle="Device-level unlock. No central biometric database."
        action={
          passkeysSupported() ? (
            <button
              type="button"
              onClick={addPasskey}
              disabled={adding}
              className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-3.5 py-1.5 text-xs font-bold text-ink disabled:opacity-40"
            >
              <Plus size={12} aria-hidden="true" />
              {adding ? 'Waiting for your device…' : 'Add passkey'}
            </button>
          ) : (
            <Badge tone="neutral">Not supported here</Badge>
          )
        }
      >
        <PanelState
          loading={passkeys.loading}
          error={passkeys.error}
          empty={(passkeys.data ?? []).length === 0}
          emptyLabel="No passkey registered on this account yet."
        >
          <ul className="space-y-3">
            {(passkeys.data ?? []).map((key) => (
              <li
                key={key.id}
                className="flex items-center justify-between gap-4 rounded-card-sm border border-white/8 bg-ink-2/40 p-3.5"
              >
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-text-hi">
                    <Fingerprint size={14} className="text-gold" aria-hidden="true" />
                    {key.label}
                  </p>
                  <p className="caption mt-1">
                    Added {when(key.created_at)}
                    {key.last_used_at ? ` · last used ${when(key.last_used_at)}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </PanelState>

        <div className="mt-5 flex items-start gap-2.5 rounded-card-sm border border-white/8 bg-ink-2/30 p-3.5">
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
          <p className="text-xs leading-relaxed text-text-mid">
            Your fingerprint or face unlocks the key <strong className="text-text-hi">on your device</strong>.
            Kinjy stores only a public key and a signature counter — never the biometric itself.
            <br />
            <span className="text-text-low">
              Add one and your device will ask for its own unlock — that exchange happens between
              the browser and the authenticator, not with us.
            </span>
          </p>
        </div>
      </Panel>
    </div>
  )
}
