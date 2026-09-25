import { useEffect, useState } from 'react'
import { Flame, Flower2, Plus, QrCode, Search } from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import { ApiError, kaluta, type Memorial, type Tribute } from '@/lib/api'

export default function Graveyard() {
  const [memorial, setMemorial] = useState<Memorial | null>(null)
  const [tributes, setTributes] = useState<{ counts: Record<string, number>; items: Tribute[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [death, setDeath] = useState('')
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')

  // Browsing was impossible: a memorial could be created and reached by its QR
  // code, and otherwise never found again — a graveyard with no paths through
  // it. This is the walk.
  const [query, setQuery] = useState('')
  const [browse, setBrowse] = useState<Memorial[]>([])
  const [browsing, setBrowsing] = useState(true)

  useEffect(() => {
    let cancelled = false
    setBrowsing(true)
    const timer = window.setTimeout(() => {
      kaluta.memorials
        .list({ q: query.trim() || undefined, limit: 24 })
        .then((page) => {
          if (!cancelled) setBrowse(page.items)
        })
        .catch(() => {
          if (!cancelled) setBrowse([])
        })
        .finally(() => {
          if (!cancelled) setBrowsing(false)
        })
    }, query ? 300 : 0)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query])

  const loadTributes = async (id: string) => {
    try {
      setTributes(await kaluta.memorials.tributes(id))
    } catch {
      setTributes(null)
    }
  }

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    setError(null)
    try {
      const created = await kaluta.memorials.create({
        full_name: name.trim(),
        death_date: death || undefined,
      })
      setMemorial(created)
      setName('')
      setDeath('')
      void loadTributes(created.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the memorial')
    }
  }

  /** Open a memorial from the browse list. Named, not `open`, so it cannot be
   *  confused with window.open by a later reader. */
  const openMemorial = (chosen: Memorial) => {
    setError(null)
    setMemorial(chosen)
    void loadTributes(chosen.id)
  }

  const openByCode = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!code.trim()) return
    setError(null)
    try {
      const found = await kaluta.memorials.byQr(code.trim())
      setMemorial(found)
      void loadTributes(found.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unknown memorial code')
    }
  }

  const leave = async (kind: string) => {
    if (!memorial) return
    setError(null)
    try {
      const result = await kaluta.memorials.tribute(memorial.id, {
        kind,
        author_name: 'A visitor',
        body: kind === 'message' ? message.trim() || undefined : undefined,
      })
      setMessage('')
      setNote(
        result.status === 'pending'
          ? 'Left for the family to approve — memorial content is held before it appears.'
          : 'Your tribute is on the page.',
      )
      void loadTributes(memorial.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not leave the tribute')
    }
  }

  const field =
    'w-full rounded-card-sm border border-white/10 bg-ink-2/60 px-3 py-2 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none'

  return (
    <AppShell
      title="Digital Graveyard"
      subtitle="Memorials with a guest book, candles and flowers, and a QR code for the resting place. Tributes are held for the family to approve."
    >
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <div className="cloud-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-hi">
              <Search size={15} className="text-gold" aria-hidden="true" />
              Find someone
            </h2>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name…"
              aria-label="Search memorials by name"
              className={field}
            />
            <ul className="mt-3 max-h-72 space-y-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {browsing && <li className="caption">Looking…</li>}
              {!browsing && browse.length === 0 && (
                <li className="caption">
                  {query ? 'Nobody by that name yet.' : 'No memorials yet — the first one can be created below.'}
                </li>
              )}
              {browse.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => openMemorial(m)}
                    className="w-full rounded-card-sm px-2 py-1.5 text-start transition-colors hover:bg-white/5"
                  >
                    <span className="block truncate text-sm text-text-hi">{m.full_name}</span>
                    <span className="caption">
                      {[m.birth_date, m.death_date].filter(Boolean).join(' — ') || 'dates unknown'}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <form onSubmit={create} className="cloud-card p-5">
            <h2 className="mb-3 text-sm font-semibold text-text-hi">Create a memorial</h2>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full name"
              aria-label="Full name"
              className={field}
            />
            <input
              type="date"
              value={death}
              onChange={(e) => setDeath(e.target.value)}
              aria-label="Date of death"
              className={`${field} mt-2`}
            />
            <button
              type="submit"
              disabled={!name.trim()}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-sm font-bold text-ink disabled:opacity-40"
            >
              <Plus size={14} aria-hidden="true" />
              Create
            </button>
            <p className="caption mt-2">
              Anniversary reminders are scheduled at 10 days, 3 days and 6 hours.
            </p>
          </form>

          <form onSubmit={openByCode} className="cloud-card p-5">
            <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-text-hi">
              <QrCode size={15} className="text-gold" aria-hidden="true" />
              Open by QR code
            </h2>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code from the headstone"
              aria-label="Memorial code"
              className={field}
            />
            <button
              type="submit"
              disabled={!code.trim()}
              className="mt-3 w-full rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-text-mid transition-colors hover:border-gold/40 hover:text-gold-soft disabled:opacity-40"
            >
              Open
            </button>
          </form>
        </div>

        <div className="cloud-card min-h-[380px] p-6">
          {!memorial ? (
            <div className="flex h-full items-center justify-center text-center">
              <p className="text-sm text-text-low">
                Create a memorial, or open one with the code engraved on the resting place.
              </p>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl text-text-hi">{memorial.full_name}</h2>
              <p className="caption mt-1">
                {memorial.birth_date ?? '?'} — {memorial.death_date ?? '?'} · verification:{' '}
                {memorial.death_status}
              </p>
              <p className="caption mt-1">
                QR <span className="mono-data text-gold-soft">{memorial.qr_code}</span>
              </p>
              {!memorial.grave.verified && (
                <p className="caption mt-2 text-amber-200">
                  No verified grave location. Coordinates are only marked verified when captured on site.
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => leave('candle')}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-text-mid transition-colors hover:border-gold/40 hover:text-gold-soft"
                >
                  <Flame size={13} aria-hidden="true" />
                  Light a candle
                </button>
                <button
                  type="button"
                  onClick={() => leave('flower')}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-4 py-2 text-xs font-semibold text-text-mid transition-colors hover:border-gold/40 hover:text-gold-soft"
                >
                  <Flower2 size={13} aria-hidden="true" />
                  Leave a flower
                </button>
              </div>

              <div className="mt-5">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={2}
                  placeholder="Write in the guest book…"
                  aria-label="Guest book message"
                  className={`${field} resize-none`}
                />
                <button
                  type="button"
                  onClick={() => leave('message')}
                  disabled={!message.trim()}
                  className="mt-2 rounded-full bg-white/8 px-4 py-2 text-xs font-semibold text-text-mid disabled:opacity-40"
                >
                  Sign the guest book
                </button>
              </div>

              {tributes && (
                <div className="mt-6 border-t border-white/8 pt-4">
                  <p className="caption">
                    {Object.entries(tributes.counts)
                      .map(([k, v]) => `${v} ${k}${v === 1 ? '' : 's'}`)
                      .join(' · ') || 'No approved tributes yet.'}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {tributes.items.map((t) => (
                      <li key={t.id} className="rounded-card-sm bg-ink-2/40 p-3 text-sm text-text-mid">
                        <span className="text-text-hi">{t.author_name}</span> · {t.kind}
                        {t.body && <p className="mt-1">{t.body}</p>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {note && <p className="mt-4 text-sm text-gold-soft">{note}</p>}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-200">
          {error}
        </p>
      )}
    </AppShell>
  )
}
