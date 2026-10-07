import { useState } from 'react'
import { FolderPlus } from 'lucide-react'
import { ApiError, kaluta, type Forum } from '@/lib/api'

const field =
  'w-full rounded-card-sm border border-white/10 bg-ink-2/60 px-3 py-2 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none'

interface Props {
  parent: Forum
  onCreated: (parentId: string) => void
  /** Collapse the form: called after a successful add and on Cancel. */
  onClose: () => void
  /** Only owners and moderators may open a sub-forum to everyone; the server refuses members. */
  canOpenToAll: boolean
}

export default function SubForumForm({ parent, onCreated, onClose, canOpenToAll }: Props) {
  const [name, setName] = useState('')
  const [openToAll, setOpenToAll] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      await kaluta.forums.create({
        name: name.trim(),
        parent_id: parent.id,
        // Only sent as false: the default is to follow the parent's door.
        ...(parent.community_id && canOpenToAll && openToAll ? { inherit_access: false } : {}),
      })
      setName('')
      setOpenToAll(false)
      onCreated(parent.id)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add the sub-forum')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="cloud-card p-5">
      <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-text-hi">
        <FolderPlus size={15} className="text-gold" aria-hidden="true" />
        Add a sub-forum
      </h2>
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`Inside ${parent.name}`}
          aria-label="Sub-forum name"
          className={field}
        />
        <button
          type="submit"
          disabled={!name.trim() || busy}
          className="shrink-0 rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2 text-sm font-bold text-ink disabled:opacity-40"
        >
          Add
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="shrink-0 rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-text-mid hover:text-text-hi disabled:opacity-40"
        >
          Cancel
        </button>
      </div>
      {parent.community_id && (
        <>
          <p className="caption mt-2">By default a sub-forum keeps its parent's access.</p>
          {canOpenToAll && (
          <label className="mt-2 flex items-center gap-2 text-sm text-text-mid">
            <input
              type="checkbox"
              checked={openToAll}
              onChange={(e) => setOpenToAll(e.target.checked)}
              className="accent-gold"
            />
            Open to everyone (ignore the parent's access)
          </label>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-200">
          {error}
        </p>
      )}
    </form>
  )
}
