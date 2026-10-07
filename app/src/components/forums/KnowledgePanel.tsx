import { useCallback, useEffect, useState } from 'react'
import { BookOpen, Check, Pencil, Trash2 } from 'lucide-react'
import { ApiError, kaluta, type KnowledgeEntry } from '@/lib/api'
import { cn } from '@/lib/utils'

const field =
  'w-full rounded-card-sm border border-white/10 bg-ink-2/60 px-3 py-2 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none'

const small =
  'inline-flex items-center gap-1 rounded-full border border-white/12 px-3 py-1 text-xs font-semibold text-text-mid hover:border-gold/40 hover:text-text-hi disabled:opacity-40'

interface Props {
  forumId: string
  /** Opens the thread an entry was built from. */
  onOpenThread: (threadId: string) => void
  onError: (message: string | null) => void
}

/** Accepted answers of one forum, with the discussion each one came from. */
export default function KnowledgePanel({ forumId, onOpenThread, onError }: Props) {
  const [query, setQuery] = useState('')
  const [entries, setEntries] = useState<KnowledgeEntry[] | null>(null)
  const [editing, setEditing] = useState<{ id: string; question: string; answer: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      const result = await kaluta.forums.knowledge(forumId, { q: query.trim() || undefined })
      setEntries(result.items)
    } catch (err) {
      setEntries([])
      onError(err instanceof ApiError ? err.message : 'Could not load the knowledge base')
    }
  }, [forumId, query, onError])

  useEffect(() => {
    // Wait for a pause in typing rather than asking on every key.
    const timer = window.setTimeout(() => void load(), 250)
    return () => window.clearTimeout(timer)
  }, [load])

  const act = async (work: () => Promise<unknown>, failure: string) => {
    setBusy(true)
    onError(null)
    try {
      await work()
      await load()
    } catch (err) {
      onError(err instanceof ApiError ? err.message : failure)
    } finally {
      setBusy(false)
    }
  }

  const approve = (entry: KnowledgeEntry) =>
    act(() => kaluta.forums.reviewKnowledge(entry.id), 'Could not approve the entry')

  const remove = (entry: KnowledgeEntry) => {
    if (!window.confirm('Delete this entry? It leaves the knowledge base; the discussion stays.')) return
    void act(() => kaluta.forums.deleteKnowledge(entry.id), 'Could not delete the entry')
  }

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editing || !editing.question.trim() || !editing.answer.trim()) return
    await act(async () => {
      await kaluta.forums.editKnowledge(editing.id, {
        question: editing.question.trim(),
        answer: editing.answer.trim(),
      })
      setEditing(null)
    }, 'Could not save the entry')
  }

  return (
    <section aria-label="Knowledge base" className="cloud-card space-y-3 p-5">
      <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-text-hi">
        <BookOpen size={15} className="text-gold" aria-hidden="true" />
        Knowledge base
      </h2>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search questions and answers"
        aria-label="Search the knowledge base"
        className={field}
      />

      {entries === null && <p className="text-sm text-text-low">Loading…</p>}
      {entries?.length === 0 && (
        <p className="text-sm text-text-low">
          {query.trim()
            ? 'No entry matches your search.'
            : 'Nothing here yet — accepted answers show up here, and a moderator can approve them.'}
        </p>
      )}

      <ul className="space-y-3">
        {entries?.map((entry) => {
          const percent = Math.round(entry.confidence * 100)
          if (editing?.id === entry.id) {
            return (
              <li key={entry.id}>
                <form onSubmit={save} className="space-y-2 rounded-card-sm border border-gold/30 p-4">
                  <textarea
                    value={editing.question}
                    onChange={(e) => setEditing({ ...editing, question: e.target.value })}
                    rows={2}
                    aria-label="Question"
                    className={cn(field, 'resize-none')}
                  />
                  <textarea
                    value={editing.answer}
                    onChange={(e) => setEditing({ ...editing, answer: e.target.value })}
                    rows={4}
                    aria-label="Answer"
                    className={cn(field, 'resize-none')}
                  />
                  <p className="caption">Saving counts as your review.</p>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={busy || !editing.question.trim() || !editing.answer.trim()}
                      className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2 text-sm font-bold text-ink disabled:opacity-40"
                    >
                      Save
                    </button>
                    <button type="button" onClick={() => setEditing(null)} className={small}>
                      Cancel
                    </button>
                  </div>
                </form>
              </li>
            )
          }
          return (
            <li key={entry.id} className="rounded-card-sm border border-white/8 bg-ink-2/40 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="whitespace-pre-line text-sm font-semibold text-text-hi">{entry.question}</p>
                <span
                  className={cn(
                    'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                    entry.reviewed ? 'border-gold/40 text-gold-soft' : 'border-white/12 text-text-low',
                  )}
                >
                  {entry.reviewed ? 'Reviewed' : 'Unreviewed'}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-text-mid">{entry.answer}</p>

              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span
                  className="flex items-center gap-2 text-[11px] text-text-low"
                  title="From the discussion's own signal: who accepted the answer and how it was voted"
                >
                  Confidence
                  <span
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    className="h-1.5 w-20 overflow-hidden rounded-full bg-white/10"
                  >
                    <span className="block h-full bg-gold" style={{ width: `${percent}%` }} />
                  </span>
                  {percent}%
                </span>
                <button type="button" onClick={() => onOpenThread(entry.source_thread_id)} className={small}>
                  Open the discussion
                </button>
                {entry.can_review && (
                  <>
                    {!entry.reviewed && (
                      <button type="button" disabled={busy} onClick={() => void approve(entry)} className={small}>
                        <Check size={12} aria-hidden="true" /> Approve
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setEditing({ id: entry.id, question: entry.question, answer: entry.answer })}
                      className={small}
                    >
                      <Pencil size={12} aria-hidden="true" /> Edit
                    </button>
                    <button type="button" disabled={busy} onClick={() => remove(entry)} className={small}>
                      <Trash2 size={12} aria-hidden="true" /> Delete
                    </button>
                  </>
                )}
              </div>
              <p className="caption mt-2">From “{entry.source_thread_title}”</p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
