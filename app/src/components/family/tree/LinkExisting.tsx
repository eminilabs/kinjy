import { useId, useState } from 'react'
import { useAppTheme } from '@/components/appdemo/theme'
import type { Person, RelativeKind } from '@/lib/api'
import { cn } from '@/lib/utils'
import FamilyFinder from './FamilyFinder'
import { fullName } from './layout'

/** How the person you pick stands to the one you are linking them to. */
const LINK_RELATIONS: Array<{ id: RelativeKind; label: string }> = [
  { id: 'parent', label: 'is a parent of' },
  { id: 'adoptive_parent', label: 'is an adoptive parent of' },
  { id: 'child', label: 'is a child of' },
  { id: 'spouse', label: 'is a partner of' },
  { id: 'sibling', label: 'is a sibling of (parents unknown)' },
]

/**
 * Link two people who are already in the tree: pick the other person, say how they
 * stand to this one, and let the server decide whether that can be true.
 */
export default function LinkExisting({
  anchorId,
  anchorName,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  anchorId: string
  anchorName: string
  busy: boolean
  error: string | null
  onSubmit: (relation: RelativeKind, other: Person) => void
  onCancel: () => void
}) {
  const { tok } = useAppTheme()
  const [other, setOther] = useState<Person | null>(null)
  const [relation, setRelation] = useState<RelativeKind>('parent')
  const selectId = useId()

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (other) onSubmit(relation, other)
      }}
      className="space-y-3"
    >
      <div>
        <p className={cn('mb-1 text-xs font-semibold', tok.mid)}>Who is already in the tree?</p>
        {other ? (
          <p className={cn('flex items-center justify-between gap-2 rounded-card-sm px-3 py-2 text-sm', tok.input, tok.text)}>
            <span className="truncate font-semibold">{fullName(other)}</span>
            <button type="button" onClick={() => setOther(null)} className="inline-flex min-h-9 shrink-0 items-center px-2 text-xs text-gold-soft underline underline-offset-2">
              Change
            </button>
          </p>
        ) : (
          <FamilyFinder onPick={setOther} exclude={anchorId} placeholder="Search by name" label="Search for the person to link" />
        )}
      </div>
      <div>
        <label htmlFor={selectId} className={cn('mb-1 block text-xs font-semibold', tok.mid)}>
          {other ? fullName(other) : 'They'} …
        </label>
        <select id={selectId} value={relation} onChange={(e) => setRelation(e.target.value as RelativeKind)} className={cn('w-full rounded-card-sm px-3 py-2 text-sm focus:border-gold/50 focus:outline-none', tok.input, tok.text)}>
          {LINK_RELATIONS.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label} {anchorName}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-200">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={busy || !other} className="rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2 text-sm font-bold text-ink disabled:opacity-40">
          {busy ? 'Linking…' : 'Link them'}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={cn('rounded-full border border-white/15 px-5 py-2 text-sm font-semibold disabled:opacity-40', tok.mid, tok.hoverBg)}>
          Cancel
        </button>
      </div>
    </form>
  )
}
