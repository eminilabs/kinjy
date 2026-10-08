import { useState } from 'react'
import { Fingerprint, KeyRound, Monitor, Plus, ShieldCheck } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { ApiError, kaluta, passkeysSupported, type DeviceSession, type Passkey } from '@/lib/api'
import { Badge, Panel, PanelState, inputClass } from './primitives'

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

/** The same rule the server enforces, so the form can say so before sending. */
const PASSWORD_MIN = 10
const weakBecause = (value: string): string | null => {
  if (value.length < PASSWORD_MIN) return `Use at least ${PASSWORD_MIN} characters.`
  // Mirrors the server: letters alone or digits alone are refused.
  if (/^\d+$/.test(value) || /^[A-Za-z]+$/.test(value))
    return 'Mix letters with digits or symbols.'
  return null
}

/**
 * Change the password.
 *
 * The current password is asked for even though the member is already signed
 * in, because being signed in is not the same as being the member - and the
 * panel says why rather than looking like a pointless extra field.
 *
 * It also says, before the member commits, that the other devices will be
 * signed out. That is the behaviour and not an option, so leaving it to be
 * discovered afterwards would be a surprise rather than a feature.
 */
function PasswordPanel({ onChanged }: { onChanged: () => void }) {
  const { user, signOut } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<string | null>(null)

  const weak = next ? weakBecause(next) : null
  const mismatch = Boolean(confirm) && next !== confirm
  const same = Boolean(current) && current === next
  const ready = Boolean(current && next && confirm) && !weak && !mismatch && !same

  const submit = async () => {
    setBusy(true)
    setError(null)
    setDone(null)
    try {
      const result = await kaluta.account.changePassword(current, next)
      setCurrent('')
      setNext('')
      setConfirm('')
      setDone(
        result.sessions_ended > 0
          ? `Password changed. ${result.sessions_ended} other ${
              result.sessions_ended === 1 ? 'device was' : 'devices were'
            } signed out.`
          : 'Password changed. No other device was signed in.',
      )
      // This device was not kept - the only honest thing left is to send them
      // back to sign in with the password they just set.
      if (result.signed_out_here) {
        await signOut()
        return
      }
      onChanged()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not change your password')
    } finally {
      setBusy(false)
    }
  }

  if (user && !user.has_password) {
    return (
      <Panel title="Password" subtitle="This account signs in with a passkey.">
        <p className="text-sm leading-relaxed text-text-mid">
          There is no password on this account, so there is none to change. You sign in with a
          passkey held on your own device.
        </p>
      </Panel>
    )
  }

  return (
    <Panel
      title="Password"
      subtitle="Changing it signs out every other device."
      action={
        user?.password_changed_at ? (
          <Badge tone="neutral">Changed {when(user.password_changed_at)}</Badge>
        ) : null
      }
    >
      <div className="space-y-3.5">
        <label className="block">
          <span className="caption mb-1.5 block">Current password</span>
          <input
            className={inputClass}
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        <label className="block">
          <span className="caption mb-1.5 block">New password</span>
          <input
            className={inputClass}
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            aria-describedby="password-rule"
          />
          <span id="password-rule" className={`caption mt-1.5 block ${weak ? 'text-amber-200' : ''}`}>
            {weak ?? `At least ${PASSWORD_MIN} characters, mixing letters with digits or symbols.`}
          </span>
        </label>

        <label className="block">
          <span className="caption mb-1.5 block">New password again</span>
          <input
            className={inputClass}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          {mismatch && (
            <span className="caption mt-1.5 block text-amber-200">These two do not match.</span>
          )}
        </label>

        {same && (
          <p className="caption text-amber-200">
            That is the password you already have &mdash; choose a different one.
          </p>
        )}

        {error && (
          <p role="alert" className="text-sm text-red-200">
            {error}
          </p>
        )}
        {done && (
          <p role="status" className="text-sm text-emerald-200">
            {done}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={!ready || busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-xs font-bold text-ink disabled:opacity-40"
        >
          <KeyRound size={13} aria-hidden="true" />
          {busy ? 'Changing…' : 'Change password'}
        </button>

        <p className="caption">
          Every other signed-in device is signed out, including your phone. This one stays signed
          in.
        </p>
      </div>
    </Panel>
  )
}

/**
 * Security — device management and passkeys (blueprint §5).
 *
 * The panel states plainly what Kinjy does *not* hold: there is no central
 * fingerprint or face database. A passkey row is a public key and a counter;
 * the biometric never leaves the member's device.
 */
export default function Security() {
  const auth = useAuth()
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
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-2">
      <PasswordPanel
        onChanged={() => {
          // The change revoked the other sessions, and refreshed the account's
          // password date. Without both reloads the screen would go on showing
          // devices that are already out and a stale "changed" badge.
          sessions.reload()
          void auth.refresh()
        }}
      />

      <Panel
        title="Devices"
        subtitle="Every place you are signed in. Revoking one does not touch the others."
      >
        <PanelState loading={sessions.loading} error={sessions.error ?? error} empty={active.length === 0}>
          <ul className="space-y-3">
            {active.map((session) => (
              <li
                key={session.id}
                className="flex items-start justify-between gap-4 rounded-2xl border border-[var(--cloud-border)] bg-ink-2/40 p-3.5"
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
                  className="shrink-0 rounded-full border border-[var(--cloud-border)] px-3 py-1.5 text-xs font-semibold text-text-mid hover:border-red-400/40 hover:text-red-200 disabled:opacity-40"
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
                className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--cloud-border)] bg-ink-2/40 p-3.5"
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

        <div className="mt-5 flex items-start gap-2.5 rounded-2xl border border-[var(--cloud-border)] bg-ink-2/30 p-3.5">
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
