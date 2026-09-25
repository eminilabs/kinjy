import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, GitBranch, Link2, Plus, Search, ShieldCheck, ShieldQuestion, UserPlus } from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import FamilyGraph from '@/components/family/FamilyGraph'
import { ApiError, kaluta, type FamilyTree as Tree, type HowRelated, type Person } from '@/lib/api'
import { cn } from '@/lib/utils'

/** Only primitive edges are storable — everything else is derived at read time. */
const EDGE_KINDS = [
  { id: 'parent_of', label: 'is parent of' },
  { id: 'adoptive_parent_of', label: 'is adoptive parent of' },
  { id: 'spouse_of', label: 'is spouse of' },
  { id: 'sibling_of', label: 'is sibling of' },
] as const

const fullName = (p: Person) => `${p.given_name} ${p.family_name ?? ''}`.trim()

/**
 * Corroboration, on the person you selected.
 *
 * "Nothing enters the tree unverified" was a promise on the marketing page and
 * an endpoint with no caller: `/family/persons/{id}/confirm` has always been
 * there, and no screen invoked it. A deceased person needs three *closely
 * related* confirmations, and the server decides what counts as close — a
 * distant relative's vote is recorded but does not move the threshold, which is
 * what stops a ring of strangers verifying invented ancestors.
 */
function PersonPanel({ person, onConfirmed }: { person: Person; onConfirmed: () => void }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ status: string; confirmations: number; threshold: number } | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const decide = async (decision: 'confirm' | 'dispute') => {
    setBusy(true)
    setNote(null)
    try {
      setResult(await kaluta.family.confirm(person.id, decision))
      onConfirmed()
    } catch (err) {
      setNote(err instanceof ApiError ? err.message : 'Could not record that')
    } finally {
      setBusy(false)
    }
  }

  // Both are optional on the wire; without the fallback the progress bar
  // computes NaN and renders as an empty track that looks like zero progress
  // rather than like missing data.
  const confirmations = result?.confirmations ?? person.confirmations ?? 0
  const threshold = result?.threshold ?? (person.deceased ? 3 : 1)
  const status = result?.status ?? person.status ?? 'unconfirmed'

  return (
    <div className="mt-5 rounded-card-md border border-white/10 bg-ink-2/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-hi">{fullName(person)}</p>
          <p className="caption">
            {person.deceased ? 'Deceased · three close relatives required' : 'Living'} ·{' '}
            <span className={status === 'verified' ? 'text-success' : status === 'disputed' ? 'text-warning' : undefined}>
              {status}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void decide('confirm')}
            className="inline-flex items-center gap-1.5 rounded-full border border-success/40 px-3 py-1.5 text-xs font-semibold text-success transition-colors hover:bg-success/10 disabled:opacity-40"
          >
            <ShieldCheck size={13} aria-hidden="true" />
            Confirm
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void decide('dispute')}
            className="inline-flex items-center gap-1.5 rounded-full border border-warning/40 px-3 py-1.5 text-xs font-semibold text-warning transition-colors hover:bg-warning/10 disabled:opacity-40"
          >
            <AlertTriangle size={13} aria-hidden="true" />
            Dispute
          </button>
        </div>
      </div>

      <div className="mt-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-success transition-[width] duration-500"
            style={{ width: `${Math.min(100, (confirmations / Math.max(1, threshold)) * 100)}%` }}
          />
        </div>
        <p className="caption mt-1.5">
          {confirmations} of {threshold} corroboration{threshold === 1 ? '' : 's'} from close relatives
        </p>
      </div>

      {note && <p className="mt-2 text-xs text-amber-200">{note}</p>}
    </div>
  )
}

export default function FamilyTree() {
  const [people, setPeople] = useState<Person[]>([])
  const [rootId, setRootId] = useState<string | null>(null)
  const [tree, setTree] = useState<Tree | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const [given, setGiven] = useState('')
  const [family, setFamily] = useState('')
  const [deceased, setDeceased] = useState(false)

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [kind, setKind] = useState<string>('parent_of')
  const [relation, setRelation] = useState<HowRelated | null>(null)
  const [depth, setDepth] = useState(3)
  const [selected, setSelected] = useState<Person | null>(null)

  /** Browse on open, search once there is something real to search for. */
  const refreshPeople = useCallback(async () => {
    try {
      setPeople((await kaluta.family.persons()).items)
    } catch {
      /* the list is a convenience; failing it should not break the page */
    }
  }, [])

  const search = useCallback(
    async (q: string) => {
      // The endpoint wants two characters. Below that, show the browse list
      // rather than firing a request that can only 422.
      if (q.trim().length < 2) return refreshPeople()
      try {
        setPeople((await kaluta.family.search(q.trim())).items)
      } catch {
        /* leave the previous list in place rather than blanking it */
      }
    },
    [refreshPeople],
  )

  useEffect(() => {
    void refreshPeople()
  }, [refreshPeople])

  const loadTree = useCallback(async (personId: string, wanted?: number) => {
    setBusy(true)
    setError(null)
    try {
      setTree(await kaluta.family.tree(personId, wanted ?? depth))
      setRootId(personId)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the tree')
    } finally {
      setBusy(false)
    }
  }, [depth])

  const addPerson = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!given.trim()) return
    setError(null)
    try {
      const person = await kaluta.family.addPerson({
        given_name: given.trim(),
        family_name: family.trim() || undefined,
        deceased,
      })
      setGiven('')
      setNote(`${fullName(person)} added.`)
      await refreshPeople()
      if (!rootId) void loadTree(person.id)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add the person')
    }
  }

  const link = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!from || !to) return
    setError(null)
    try {
      await kaluta.family.link({ from_person_id: from, to_person_id: to, kind })
      setNote('Relationship recorded. Grandparents, cousins and the rest are derived from it.')
      if (rootId) void loadTree(rootId)
    } catch (err) {
      // A refused edge is usually the cycle guard doing its job.
      setError(err instanceof ApiError ? err.message : 'Could not link them')
    }
  }

  const checkRelation = async () => {
    if (!from || !to) return
    setError(null)
    try {
      setRelation(await kaluta.family.howRelated(from, to))
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not compute the path')
    }
  }

  return (
    <AppShell
      title="Family Tree"
      subtitle="A graph of person nodes and primitive edges. Grandparent, cousin and half-sibling are computed when you read the tree, never stored."
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Tree */}
        <div className="cloud-card min-h-[460px] p-5">
          {!tree ? (
            <div className="flex h-full items-center justify-center text-center">
              <p className="max-w-xs text-sm text-text-low">
                Begin with one person. Add yourself, then a parent — the graph grows from there.
              </p>
            </div>
          ) : (
            <>
              <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-text-mid">
                    Centred on{' '}
                    <span className="font-semibold text-text-hi">
                      {tree.nodes.find((n) => n.level === 0)?.person.given_name ?? 'this person'}
                    </span>
                  </p>
                  <p className="caption">
                    {tree.nodes.length} people · click to open, double-click to re-centre
                  </p>
                </div>
                <label className="flex items-center gap-2">
                  <span className="caption">Depth</span>
                  <select
                    value={depth}
                    onChange={(e) => {
                      const next = Number(e.target.value)
                      setDepth(next)
                      if (rootId) void loadTree(rootId, next)
                    }}
                    aria-label="How many generations to load"
                    className="rounded-card-sm border border-white/10 bg-ink-2/60 px-2 py-1 text-xs text-text-hi focus:border-gold/40 focus:outline-none"
                  >
                    {[2, 3, 4, 5, 6].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>
              </header>

              <FamilyGraph
                tree={tree}
                rootId={tree.root}
                selectedId={selected?.id ?? null}
                highlight={relation?.path?.map((step) => step.person_id)}
                onSelect={(id) => setSelected(tree.nodes.find((n) => n.person.id === id)?.person ?? null)}
                onReRoot={(id) => void loadTree(id)}
              />

              {/* The legend earns its place: without it a dashed edge and a
                  green dot are decoration rather than information. */}
              <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-white/8 pt-3">
                {[
                  ['bg-success', 'verified by relatives'],
                  ['bg-warning', 'disputed'],
                  ['bg-text-low/60', 'deceased'],
                ].map(([dot, label]) => (
                  <li key={label} className="caption flex items-center gap-1.5">
                    <span className={cn('h-2 w-2 rounded-full', dot)} />
                    {label}
                  </li>
                ))}
                <li className="caption flex items-center gap-1.5">
                  <span className="h-px w-5 border-t border-dashed border-text-low" />
                  proposed, not yet confirmed
                </li>
              </ul>

              {selected && <PersonPanel person={selected} onConfirmed={() => rootId && void loadTree(rootId)} />}
            </>
          )}
          {busy && <p className="caption mt-4">Loading…</p>}
        </div>

        {/* Tools */}
        <div className="space-y-4">
          <form onSubmit={addPerson} className="cloud-card p-5">
            <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-text-hi">
              <UserPlus size={15} className="text-gold" aria-hidden="true" />
              Add a person
            </h2>
            <input
              value={given}
              onChange={(e) => setGiven(e.target.value)}
              placeholder="Given name"
              aria-label="Given name"
              className="w-full rounded-card-sm border border-white/10 bg-ink-2/60 px-3 py-2 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none"
            />
            <input
              value={family}
              onChange={(e) => setFamily(e.target.value)}
              placeholder="Family name"
              aria-label="Family name"
              className="mt-2 w-full rounded-card-sm border border-white/10 bg-ink-2/60 px-3 py-2 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none"
            />
            <label className="mt-2 flex items-center gap-2 text-xs text-text-mid">
              <input type="checkbox" checked={deceased} onChange={(e) => setDeceased(e.target.checked)} />
              Deceased — needs three close relatives to confirm
            </label>
            <button
              type="submit"
              disabled={!given.trim()}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2 text-sm font-bold text-ink disabled:opacity-40"
            >
              <Plus size={14} aria-hidden="true" />
              Add
            </button>
          </form>

          <form onSubmit={link} className="cloud-card p-5">
            <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-text-hi">
              <GitBranch size={15} className="text-gold" aria-hidden="true" />
              Link two people
            </h2>
            {[
              { value: from, set: setFrom, label: 'First person' },
              { value: to, set: setTo, label: 'Second person' },
            ].map((field, index) => (
              <select
                key={field.label}
                value={field.value}
                onChange={(e) => field.set(e.target.value)}
                aria-label={field.label}
                className={cn(
                  'w-full rounded-card-sm border border-white/10 bg-ink-2/60 px-3 py-2 text-sm text-text-hi focus:border-gold/40 focus:outline-none',
                  index > 0 && 'mt-2',
                )}
              >
                <option value="">{field.label}…</option>
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {fullName(p)}
                  </option>
                ))}
              </select>
            ))}
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              aria-label="Relationship kind"
              className="mt-2 w-full rounded-card-sm border border-white/10 bg-ink-2/60 px-3 py-2 text-sm text-text-hi focus:border-gold/40 focus:outline-none"
            >
              {EDGE_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.label}
                </option>
              ))}
            </select>
            <div className="mt-3 flex gap-2">
              <button
                type="submit"
                disabled={!from || !to}
                className="flex-1 rounded-full border border-white/12 px-3 py-2 text-xs font-semibold text-text-mid transition-colors hover:border-gold/40 hover:text-gold-soft disabled:opacity-40"
              >
                Link
              </button>
              <button
                type="button"
                onClick={checkRelation}
                disabled={!from || !to}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/12 px-3 py-2 text-xs font-semibold text-text-mid transition-colors hover:border-sky/40 hover:text-sky disabled:opacity-40"
              >
                <Link2 size={12} aria-hidden="true" />
                How related?
              </button>
            </div>

            {relation && (
              <div className="mt-3 border-t border-white/8 pt-3">
                {relation.related ? (
                  <>
                    {/* The chain, one hop per line, each named by its relation to
                        the person you started from — "father → grandfather →
                        aunt → cousin" is the answer that was asked for. */}
                    <ol className="space-y-1.5">
                      <li className="flex items-center gap-2 text-xs text-text-mid">
                        <span className="font-bold text-text-hi">
                          {people.find((p) => p.id === from) ? fullName(people.find((p) => p.id === from)!) : 'Start'}
                        </span>
                        <span className="text-text-low">(you)</span>
                      </li>
                      {relation.path.map((step, index) => (
                        <li
                          key={`${step.person_id}-${index}`}
                          className="flex items-center gap-2 text-xs text-text-mid"
                        >
                          <span className="text-gold" aria-hidden="true">↓</span>
                          <span className="font-bold text-text-hi">
                            {step.name ?? step.person_id.slice(0, 8)}
                          </span>
                          <span className="text-text-low">({step.relation ?? step.step})</span>
                        </li>
                      ))}
                    </ol>
                    <p className="caption mt-2">
                      Path crosses {relation.verified_links ?? 0} verified link
                      {(relation.verified_links ?? 0) === 1 ? '' : 's'}
                      {typeof relation.total_links === 'number' &&
                        relation.total_links > (relation.verified_links ?? 0) &&
                        ` of ${relation.total_links}`}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-text-mid">No known relation between them.</p>
                )}
              </div>
            )}

            {/* Legend: the two states a link can be in. */}
            <div className="mt-3 flex items-center gap-3 border-t border-white/8 pt-3 text-[0.65rem] text-text-low">
              <span className="flex items-center gap-1">
                <ShieldCheck size={11} className="text-success" aria-hidden="true" /> Verified
              </span>
              <span className="flex items-center gap-1">
                <ShieldQuestion size={11} className="text-warning" aria-hidden="true" /> Pending corroboration
              </span>
            </div>
          </form>

          <div className="cloud-card p-5">
            <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-text-hi">
              <Search size={15} className="text-gold" aria-hidden="true" />
              People
            </h2>
            <input
              onChange={(e) => void search(e.target.value)}
              placeholder="Search by name…"
              aria-label="Search people"
              className="w-full rounded-card-sm border border-white/10 bg-ink-2/60 px-3 py-2 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none"
            />
            <ul className="mt-3 max-h-56 space-y-1 overflow-y-auto">
              {people.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => void loadTree(p.id)}
                    className="w-full truncate rounded-card-sm px-2 py-1.5 text-start text-sm text-text-mid transition-colors hover:bg-white/5 hover:text-text-hi"
                  >
                    {fullName(p)}
                    {p.status === 'verified' && <span className="caption"> · verified</span>}
                  </button>
                </li>
              ))}
            </ul>
          </div>
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
