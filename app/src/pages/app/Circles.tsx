import { useState } from 'react'
import { Plus, Trash2, Users } from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta, type Circle } from '@/lib/api'
import { cn } from '@/lib/utils'

/** Blueprint module D — the named circle kinds, plus a free-form one. */
const KINDS = [
  { id: 'family', label: 'Family' },
  { id: 'close_friends', label: 'Close friends' },
  { id: 'business', label: 'Business' },
  { id: 'customers', label: 'Customers' },
  { id: 'custom', label: 'Custom' },
] as const

export default function Circles() {
  const circles = useApi<Circle[]>(() => kaluta.circles.list(), [])
  const [name, setName] = useState('')
  const [kind, setKind] = useState<string>('family')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    setError(null)
    try {
      await kaluta.circles.create({ name: name.trim(), kind })
      setName('')
      circles.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the circle')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id: string) => {
    try {
      await kaluta.circles.remove(id)
      circles.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not delete the circle')
    }
  }

  return (
    <AppShell
      title="Circles"
      subtitle="Private, filtered networks. A post shared to a circle is visible to that circle only."
    >
      <form onSubmit={create} className="cloud-card p-5">
        <div className="flex flex-wrap gap-2">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors',
                kind === k.id
                  ? 'border-gold/50 bg-gold/10 text-gold-soft'
                  : 'border-white/12 text-text-mid hover:text-text-hi',
              )}
            >
              {k.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name this circle — Kinjy family"
            aria-label="Circle name"
            className="w-full rounded-full border border-white/10 bg-ink-2/60 px-4 py-2.5 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!name.trim() || busy}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2.5 text-sm font-bold text-ink disabled:opacity-40"
          >
            <Plus size={14} aria-hidden="true" />
            Create
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-200">
            {error}
          </p>
        )}
      </form>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {circles.loading && <p className="text-sm text-text-low">Loading your circles…</p>}
        {circles.error && <p className="text-sm text-amber-200">{circles.error}</p>}
        {circles.data?.length === 0 && (
          <p className="text-sm text-text-low">
            No circles yet. Create one above, then choose it in the composer to share privately.
          </p>
        )}
        {(circles.data ?? []).map((circle) => (
          <article key={circle.id} className="cloud-card flex items-center gap-3 p-4">
            <span
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo/25 text-sky"
            >
              <Users size={17} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text-hi">{circle.name}</p>
              <p className="caption">
                {circle.kind.replace('_', ' ')} · {circle.members_count} member
                {circle.members_count === 1 ? '' : 's'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => remove(circle.id)}
              aria-label={`Delete ${circle.name}`}
              className="ms-auto shrink-0 rounded-full p-2 text-text-low transition-colors hover:text-red-200"
            >
              <Trash2 size={15} />
            </button>
          </article>
        ))}
      </div>
    </AppShell>
  )
}
