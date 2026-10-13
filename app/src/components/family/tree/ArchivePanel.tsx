import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { useAppTheme } from '@/components/appdemo/theme'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta } from '@/lib/api'
import { cn } from '@/lib/utils'

const day = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * What the family has written down about this person, and their life in order. Plain text only:
 * a memory is shown as text and can be removed by its author or an owner. Nothing here is generated:
 * every line was written by a member, and the dates of birth and death come from the person's record.
 */
export default function ArchivePanel({ personId, name, canAdd }: { personId: string; name: string; canAdd: boolean }) {
  const { tok } = useAppTheme()
  const archive = useApi(() => kaluta.family.archive(personId), [personId])
  const timeline = useApi(() => kaluta.family.timeline(personId), [personId])
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [story, setStory] = useState('')
  const [when, setWhen] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (action: () => Promise<unknown>, after?: () => void) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      after?.()
      archive.reload()
      timeline.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not work. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const memories = archive.data?.items.filter((i) => i.kind === 'story') ?? []
  const events = timeline.data?.entries ?? []
  if (!canAdd && memories.length === 0 && events.length === 0) return null
  const field = cn('w-full rounded-card-sm px-3 py-2 text-sm focus:border-gold/50 focus:outline-none', tok.input, tok.text)

  return (
    <section className="mt-5 border-t border-white/10 pt-4" aria-labelledby="archive-title">
      <h3 id="archive-title" className={cn('mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide', tok.mid)}>
        <BookOpen size={13} aria-hidden="true" /> Life and memories of {name}
      </h3>
      {events.length > 0 && (
        <ol className={cn('mb-3 space-y-1 text-xs', tok.mid)} aria-label="Timeline">
          {events.map((e, i) => (
            <li key={`${e.date}-${i}`}>
              <span className={cn('font-semibold', tok.text)}>{day(e.date)}</span> · {e.label}
            </li>
          ))}
        </ol>
      )}
      <ul className="space-y-3">
        {memories.map((m) => (
          <li key={m.id} className={cn('rounded-card-sm p-3 text-sm', tok.subtleBg)}>
            <p className={cn('font-semibold', tok.text)}>{m.title}</p>
            {m.happened_on && <p className={cn('text-xs', tok.low)}>{day(m.happened_on)}</p>}
            <p className={cn('mt-1 whitespace-pre-wrap break-words', tok.mid)}>{m.story}</p>
            {m.can_delete && (
              <button type="button" disabled={busy} onClick={() => run(() => kaluta.family.deleteMemory(m.id))} className={cn('mt-1 min-h-9 text-xs underline underline-offset-2', tok.low)}>
                Remove this memory
              </button>
            )}
          </li>
        ))}
        {archive.data && memories.length === 0 && <li className={cn('text-xs', tok.low)}>No memory has been written down yet.</li>}
      </ul>
      {error && <p className="mt-2 text-xs text-red-300" role="alert">{error}</p>}
      {canAdd &&
        (adding ? (
          <form
            className="mt-3 space-y-2"
            onSubmit={(e) => {
              e.preventDefault()
              void run(() => kaluta.family.addMemory(personId, { title: title.trim(), story: story.trim(), happened_on: when || undefined }), () => {
                setAdding(false)
                setTitle('')
                setStory('')
                setWhen('')
              })
            }}
          >
            <input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="A title" aria-label="Title of the memory" className={field} />
            <textarea required maxLength={10000} rows={5} value={story} onChange={(e) => setStory(e.target.value)} placeholder={`What do you remember about ${name}? Write only what you know.`} aria-label="The memory" className={field} />
            <label className={cn('block text-xs', tok.mid)}>
              When it happened (optional)
              <input type="date" max={new Date().toISOString().slice(0, 10)} value={when} onChange={(e) => setWhen(e.target.value)} className={cn('ml-2 rounded-card-sm px-2 py-1 text-xs', tok.input, tok.text)} />
            </label>
            <p className={cn('text-xs', tok.low)}>Everyone who can read this tree can read this memory. Do not write about living people what they would not want shared.</p>
            <div className="flex gap-2">
              <button type="submit" disabled={busy || !title.trim() || !story.trim()} className={cn('min-h-9 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold disabled:opacity-60', tok.text, tok.hoverBg)}>
                Save the memory
              </button>
              <button type="button" onClick={() => setAdding(false)} className={cn('min-h-9 px-2 text-xs underline underline-offset-2', tok.mid)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setAdding(true)} className={cn('mt-3 min-h-9 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold', tok.text, tok.hoverBg)}>
            Write a memory
          </button>
        ))}
    </section>
  )
}
