import { useCallback, useEffect, useState } from 'react'
import { ChevronRight, Globe2, Landmark, Lock } from 'lucide-react'
import { ApiError, kaluta, type Forum } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Props {
  roots: Forum[]
  selectedId: string | null
  onSelect: (forum: Forum) => void
  /** Bump `n` to reload and expand the children of `id` (after adding a sub-forum). */
  refresh: { id: string; n: number } | null
  onError: (message: string) => void
  /** Extra tags for a top-level row (the grouped Forums page names the community there). */
  renderMeta?: (forum: Forum) => React.ReactNode
}

export default function ForumTree({ roots, selectedId, onSelect, refresh, onError, renderMeta }: Props) {
  // Children are fetched on first expand and cached, so a deep tree costs one
  // request per branch the reader actually opens.
  const [children, setChildren] = useState<Record<string, Forum[]>>({})
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const loadChildren = useCallback(
    async (id: string) => {
      try {
        const result = await kaluta.forums.list({ parent_id: id })
        setChildren((prev) => ({ ...prev, [id]: result.items }))
      } catch (err) {
        onError(err instanceof ApiError ? err.message : 'Could not load sub-forums')
      }
    },
    [onError],
  )

  const toggle = (id: string) => {
    const next = new Set(expanded)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
      if (!children[id]) void loadChildren(id)
    }
    setExpanded(next)
  }

  useEffect(() => {
    if (!refresh) return
    setExpanded((prev) => new Set(prev).add(refresh.id))
    void loadChildren(refresh.id)
  }, [refresh, loadChildren])

  const renderNode = (forum: Forum, depth: number) => {
    const isOpen = expanded.has(forum.id)
    const kids = children[forum.id]
    return (
      <li key={forum.id}>
        <div className="flex items-stretch gap-1" style={{ paddingInlineStart: depth * 14 }}>
          <button
            type="button"
            onClick={() => toggle(forum.id)}
            aria-label={isOpen ? `Collapse ${forum.name}` : `Expand ${forum.name}`}
            aria-expanded={isOpen}
            className="shrink-0 rounded-card-sm px-1 text-text-low hover:text-text-hi"
          >
            <ChevronRight size={14} className={cn('transition-transform', isOpen && 'rotate-90')} />
          </button>
          <button
            type="button"
            onClick={() => onSelect(forum)}
            className={cn(
              'flex min-w-0 flex-1 items-center gap-2.5 rounded-card-sm border p-3 text-start',
              selectedId === forum.id
                ? 'border-gold/40 bg-gold/5'
                : 'border-white/8 bg-ink-2/40 hover:border-white/15',
            )}
          >
            <Landmark size={14} className="shrink-0 text-text-low" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block truncate text-sm text-text-hi">{forum.name}</span>
              <span className="caption">
                {forum.threads_count} thread{forum.threads_count === 1 ? '' : 's'}
                {forum.scope && ` · ${forum.scope}`}
              </span>
              {depth === 0 && renderMeta?.(forum)}
              {(forum.community_id || (forum.parent_id && !forum.inherit_access)) && (
                <span className="mt-1 flex flex-wrap gap-1">
                  {forum.community_id && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-text-mid">
                      <Lock size={9} aria-hidden="true" />
                      Community
                    </span>
                  )}
                  {forum.parent_id && !forum.inherit_access && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-gold/40 px-2 py-0.5 text-[10px] text-gold-soft">
                      <Globe2 size={9} aria-hidden="true" />
                      Open to everyone
                    </span>
                  )}
                </span>
              )}
            </span>
          </button>
        </div>
        {isOpen && (
          <ul className="mt-1.5 space-y-1.5">
            {!kids && (
              <li className="caption" style={{ paddingInlineStart: (depth + 1) * 14 + 22 }}>
                Loading…
              </li>
            )}
            {kids && kids.length === 0 && (
              <li className="caption" style={{ paddingInlineStart: (depth + 1) * 14 + 22 }}>
                No sub-forums.
              </li>
            )}
            {kids?.map((child) => renderNode(child, depth + 1))}
          </ul>
        )}
      </li>
    )
  }

  return (
    <ul className="space-y-1.5">
      {roots.length === 0 && <li className="text-sm text-text-low">No forums yet.</li>}
      {roots.map((forum) => renderNode(forum, 0))}
    </ul>
  )
}
