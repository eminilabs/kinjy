import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { BadgeCheck, Compass, Package, Search, TreeDeciduous, UserRound, UsersRound } from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import { People, Places } from '@/components/social/Suggestions'
import MemberAvatar from '@/components/social/MemberAvatar'
import { kaluta, type Community, type Person, type PersonBrief, type Product } from '@/lib/api'
import { FEATURES } from '@/lib/features'
import { cn } from '@/lib/utils'

type Member = PersonBrief & { user_id: string }

/** user-service answers nothing below two characters, so the page does not ask. */
const MIN_QUERY = 2
/** The most user-service returns in one answer. */
const PEOPLE_LIMIT = 25

/**
 * What the page searches. A feature switched off in lib/features.ts is neither
 * queried nor given a section, and the subtitle does not promise it.
 */
const SCOPE = [
  'people',
  'communities',
  ...(FEATURES.marketplace ? ['the marketplace'] : []),
  ...(FEATURES.familyTree ? ['the family graph'] : []),
]
const SCOPE_TEXT = `${SCOPE.slice(0, -1).join(', ')} and ${SCOPE.at(-1)}`

/** Sections under People, one grid column each. Literal classes, for Tailwind. */
const COLUMNS = SCOPE.length - 1
const GRID_COLS = ['', '', 'lg:grid-cols-2', 'lg:grid-cols-3'][COLUMNS]
const FULL_ROW = ['', '', 'lg:col-span-2', 'lg:col-span-3'][COLUMNS]

function Section({
  title,
  icon: Icon,
  empty,
  emptyText = 'Nothing found.',
  className,
  children,
}: {
  title: string
  icon: typeof Compass
  empty: boolean
  emptyText?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section className={cn('cloud-card p-5', className)}>
      <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-text-hi">
        <Icon size={15} className="text-gold" aria-hidden="true" />
        {title}
      </h2>
      {empty ? <p className="text-sm text-text-low">{emptyText}</p> : children}
    </section>
  )
}

/**
 * Explore — one query across the services that can answer it.
 *
 * Each service is searched independently and a failing one degrades its own
 * section instead of emptying the page: a marketplace outage should not make it
 * look like there are no communities either.
 */
export default function Explore() {
  const [params] = useSearchParams()
  const urlQuery = params.get('q') ?? ''
  const [query, setQuery] = useState(urlQuery)
  // The top bar's search lands here as ?q=. Used while this page is already
  // open, the route stays mounted, so the new value is adopted during render.
  const [adopted, setAdopted] = useState(urlQuery)
  if (urlQuery !== adopted) {
    setAdopted(urlQuery)
    setQuery(urlQuery)
  }

  const [busy, setBusy] = useState(false)
  const [members, setMembers] = useState<Member[] | null>(null)
  const [communities, setCommunities] = useState<Community[] | null>(null)
  const [products, setProducts] = useState<Product[] | null>(null)
  const [people, setPeople] = useState<Person[] | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const latest = useRef(0)
  const pending = useRef<number | undefined>(undefined)

  const search = useCallback(async (q: string) => {
    const ticket = ++latest.current
    setBusy(true)

    const results = await Promise.allSettled([
      kaluta.people.search(q, PEOPLE_LIMIT),
      kaluta.communities.list({ q }),
      FEATURES.marketplace ? kaluta.market.products({ q }) : null,
      FEATURES.familyTree ? kaluta.family.search(q) : null,
    ])

    // Answers arrive out of order: the one for "e" can land after the one for
    // "ez", and must not replace what the member has typed since.
    if (ticket !== latest.current) return

    const failures: string[] = []
    setMembers(results[0].status === 'fulfilled' ? results[0].value.items : (failures.push('people'), null))
    setCommunities(results[1].status === 'fulfilled' ? results[1].value.items : (failures.push('communities'), null))
    setProducts(results[2].status === 'fulfilled' ? (results[2].value?.items ?? null) : (failures.push('marketplace'), null))
    setPeople(results[3].status === 'fulfilled' ? (results[3].value?.items ?? null) : (failures.push('family tree'), null))
    setErrors(failures)
    setBusy(false)
  }, [])

  const q = query.trim()
  const active = q.length >= MIN_QUERY

  // Results follow the typing, so "ez" already lists Ezekiel. Debounced: each
  // search fans out to several services, and a burst of keystrokes should cost one.
  useEffect(() => {
    if (!active) {
      // Whatever is still in flight answers text that is no longer there.
      latest.current++
      return
    }
    pending.current = window.setTimeout(() => void search(q), 250)
    return () => window.clearTimeout(pending.current)
  }, [q, active, search])

  // Enter and the button still search, straight away rather than after the pause.
  const run = (event: React.FormEvent) => {
    event.preventDefault()
    if (!active) return
    window.clearTimeout(pending.current)
    void search(q)
  }

  const searching = busy && active

  return (
    <AppShell title="Explore" subtitle={`Search ${SCOPE_TEXT} at once.`}>
      <form onSubmit={run}>
        <label className="flex items-center gap-2.5 rounded-full border border-white/10 bg-ink-2/60 px-4 py-3">
          <Search size={16} className="shrink-0 text-text-low" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Kinjy — a name, Kigoma, cassava…"
            aria-label="Search Kinjy"
            className="w-full bg-transparent text-sm text-text-hi placeholder:text-text-low focus:outline-none"
          />
          <button
            type="submit"
            disabled={!active || searching}
            className="shrink-0 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-1.5 text-xs font-bold text-ink disabled:opacity-40"
          >
            {searching ? 'Searching…' : 'Search'}
          </button>
        </label>
      </form>

      {/* Nothing typed yet. A search box on an empty page tells somebody who
          has just arrived to go away and think of a word; the point of a
          discovery page is that it answers before it is asked. These are the
          same two lists the feed's rail carries, at a size that suits a page. */}
      {!active && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <People limit={12} title="People to connect with" />
          <Places limit={8} title="Community spaces to join" />
        </div>
      )}

      {active && errors.length > 0 && (
        <p className="mt-3 text-sm text-amber-200">
          Could not reach: {errors.join(', ')}. The other results are complete.
        </p>
      )}

      {active && (members || communities || products || people) && (
        <div className={cn('mt-6 grid gap-4', GRID_COLS)}>
          <Section
            title="People"
            icon={UserRound}
            empty={(members ?? []).length === 0}
            emptyText={`No member whose name starts with “${q}”.`}
            className={FULL_ROW}
          >
            <ul className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3" aria-live="polite">
              {(members ?? []).map((m) => (
                <li key={m.user_id} className="flex min-w-0 items-center gap-3">
                  <MemberAvatar handle={m.handle} displayName={m.display_name} avatarUrl={m.avatar_url} size={36} />
                  {/* The name and the handle line are one link: whichever the
                      member clicks, they land on that person's profile. */}
                  <Link to={`/u/${m.handle}`} className="group min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-sm font-semibold text-text-hi group-hover:text-gold-soft">
                      <span className="truncate">{m.display_name}</span>
                      {m.verified && <BadgeCheck size={13} className="shrink-0 text-gold" aria-label="Verified" />}
                    </span>
                    <span className="caption block truncate">
                      @{m.handle}
                      {m.city ? ` · ${m.city}` : ''}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>

          <Section title="Communities" icon={UsersRound} empty={(communities ?? []).length === 0}>
            <ul className="space-y-2">
              {(communities ?? []).map((c) => (
                <li key={c.id} className="text-sm">
                  <Link to="/communities" className="text-text-hi hover:text-gold-soft">
                    {c.name}
                  </Link>
                  <span className="caption block">{c.members_count} members · {c.kind}</span>
                </li>
              ))}
            </ul>
          </Section>

          {FEATURES.marketplace && (
            <Section title="Marketplace" icon={Package} empty={(products ?? []).length === 0}>
              <ul className="space-y-2">
                {(products ?? []).map((p) => (
                  <li key={p.id} className="text-sm">
                    <Link to="/market" className="text-text-hi hover:text-gold-soft">
                      {p.title}
                    </Link>
                    <span className="caption block">${p.customer_price}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {FEATURES.familyTree && (
            <Section title="Family graph" icon={TreeDeciduous} empty={(people ?? []).length === 0}>
              <ul className="space-y-2">
                {(people ?? []).map((p) => (
                  <li key={p.id} className="text-sm">
                    <Link to="/tree" className="text-text-hi hover:text-gold-soft">
                      {p.given_name} {p.family_name ?? ''}
                    </Link>
                    <span className="caption block">{p.status ?? 'pending'}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}
    </AppShell>
  )
}
