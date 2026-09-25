import { useState } from 'react'
import { Link } from 'react-router'
import { Compass, Package, Search, TreeDeciduous, UsersRound } from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import { kaluta, type Community, type Person, type Product } from '@/lib/api'

/**
 * Explore — one query across the services that can answer it.
 *
 * Each service is searched independently and a failing one degrades its own
 * section instead of emptying the page: a marketplace outage should not make it
 * look like there are no communities either.
 */
export default function Explore() {
  const [query, setQuery] = useState('')
  const [busy, setBusy] = useState(false)
  const [communities, setCommunities] = useState<Community[] | null>(null)
  const [products, setProducts] = useState<Product[] | null>(null)
  const [people, setPeople] = useState<Person[] | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  const run = async (event: React.FormEvent) => {
    event.preventDefault()
    const q = query.trim()
    if (q.length < 2) return
    setBusy(true)
    setErrors([])

    const results = await Promise.allSettled([
      kaluta.communities.list({ q }),
      kaluta.market.products({ q }),
      kaluta.family.search(q),
    ])

    const failures: string[] = []
    setCommunities(results[0].status === 'fulfilled' ? results[0].value.items : (failures.push('communities'), null))
    setProducts(results[1].status === 'fulfilled' ? results[1].value.items : (failures.push('marketplace'), null))
    setPeople(results[2].status === 'fulfilled' ? results[2].value.items : (failures.push('family tree'), null))
    setErrors(failures)
    setBusy(false)
  }

  const Section = ({
    title,
    icon: Icon,
    empty,
    children,
  }: {
    title: string
    icon: typeof Compass
    empty: boolean
    children: React.ReactNode
  }) => (
    <section className="cloud-card p-5">
      <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-text-hi">
        <Icon size={15} className="text-gold" aria-hidden="true" />
        {title}
      </h2>
      {empty ? <p className="text-sm text-text-low">Nothing found.</p> : children}
    </section>
  )

  return (
    <AppShell title="Explore" subtitle="Search communities, the marketplace and the family graph at once.">
      <form onSubmit={run}>
        <label className="flex items-center gap-2.5 rounded-full border border-white/10 bg-ink-2/60 px-4 py-3">
          <Search size={16} className="shrink-0 text-text-low" aria-hidden="true" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Kinjy — Kigoma, cassava, people…"
            aria-label="Search Kinjy"
            className="w-full bg-transparent text-sm text-text-hi placeholder:text-text-low focus:outline-none"
          />
          <button
            type="submit"
            disabled={query.trim().length < 2 || busy}
            className="shrink-0 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-1.5 text-xs font-bold text-ink disabled:opacity-40"
          >
            {busy ? 'Searching…' : 'Search'}
          </button>
        </label>
      </form>

      {errors.length > 0 && (
        <p className="mt-3 text-sm text-amber-200">
          Could not reach: {errors.join(', ')}. The other results are complete.
        </p>
      )}

      {(communities || products || people) && (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
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
        </div>
      )}
    </AppShell>
  )
}
