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
  'w-full rounded-xl border border-transparent bg-text-hi/[0.07] px-4 py-3 text-[0.95rem] text-text-hi placeholder:text-text-low focus:border-gold/50 focus:bg-transparent focus:outline-none'
const primary =
  'inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-gold-soft px-5 py-3 text-sm font-bold text-ink disabled:opacity-40'
const label = 'mono-data text-[0.7rem] font-bold uppercase tracking-[0.15em] text-gold-soft'

function MemorialRow({ memorial, active, onOpen }: { memorial: Memorial; active: boolean; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        aria-current={active ? 'true' : undefined}
        className={cn(
          'w-full rounded-xl px-3 py-2.5 text-start transition-colors hover:bg-text-hi/[0.05]',
          active && 'bg-gold/15 hover:bg-gold/15',
        )}
      >
        <span className="flex items-center gap-1.5 text-[0.95rem] font-semibold text-text-hi">
          <span className="truncate">{memorial.full_name}</span>
          {memorial.visibility === 'private' && <Lock size={12} className="shrink-0 text-text-mid" aria-label="Private" />}
          {Boolean(memorial.pending_tributes) && (
            <span className="ms-auto shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[0.68rem] font-semibold text-warning">
              {memorial.pending_tributes} waiting
            </span>
          )}
        </span>
        <span className="mt-0.5 block text-xs text-text-low">{lifeSpan(memorial.birth_date, memorial.death_date)}</span>
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
    <form onSubmit={create} className="cloud-card space-y-3 p-5">
      <h2 className={cn(label, 'mb-1')}>Create a memorial</h2>
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={200} placeholder="Full name" aria-label="Full name" className={field} />
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm text-text-mid">
          Born
          <input type="date" value={birth} max={today} onChange={(e) => setBirth(e.target.value)} className={cn(field, 'mt-1')} />
        </label>
        <label className="block text-sm text-text-mid">
          Died
          <input type="date" value={death} max={today} onChange={(e) => setDeath(e.target.value)} className={cn(field, 'mt-1')} />
        </label>
      </div>
      {datesWrong && <p className="text-xs text-warning">The date of death is before the date of birth.</p>}
      <label className="flex items-start gap-2.5 text-sm leading-snug text-text-mid">
        <input type="checkbox" className="mt-0.5" checked={isPrivate} onChange={(e) => setPrivate(e.target.checked)} />
        Private for now — only its administrators can see it
      </label>
      <button type="submit" disabled={busy || name.trim().length < 2 || datesWrong} className={primary}>
        <Plus size={14} aria-hidden="true" /> Create
      </button>
      <p className="text-sm text-text-low">Anniversary reminders come 10 days, 3 days and 6 hours before.</p>
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

  if (memorial.loading && !memorial.data) return <p className="text-sm text-text-low">Opening the memorial…</p>
  if (!memorial.data) return <p className="text-sm text-warning">{memorial.error ?? 'This memorial could not be opened.'}</p>

  const m = memorial.data
  const changed = () => {
    memorial.reload()
    onChanged()
  }

  return (
    <div>
      {m.is_admin && (
        <div className="mb-5 flex gap-1 rounded-full border border-[var(--cloud-border)] bg-text-hi/[0.04] p-1" role="tablist" aria-label="Memorial views">
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
                'flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors',
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
    <AppShell>
      <header className="mb-6">
        <p className="mono-data text-[0.72rem] font-bold uppercase tracking-[0.15em] text-gold-soft">Digital Graveyard</p>
        <h1 className="mt-2 text-[clamp(38px,5vw,56px)] font-bold leading-[1.02] tracking-[-0.045em] text-text-hi">
          Remember them well
        </h1>
        <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-text-low">
          Memorials with a life story, a guest book, candles and flowers, and a QR code for the resting place.
        </p>
      </header>
      {isStaff && (
        <div className="mb-5">
          <DeathReviewQueue />
        </div>
      )}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="cloud-card p-5">
            <h2 className={cn(label, 'mb-3 flex items-center gap-2')}>
              <Search size={14} aria-hidden="true" /> Find someone
            </h2>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name…" aria-label="Search memorials by name" className={field} />
            <ul className="mt-3 max-h-80 space-y-0.5 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {searching && <li className="px-1 text-sm text-text-low">Looking…</li>}
              {!searching && found.length === 0 && (
                <li className="px-1 text-sm leading-relaxed text-text-low">
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
              <h2 className={cn(label, 'mb-3 flex items-center gap-2')}>
                <Landmark size={14} aria-hidden="true" /> Looked after by you
              </h2>
              <ul className="space-y-0.5">
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
            <h2 className={cn(label, 'mb-3 inline-flex items-center gap-2')}>
              <QrCode size={14} aria-hidden="true" /> Open by QR code
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

        <section className="cloud-card min-h-[380px] p-5 sm:p-7" aria-label="Memorial">
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
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gold/15 text-gold-soft">
                <Landmark size={26} aria-hidden="true" />
              </span>
              <p className="mt-5 text-lg font-bold tracking-[-0.02em] text-text-hi">Open a memorial</p>
              <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-text-low">
                Find someone, create a memorial, or open one with the code engraved on the resting place.
              </p>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  )
}
