import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Landmark, Lock, Plus, QrCode, Search } from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import DeathReviewQueue from '@/components/graveyard/DeathReviewQueue'
import MemorialManage from '@/components/graveyard/MemorialManage'
import MemorialView from '@/components/graveyard/MemorialView'
import { TICKET_REFRESH_MS, useEvery } from '@/components/graveyard/useEvery'
import { lifeSpan } from '@/components/graveyard/format'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { ApiError, kaluta, type Memorial } from '@/lib/api'
import { cn } from '@/lib/utils'

const field =
  'w-full rounded-card-sm border border-text-low/40 bg-text-low/5 px-3 py-2 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none'
const primary =
  'inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-gold-soft px-4 py-2 text-sm font-bold text-ink disabled:opacity-40'

function MemorialRow({ memorial, active, onOpen }: { memorial: Memorial; active: boolean; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-current={active ? 'true' : undefined}
        className={cn(
          'w-full rounded-card-sm px-2 py-1.5 text-start hover:bg-text-low/10',
          active && 'bg-gold/10 ring-1 ring-gold/40',
        )}
      >
        <span className="flex items-center gap-1.5 text-sm text-text-hi">
          <span className="truncate">{memorial.full_name}</span>
          {memorial.visibility === 'private' && <Lock size={11} className="shrink-0 text-text-mid" aria-label="Private" />}
          {Boolean(memorial.pending_tributes) && (
            <span className="ms-auto shrink-0 rounded-full bg-warning/15 px-1.5 text-[0.65rem] font-semibold text-warning">
              {memorial.pending_tributes} waiting
            </span>
          )}
        </span>
        <span className="block text-xs text-text-mid">{lifeSpan(memorial.birth_date, memorial.death_date)}</span>
      </button>
    </li>
  )
}

function CreateMemorial({ onCreated }: { onCreated: (m: Memorial) => void }) {
  const [name, setName] = useState('')
  const [birth, setBirth] = useState('')
  const [death, setDeath] = useState('')
  const [isPrivate, setPrivate] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const today = new Date().toISOString().slice(0, 10)
  const datesWrong = Boolean(birth && death && death < birth)

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const created = await kaluta.memorials.create({
        full_name: name.trim(),
        ...(birth ? { birth_date: birth } : {}),
        ...(death ? { death_date: death } : {}),
        visibility: isPrivate ? 'private' : 'public',
      })
      setName('')
      setBirth('')
      setDeath('')
      setPrivate(false)
      onCreated(created)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the memorial')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={create} className="cloud-card space-y-2 p-5">
      <h2 className="mb-1 text-sm font-semibold text-text-hi">Create a memorial</h2>
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} placeholder="Full name" aria-label="Full name" className={field} />
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-text-mid">
          Born
          <input type="date" value={birth} max={today} onChange={(e) => setBirth(e.target.value)} className={cn(field, 'mt-1')} />
        </label>
        <label className="block text-xs text-text-mid">
          Died
          <input type="date" value={death} max={today} onChange={(e) => setDeath(e.target.value)} className={cn(field, 'mt-1')} />
        </label>
      </div>
      {datesWrong && <p className="text-xs text-warning">The date of death is before the date of birth.</p>}
      <label className="flex items-center gap-2 text-xs text-text-mid">
        <input type="checkbox" checked={isPrivate} onChange={(e) => setPrivate(e.target.checked)} />
        Private for now — only its administrators can see it
      </label>
      <button type="submit" disabled={busy || name.trim().length < 2 || datesWrong} className={primary}>
        <Plus size={14} aria-hidden="true" /> Create
      </button>
      <p className="text-xs text-text-mid">Anniversary reminders come 10 days, 3 days and 6 hours before.</p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </form>
  )
}

function OpenMemorial({ id, onDeleted, onChanged }: { id: string; onDeleted: () => void; onChanged: () => void }) {
  const memorial = useApi<Memorial>(() => kaluta.memorials.get(id), [id])
  useEvery(memorial.reload, TICKET_REFRESH_MS)
  const [tab, setTab] = useState<'page' | 'manage'>('page')

  if (memorial.loading && !memorial.data) return <p className="text-sm text-text-mid">Opening the memorial…</p>
  if (!memorial.data) return <p className="text-sm text-warning">{memorial.error ?? 'This memorial could not be opened.'}</p>

  const m = memorial.data
  const changed = () => {
    memorial.reload()
    onChanged()
  }

  return (
    <div>
      {m.is_admin && (
        <div className="mb-4 flex gap-1 rounded-full bg-text-low/10 p-1" role="tablist" aria-label="Memorial views">
          {(
            [
              ['page', 'The memorial'],
              ['manage', `Manage${m.pending_tributes ? ` · ${m.pending_tributes} waiting` : ''}`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                'flex-1 rounded-full px-3 py-1.5 text-xs font-semibold',
                tab === key ? 'bg-gold-soft text-ink' : 'text-text-mid hover:text-text-hi',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      {m.is_admin && tab === 'manage' ? (
        <MemorialManage memorial={m} onChanged={changed} onDeleted={onDeleted} />
      ) : (
        <MemorialView memorial={m} onChanged={changed} />
      )}
    </div>
  )
}

/**
 * The Digital Graveyard inside the app: find someone, open a memorial, and —
 * for the family — look after it. The memorial open lives in the URL
 * (`?open=<id>`), which is where every notification about it points.
 */
export default function Graveyard() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const openId = params.get('open')
  const open = (id: string | null) => setParams(id ? { open: id } : {}, { replace: true })

  const [query, setQuery] = useState('')
  const [code, setCode] = useState('')
  const [codeError, setCodeError] = useState<string | null>(null)
  const [found, setFound] = useState<Memorial[]>([])
  const [searching, setSearching] = useState(true)
  const mine = useApi(() => kaluta.memorials.list({ mine: true, limit: 50 }), [])
  const isStaff = user?.role === 'admin' || user?.role === 'superadmin'

  // Browse as you type; an older answer must not replace a newer one.
  useEffect(() => {
    let live = true
    const timer = window.setTimeout(() => {
      setSearching(true)
      kaluta.memorials
        .list({ q: query.trim() || undefined, limit: 24 })
        .then((page) => live && setFound(page.items))
        .catch(() => live && setFound([]))
        .finally(() => live && setSearching(false))
    }, query ? 300 : 0)
    return () => {
      live = false
      window.clearTimeout(timer)
    }
  }, [query])

  const openByCode = async (e: React.FormEvent) => {
    e.preventDefault()
    setCodeError(null)
    try {
      const m = await kaluta.memorials.byQr(code.trim())
      setCode('')
      open(m.id)
    } catch (err) {
      setCodeError(err instanceof ApiError ? err.message : 'Unknown memorial code')
    }
  }

  return (
    <AppShell
      title="Digital Graveyard"
      subtitle="Memorials with a life story, a guest book, candles and flowers, and a QR code for the resting place."
    >
      {isStaff && (
        <div className="mb-5">
          <DeathReviewQueue />
        </div>
      )}
      <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="cloud-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-hi">
              <Search size={15} className="text-gold" aria-hidden="true" /> Find someone
            </h2>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name…" aria-label="Search memorials by name" className={field} />
            <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {searching && <li className="text-xs text-text-mid">Looking…</li>}
              {!searching && found.length === 0 && (
                <li className="text-xs text-text-mid">
                  {query ? 'Nobody by that name yet.' : 'No public memorials yet — the first one can be created below.'}
                </li>
              )}
              {found.map((m) => (
                <MemorialRow key={m.id} memorial={m} active={openId === m.id} onOpen={() => open(m.id)} />
              ))}
            </ul>
          </div>

          {(mine.data?.items.length ?? 0) > 0 && (
            <div className="cloud-card p-5">
              <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-text-hi">
                <Landmark size={15} className="text-gold" aria-hidden="true" /> Looked after by you
              </h2>
              <ul className="space-y-1">
                {mine.data!.items.map((m) => (
                  <MemorialRow key={m.id} memorial={m} active={openId === m.id} onOpen={() => open(m.id)} />
                ))}
              </ul>
            </div>
          )}

          <CreateMemorial
            onCreated={(m) => {
              mine.reload()
              open(m.id)
            }}
          />

          <form onSubmit={openByCode} className="cloud-card p-5">
            <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-text-hi">
              <QrCode size={15} className="text-gold" aria-hidden="true" /> Open by QR code
            </h2>
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Code from the headstone" aria-label="Memorial code" className={field} />
            <button type="submit" disabled={!code.trim()} className={cn(primary, 'mt-3')}>
              Open
            </button>
            {codeError && (
              <p role="alert" className="mt-2 text-sm text-danger">
                {codeError}
              </p>
            )}
          </form>
        </div>

        <section className="cloud-card min-h-[380px] p-5 sm:p-6" aria-label="Memorial">
          {openId ? (
            <OpenMemorial
              key={openId}
              id={openId}
              onChanged={() => mine.reload()}
              onDeleted={() => {
                mine.reload()
                open(null)
              }}
            />
          ) : (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 text-center">
              <Landmark size={22} className="text-text-mid" aria-hidden="true" />
              <p className="max-w-sm text-sm text-text-mid">
                Find someone, create a memorial, or open one with the code engraved on the resting place.
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
