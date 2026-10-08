import { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useSearchParams } from 'react-router'
import { LayoutList, Network, Plus, UserRound } from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import { useAppTheme } from '@/components/appdemo/theme'
import FamilyFinder from '@/components/family/tree/FamilyFinder'
import GenerationList from '@/components/family/tree/GenerationList'
import PersonForm from '@/components/family/tree/PersonForm'
import { emptyValues, toFields, type FormValues } from '@/components/family/tree/formValues'
import PersonPanel, { type PanelLink } from '@/components/family/tree/PersonPanel'
import type { KnownParent } from '@/components/family/tree/relativeExtras'
import StatusIcon from '@/components/family/tree/Status'
import TreeCanvas from '@/components/family/tree/TreeCanvas'
import { fullName } from '@/components/family/tree/layout'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { ApiError, kaluta, type FamilyTree as Tree } from '@/lib/api'
import { cn } from '@/lib/utils'

type View = 'tree' | 'list'
const VIEW_KEY = 'kinjy.tree.view'
const DEPTHS = [2, 3, 4, 5, 6]

function savedView(): View | null {
  try {
    const value = localStorage.getItem(VIEW_KEY)
    return value === 'tree' || value === 'list' ? value : null
  } catch {
    return null
  }
}

/** First step: put yourself in the tree. Everything else grows from that one person. */
function StartTree({ onStarted, intro }: { onStarted: (personId: string) => void; intro: string }) {
  const { tok } = useAppTheme()
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // A starting point, not a claim: the profile's name, split, and editable before it is saved.
  const [given, ...rest] = (user?.display_name ?? '').trim().split(/\s+/)

  return (
    <section aria-labelledby="start-tree" className={cn('mx-auto max-w-xl rounded-card-lg p-5 sm:p-6', tok.card)}>
      <h2 id="start-tree" className={cn('text-lg font-semibold', tok.text)}>
        Start with yourself
      </h2>
      <p className={cn('mb-4 mt-1 text-sm', tok.mid)}>{intro}</p>
      <PersonForm
        initial={emptyValues(given ?? '', rest.join(' '))}
        submitLabel="Add me to the tree"
        busy={busy}
        error={error}
        onSubmit={async (values: FormValues) => {
          if (!user) return
          setBusy(true)
          setError(null)
          try {
            const added = await kaluta.family.addPerson({ ...toFields(values, false), user_id: user.id })
            onStarted(added.id)
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not add you. Try again.')
          } finally {
            setBusy(false)
          }
        }}
      />
    </section>
  )
}

/** On a phone the person is a screen of their own, above everything else. */
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const key = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    document.addEventListener('keydown', key)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', key)
      document.body.style.overflow = overflow
    }
  }, [onClose])
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Person" className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-3">
      <div className="mx-auto max-w-lg">{children}</div>
    </div>,
    document.body,
  )
}

export default function FamilyTree() {
  const { tok } = useAppTheme()
  const wide = useMediaQuery('(min-width: 1024px)')
  const [params, setParams] = useSearchParams()
  const me = useApi(() => kaluta.family.me(), [])
  const known = useApi(() => kaluta.family.persons(1), [])
  const [depth, setDepth] = useState(3)
  const [chosenView, setChosenView] = useState<View | null>(savedView)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [highlight, setHighlight] = useState<string[] | undefined>()
  const [starting, setStarting] = useState(false)

  const myId = me.data?.person?.id ?? null
  const rootId = params.get('p') ?? myId ?? known.data?.items[0]?.id ?? null
  const tree = useApi<Tree | null>(() => (rootId ? kaluta.family.tree(rootId, depth) : Promise.resolve(null)), [rootId, depth])

  // A drawing on a wide screen, a list on a phone, unless the member has chosen.
  const view: View = chosenView ?? (wide ? 'tree' : 'list')
  const chooseView = (next: View) => {
    setChosenView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      /* the choice is a convenience */
    }
  }

  const centreOn = useCallback(
    (personId: string) => {
      setParams(personId === myId ? {} : { p: personId })
      setSelectedId(null)
      setHighlight(undefined)
    },
    [myId, setParams],
  )
  const select = useCallback((personId: string) => {
    setSelectedId(personId)
    setHighlight(undefined)
  }, [])
  const refresh = useCallback(() => {
    tree.reload()
    me.reload()
    known.reload()
  }, [tree, me, known])
  const closePanel = useCallback(() => {
    setSelectedId(null)
    setHighlight(undefined)
  }, [])

  const started = (personId: string) => {
    setStarting(false)
    me.reload()
    known.reload()
    setParams({ p: personId })
  }

  const loading = (me.loading && !me.data) || (known.loading && !known.data)
  const nobody = !loading && !rootId && !me.error
  const data = tree.data
  const shownCount = data?.nodes.length ?? 0

  // A generation of a hundred people is a strip twenty thousand pixels wide as a drawing, and a
  // short page as a list. Say so, rather than leave someone scrolling sideways.
  const widest = useMemo(() => {
    const perLevel = new Map<number, number>()
    for (const node of data?.nodes ?? []) perLevel.set(node.level, (perLevel.get(node.level) ?? 0) + 1)
    return Math.max(0, ...perLevel.values())
  }, [data])

  // The selected person's links, read the way they would read them: "Ama · mother".
  const around = useMemo(() => {
    const none = { links: [] as PanelLink[], parents: [] as KnownParent[], partners: [] as Array<{ id: string; name: string }> }
    if (!data || !selectedId) return none
    const name = new Map(data.nodes.map((n) => [n.person.id, fullName(n.person)]))
    const parentKinds = new Set(['parent_of', 'adoptive_parent_of', 'guardian_of'])
    const links: PanelLink[] = []
    const parents: KnownParent[] = []
    const partners: Array<{ id: string; name: string }> = []
    for (const e of data.edges) {
      if (e.from !== selectedId && e.to !== selectedId) continue
      const otherId = e.from === selectedId ? e.to : e.from
      const otherName = name.get(otherId) ?? 'Someone'
      const isParentOfSelected = parentKinds.has(e.kind) && e.to === selectedId
      let role: string
      if (e.kind === 'spouse_of') role = 'partner'
      else if (e.kind === 'sibling_of') role = 'sibling (declared)'
      else if (e.kind === 'guardian_of') role = e.to === selectedId ? 'guardian' : 'ward'
      else {
        const base = e.kind === 'adoptive_parent_of' ? 'adoptive ' : ''
        role = isParentOfSelected ? `${base}${e.role ?? 'parent'}` : `${base}child`
      }
      links.push({
        id: e.id,
        otherId,
        otherName,
        role,
        removable: e.removable,
        roleOf: isParentOfSelected && e.kind !== 'guardian_of' ? { value: e.role } : undefined,
      })
      if (isParentOfSelected && e.kind === 'parent_of') parents.push({ id: otherId, name: otherName, role: e.role })
      if (e.kind === 'spouse_of') partners.push({ id: otherId, name: otherName })
    }
    return { links, parents, partners }
  }, [data, selectedId])

  const summary = useMemo(() => {
    if (!data) return null
    const middle = data.nodes.find((n) => n.person.id === data.root)?.person
    return { name: middle ? fullName(middle) : 'this person', size: data.family_size }
  }, [data])

  return (
    <AppShell title="Family tree" subtitle="Your family, generation by generation. Confirmed by the people who know it.">
      {loading && (
        <p role="status" className={cn('py-10 text-center text-sm', tok.low)}>
          Loading your family…
        </p>
      )}

      {(me.error || known.error) && !loading && (
        <div role="alert" className={cn('mx-auto max-w-xl rounded-card-lg p-5', tok.card)}>
          <p className="text-sm text-red-200">{me.error ?? known.error}</p>
          <button type="button" onClick={refresh} className="mt-3 rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold text-text-hi">
            Try again
          </button>
        </div>
      )}

      {nobody && (
        <StartTree
          onStarted={started}
          intro="Add yourself first. Then add a parent, a partner or a child from your own card, and the tree grows from there. Only the people in your family can see it, and you decide who else can in your privacy settings."
        />
      )}

      {rootId && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="min-w-[220px] flex-1">
              <FamilyFinder onPick={(person) => centreOn(person.id)} />
            </div>
            <div role="group" aria-label="View" className={cn('inline-flex overflow-hidden rounded-full border border-white/15', tok.subtleBg)}>
              {(
                [
                  ['tree', 'Tree', Network],
                  ['list', 'List', LayoutList],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={view === id}
                  onClick={() => chooseView(id)}
                  className={cn('inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold', view === id ? 'bg-gold/20 text-text-hi' : tok.mid)}
                >
                  <Icon size={13} aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2">
              <span className={cn('text-xs', tok.low)}>Generations</span>
              <select
                value={depth}
                onChange={(e) => setDepth(Number(e.target.value))}
                aria-label="How many generations to show"
                className={cn('rounded-card-sm px-2 py-1.5 text-xs focus:border-gold/50 focus:outline-none', tok.input, tok.text)}
              >
                {DEPTHS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </label>
            {myId && rootId !== myId && (
              <button type="button" onClick={() => centreOn(myId)} className={cn('inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold', tok.text, tok.hoverBg)}>
                <UserRound size={13} aria-hidden="true" /> My tree
              </button>
            )}
            {!myId && !me.loading && !starting && (
              <button type="button" onClick={() => setStarting(true)} className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-3.5 py-1.5 text-xs font-bold text-ink">
                <Plus size={13} aria-hidden="true" /> Add myself
              </button>
            )}
          </div>

          {starting && !myId && (
            <StartTree onStarted={started} intro="You are not in this tree yet. Add yourself so the people here can link to you." />
          )}

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
            <section aria-label="The tree" aria-busy={tree.loading} className={cn('min-w-0 rounded-card-lg p-4', tok.card)}>
              {summary && (
                <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <p className={cn('text-sm', tok.mid)}>
                    Centred on <span className={cn('font-semibold', tok.text)}>{summary.name}</span>
                  </p>
                  <p className={cn('text-xs', tok.low)}>
                    {shownCount === summary.size ? `${shownCount} ${shownCount === 1 ? 'person' : 'people'}` : `${shownCount} of ${summary.size} people shown`}
                  </p>
                </header>
              )}

              {tree.error && !data && (
                <div role="alert" className="py-8 text-center">
                  <p className="text-sm text-red-200">
                    {tree.error.toLowerCase().includes('not found') ? 'That person is not in a family you can see.' : tree.error}
                  </p>
                  <div className="mt-3 flex justify-center gap-2">
                    <button type="button" onClick={tree.reload} className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold text-text-hi">
                      Try again
                    </button>
                    {myId && rootId !== myId && (
                      <button type="button" onClick={() => centreOn(myId)} className={cn('rounded-full border border-white/15 px-4 py-1.5 text-xs font-semibold', tok.mid)}>
                        Go to my tree
                      </button>
                    )}
                  </div>
                </div>
              )}
              {tree.loading && !data && (
                <p role="status" className={cn('py-10 text-center text-sm', tok.low)}>
                  Loading the tree…
                </p>
              )}

              {data && (
                <>
                  {data.nodes.length === 1 && (
                    <p className={cn('mb-3 rounded-card-md border border-dashed border-white/15 px-3 py-2.5 text-sm', tok.mid)}>
                      {fullName(data.nodes[0].person)} has no relatives in the tree yet. Select the card, then add a parent, a partner or a child.
                    </p>
                  )}
                  {view === 'tree' && widest > 12 && (
                    <p className={cn('mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-card-md border border-white/15 px-3 py-2 text-xs', tok.mid)}>
                      One generation here has {widest} people, which is easier to read as a list.
                      <button type="button" onClick={() => chooseView('list')} className="font-semibold text-gold-soft underline underline-offset-2">
                        Switch to the list
                      </button>
                    </p>
                  )}
                  {view === 'tree' ? (
                    <TreeCanvas tree={data} selectedId={selectedId} highlight={highlight} onSelect={select} onCentre={centreOn} />
                  ) : (
                    <GenerationList tree={data} selectedId={selectedId} onSelect={select} />
                  )}
                  {data.truncated && (
                    <p className={cn('mt-3 text-xs', tok.low)}>
                      More of the family lies beyond this view. Show more generations, or open someone’s own tree with “See the tree from here”.
                    </p>
                  )}
                  <ul className={cn('mt-4 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-white/10 pt-3 text-xs', tok.low)} aria-label="Legend">
                    <li className="inline-flex items-center gap-1.5"><StatusIcon status="verified" size={13} /> Confirmed by close relatives</li>
                    <li className="inline-flex items-center gap-1.5"><StatusIcon status="pending" size={13} /> Waiting for confirmation</li>
                    <li className="inline-flex items-center gap-1.5"><StatusIcon status="disputed" size={13} /> Disputed</li>
                    {view === 'tree' && <li>Dashed line: adoptive, guardian or declared sibling</li>}
                  </ul>
                </>
              )}
            </section>

            {wide && (
              <aside aria-label="Person details" className="lg:sticky lg:top-4">
                {selectedId ? (
                  <PersonPanel
                    key={selectedId}
                    personId={selectedId}
                    meId={data?.me ?? myId}
                    links={around.links}
                    parents={around.parents}
                    partners={around.partners}
                    onCentre={centreOn}
                    onChanged={refresh}
                    onRemoved={(id) => {
                      closePanel()
                      if (id === rootId) setParams({}, { replace: true })
                      refresh()
                    }}
                    onShowPath={setHighlight}
                  />
                ) : (
                  <p className={cn('rounded-card-lg p-5 text-sm', tok.card, tok.low)}>
                    Select someone to see their details, confirm what you know, and add their parents, partner or children.
                  </p>
                )}
              </aside>
            )}
          </div>
        </div>
      )}

      {!wide && selectedId && (
        <Overlay onClose={closePanel}>
          <PersonPanel
            key={selectedId}
            personId={selectedId}
            meId={data?.me ?? myId}
            links={around.links}
            parents={around.parents}
            partners={around.partners}
            onCentre={centreOn}
            onChanged={refresh}
            onRemoved={(id) => {
              closePanel()
              if (id === rootId) setParams({}, { replace: true })
              refresh()
            }}
            onShowPath={setHighlight}
            onClose={closePanel}
          />
        </Overlay>
      )}
    </AppShell>
  )
}
