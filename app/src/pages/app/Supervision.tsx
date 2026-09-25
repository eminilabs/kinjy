import { useState } from 'react'
import { Clock, Eye, EyeOff, Link2, ShieldCheck, X } from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta, type SupervisedView, type SupervisionState } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * Parental supervision, for both people in it.
 *
 * The page is built around the disclosure rather than around the controls. What
 * a parent cannot see is shown at the same size as what they can, and it is
 * shown before either side agrees to anything — a limit nobody reads is a limit
 * the teenager has no reason to believe in.
 */

const SETTING_LABELS: Record<string, string> = {
  who_can_message: 'Who can message you',
  who_can_invite: 'Who can send you invitations',
  who_can_add_family: 'Who can add you to a family tree',
  who_can_add_community: 'Who can add you to a community',
  who_can_see_family: 'Who can see your family tree',
  discoverable: 'Appear in search and suggestions',
}

function label(setting: string) {
  return SETTING_LABELS[setting] ?? setting.replace(/_/g, ' ')
}

export default function Supervision() {
  const state = useApi<SupervisionState>(() => kaluta.supervision.mine(), [])
  const [handle, setHandle] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [detail, setDetail] = useState<SupervisedView | null>(null)

  // `keepDetail` exists because the parent's detail panel is itself opened
  // through `run`: clearing it unconditionally closed the panel in the same tick
  // it was opened, and the button looked like it did nothing at all.
  const run = async (action: () => Promise<unknown>, keepDetail = false) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      state.reload()
      if (!keepDetail) setDetail(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const disclosure = state.data?.disclosure
  const links = state.data?.items ?? []
  const requests = state.data?.requests ?? []
  const active = links.find((l) => l.status === 'active')
  const invites = links.filter((l) => l.status === 'invited')

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-8">
        <header className="space-y-2">
          <h1 className="flex items-center gap-2 text-2xl font-semibold">
            <ShieldCheck className="size-6 shrink-0" aria-hidden />
            Supervision
          </h1>
          <p className="text-sm opacity-80">
            An adult can help keep an account under 18 safer. Both people have to agree,
            either one can end it, and the other is told when they do.
          </p>
        </header>

        {error ? (
          <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">
            {error}
          </p>
        ) : null}

        {/* The agreement, before the controls. */}
        {disclosure ? (
          <section className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 p-4">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
                <Eye className="size-4 shrink-0" aria-hidden />
                A supervising adult sees
              </h2>
              <ul className="space-y-1.5 text-sm opacity-90">
                {disclosure.can_see.map((line) => (
                  <li key={line}>· {line}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 p-4">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide">
                <EyeOff className="size-4 shrink-0" aria-hidden />
                They never see
              </h2>
              <ul className="space-y-1.5 text-sm opacity-90">
                {disclosure.cannot_see.map((line) => (
                  <li key={line}>· {line}</li>
                ))}
              </ul>
            </div>
            <p className="sm:col-span-2 text-sm opacity-75">{disclosure.note}</p>
          </section>
        ) : null}

        {/* Invitations waiting on this member. */}
        {invites.length ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Waiting for an answer</h2>
            {invites.map((link) => (
              <div
                key={link.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4"
              >
                <p className="text-sm">
                  {link.role === 'teen'
                    ? 'An adult asked to supervise this account.'
                    : 'You asked to supervise an account. Waiting for them to accept.'}
                </p>
                {link.role === 'teen' ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => kaluta.supervision.answer(link.id, true))}
                      className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20 disabled:opacity-50"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => kaluta.supervision.answer(link.id, false))}
                      className="rounded-lg px-3 py-1.5 text-sm underline opacity-80 disabled:opacity-50"
                    >
                      Decline
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => run(() => kaluta.supervision.end(link.id))}
                    className="rounded-lg px-3 py-1.5 text-sm underline opacity-80 disabled:opacity-50"
                  >
                    Withdraw
                  </button>
                )}
              </div>
            ))}
          </section>
        ) : null}

        {/* The active link. */}
        {active ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">
              {active.role === 'parent' ? 'An account you supervise' : 'Supervision is on'}
            </h2>
            <div className="space-y-3 rounded-xl border border-white/10 p-4">
              <p className="text-sm opacity-80">
                Started {new Date(active.accepted_at ?? active.created_at).toLocaleDateString()}.
              </p>
              {active.role === 'parent' ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    run(async () => setDetail(await kaluta.supervision.view(active.id)), true)
                  }
                  className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20 disabled:opacity-50"
                >
                  Open what I can see
                </button>
              ) : null}
              <button
                type="button"
                disabled={busy}
                onClick={() => run(() => kaluta.supervision.end(active.id))}
                className="flex items-center gap-1.5 text-sm underline opacity-80 disabled:opacity-50"
              >
                <X className="size-4 shrink-0" aria-hidden />
                End supervision
              </button>
              {active.role === 'teen' ? (
                <p className="text-xs opacity-70">
                  Ending it does not change what your age already restricts, and the adult is
                  told that it ended.
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        {/* The parent's view, once opened. */}
        {detail ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Everything you can see</h2>
            <div className="space-y-4 rounded-xl border border-white/10 p-4">
              <div>
                <h3 className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
                  <Clock className="size-4 shrink-0" aria-hidden />
                  Time today
                </h3>
                <p className="text-sm opacity-90">
                  {Math.round(detail.time.minutes_today)} minutes used
                  {detail.time.daily_limit_minutes
                    ? ` of a ${detail.time.daily_limit_minutes}-minute limit.`
                    : ', with no limit set.'}
                </p>
                <label className="mt-2 flex items-center gap-2 text-sm">
                  Daily limit
                  <input
                    type="number"
                    min={0}
                    max={1440}
                    defaultValue={detail.time.daily_limit_minutes ?? ''}
                    onBlur={(e) =>
                      run(
                        async () => {
                          await kaluta.supervision.setTimeLimit(
                            detail.supervision.id,
                            e.target.value === '' ? null : Number(e.target.value),
                          )
                          setDetail(await kaluta.supervision.view(detail.supervision.id))
                        },
                        true,
                      )
                    }
                    className="w-24 rounded-lg border border-white/15 bg-transparent px-2 py-1"
                  />
                  minutes
                </label>
              </div>

              <div>
                <h3 className="mb-1.5 text-sm font-semibold">Safety settings</h3>
                <ul className="space-y-1 text-sm opacity-90">
                  {Object.entries(detail.settings).map(([key, value]) => (
                    <li key={key}>
                      {label(key)}: <strong>{String(value)}</strong>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="mb-1.5 text-sm font-semibold">Not included, by design</h3>
                <ul className="space-y-1 text-sm opacity-70">
                  {detail.not_included.map((line) => (
                    <li key={line}>· {line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        ) : null}

        {/* Requests, for whichever side is looking. */}
        {requests.length ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Requests</h2>
            <ul className="space-y-2">
              {requests.map((r) => (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-4"
                >
                  <div className="text-sm">
                    <p>
                      {label(r.setting)} → <strong>{r.requested_value}</strong>
                    </p>
                    <p
                      className={cn(
                        'text-xs opacity-70',
                        r.status === 'declined' && 'opacity-90',
                      )}
                    >
                      {r.status === 'pending'
                        ? r.role === 'parent'
                          ? 'Waiting for you'
                          : 'Waiting for the adult supervising this account'
                        : r.status === 'approved'
                          ? 'Approved'
                          : 'Declined'}
                    </p>
                  </div>
                  {r.status === 'pending' && r.role === 'parent' ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => run(() => kaluta.supervision.answerRequest(r.id, true))}
                        className="rounded-lg bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20 disabled:opacity-50"
                      >
                        Allow
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => run(() => kaluta.supervision.answerRequest(r.id, false))}
                        className="rounded-lg px-3 py-1.5 text-sm underline opacity-80 disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Starting one. Either side may, and the ages decide the roles. */}
        {active ? null : (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Start supervision</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (handle.trim()) run(() => kaluta.supervision.invite(handle.trim()))
              }}
              className="flex flex-wrap items-center gap-2"
            >
              <span className="flex items-center gap-1.5 text-sm opacity-80">
                <Link2 className="size-4 shrink-0" aria-hidden />
                Their username
              </span>
              <input
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                placeholder="username"
                className="min-w-40 flex-1 rounded-lg border border-white/15 bg-transparent px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={busy || !handle.trim()}
                className="rounded-lg bg-white/10 px-4 py-2 text-sm hover:bg-white/20 disabled:opacity-50"
              >
                Send invitation
              </button>
            </form>
            <p className="text-xs opacity-70">
              Whoever is under 18 becomes the supervised account, whichever of you sends the
              invitation.
            </p>
          </section>
        )}

        {state.loading ? <p className="text-sm opacity-70">Loading…</p> : null}
      </div>
    </AppShell>
  )
}
