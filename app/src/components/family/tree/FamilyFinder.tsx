import { useEffect, useId, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { useAppTheme } from '@/components/appdemo/theme'
import { ApiError, kaluta, type Person } from '@/lib/api'
import { cn } from '@/lib/utils'
import StatusIcon from './Status'
import { fullName } from './layout'

/**
 * "Find someone in your family": type two letters and pick, to see the tree from them.
 * The server searches only the families the member belongs to, so there is nothing to
 * filter here and nothing about anyone else to leak.
 */
export default function FamilyFinder({
  onPick,
  placeholder = 'Find someone in your family',
  label = 'Find someone in your family',
  exclude,
}: {
  onPick: (person: Person) => void
  placeholder?: string
  label?: string
  /** A person who must not be offered (the one being linked from). */
  exclude?: string
}) {
  const { tok } = useAppTheme()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Person[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const latest = useRef(0)
  const listId = useId()
  const wanted = query.trim()

  useEffect(() => {
    if (wanted.length < 2) return
    const ticket = ++latest.current
    const timer = window.setTimeout(() => {
      kaluta.family.search(wanted).then(
        (found) => {
          // A slower answer for an earlier word must not replace the one for the current word.
          if (ticket !== latest.current) return
          setResults(found.items)
          setError(null)
        },
        (err) => {
          if (ticket !== latest.current) return
          setResults(null)
          setError(err instanceof ApiError ? err.message : 'Could not search right now.')
        },
      )
    }, 250)
    return () => window.clearTimeout(timer)
  }, [wanted])

  const showing = wanted.length >= 2

  return (
    <div className="relative">
      <label htmlFor={`${listId}-q`} className="sr-only">
        {label}
      </label>
      <Search size={14} aria-hidden="true" className={cn('pointer-events-none absolute start-3 top-1/2 -translate-y-1/2', tok.low)} />
      <input
        id={`${listId}-q`}
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        aria-controls={showing ? listId : undefined}
        className={cn('w-full rounded-full py-2 pe-3 ps-9 text-sm placeholder:text-text-low focus:border-gold/50 focus:outline-none', tok.input, tok.text)}
      />
      {showing && (
        <div id={listId} role="region" aria-live="polite" aria-label="Search results" className={cn('absolute inset-x-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-card-md p-1 shadow-lg', tok.cardSolid)}>
          {error && <p className="px-3 py-2 text-sm text-red-200">{error}</p>}
          {!error && results === null && <p className={cn('px-3 py-2 text-sm', tok.low)}>Searching…</p>}
          {!error && results?.length === 0 && <p className={cn('px-3 py-2 text-sm', tok.low)}>No one in your family matches “{wanted}”.</p>}
          {!error &&
            results
              ?.filter((person) => person.id !== exclude)
              .map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => {
                  onPick(person)
                  setQuery('')
                  setResults(null)
                }}
                className={cn('flex w-full items-center gap-2 rounded-card-sm px-3 py-2 text-start text-sm', tok.text, tok.hoverBg)}
              >
                <span className="min-w-0 flex-1 truncate">{fullName(person)}</span>
                <StatusIcon status={person.status} size={13} />
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
