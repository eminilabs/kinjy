import { useEffect, useState } from 'react'
import { ArrowUp, BookOpen, CheckCircle2, Search } from 'lucide-react'
import { kaluta, type KnowledgeEntry } from '@/lib/api'
import { cn } from '@/lib/utils'

const SEARCH_DEBOUNCE_MS = 300

interface KnowledgePanelProps {
  forumId: string
  className?: string
  onOpenThread: (threadId: string) => void
}

type Status = 'loading' | 'ready' | 'error'

function Provenance({ entry }: { entry: KnowledgeEntry }) {
  if (entry.origin === 'community') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
        <CheckCircle2 size={12} aria-hidden="true" /> Community verified
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-sky-400/30 bg-sky-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-sky">
      <BookOpen size={12} aria-hidden="true" /> {entry.reviewed ? 'Reviewed' : 'Curated'}
    </span>
  )
}

/**
 * What a forum has settled: answers its asker accepted and other members
 * upvoted, each with the discussion it came from. Nothing here is generated;
 * an entry is the thread's title and a reply's own words.
 */
export default function KnowledgePanel({ forumId, className, onOpenThread }: KnowledgePanelProps) {
  const [query, setQuery] = useState('')
  const [entries, setEntries] = useState<KnowledgeEntry[]>([])
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    let current = true
    // Typing waits a moment; an empty box loads at once.
    const timer = setTimeout(
      async () => {
        setStatus('loading')
        try {
          const result = await kaluta.forums.knowledge(forumId, query.trim())
          if (!current) return
          setEntries(result.items)
          setStatus('ready')
        } catch {
          if (!current) return
          setEntries([])
          setStatus('error')
        }
      },
      query ? SEARCH_DEBOUNCE_MS : 0,
    )
    return () => {
      current = false
      clearTimeout(timer)
    }
  }, [forumId, query])

  return (
    <section aria-label="Knowledge base" className={cn('space-y-3', className)}>
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-low" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search what this forum knows…"
          aria-label="Search the knowledge base"
          className="w-full rounded-2xl border border-white/10 bg-ink-2/60 py-3 pl-9 pr-4 text-sm text-text-hi placeholder:text-text-low transition-colors focus:border-gold/50 focus:outline-none"
        />
      </div>

      {status === 'loading' && entries.length === 0 && (
        <div role="status" className="cloud-card p-8 text-center text-sm text-text-low">
          Loading…
        </div>
      )}
      {status === 'error' && (
        <div role="alert" className="cloud-card p-8 text-center text-sm text-text-low">
          Could not load the knowledge base. Try again in a moment.
        </div>
      )}
      {status === 'ready' && entries.length === 0 && (
        <div className="cloud-card p-8 text-center text-sm text-text-low">
          {query.trim()
            ? 'Nothing here matches your search.'
            : 'Nothing has been settled here yet. An answer shows up once its asker accepts it and two members upvote it.'}
        </div>
      )}

      <ul className="space-y-3" aria-busy={status === 'loading'}>
        {entries.map((entry) => (
          <li key={entry.id} className="cloud-card space-y-3 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Provenance entry={entry} />
              {entry.votes > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-text-low">
                  <ArrowUp size={12} aria-hidden="true" /> {entry.votes} {entry.votes === 1 ? 'upvote' : 'upvotes'}
                </span>
              )}
            </div>
            <h3 className="text-base font-semibold leading-snug text-text-hi">{entry.question}</h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-mid">{entry.answer}</p>
            <div className="flex flex-wrap gap-2 border-t border-white/6 pt-3">
              {entry.sources.map((threadId, index) => (
                <button
                  key={threadId}
                  type="button"
                  onClick={() => onOpenThread(threadId)}
                  className="inline-flex min-h-[44px] items-center rounded-xl border border-white/10 bg-white/4 px-3 text-xs font-semibold text-gold transition-colors hover:border-gold/40 active:scale-95"
                >
                  {entry.sources.length > 1 ? `Read discussion ${index + 1}` : 'Read the discussion'}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
