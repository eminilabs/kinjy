import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { ChevronsUpDown } from 'lucide-react'
import { useAppTheme } from '@/components/appdemo/theme'
import type { FamilyTree } from '@/lib/api'
import { cn } from '@/lib/utils'
import StatusIcon from './Status'
import { CARD_H, CARD_W, fullName, layoutTree, lifespan, type Placed } from './layout'

interface NodeProps {
  placed: Placed
  rootId: string
  selected: boolean
  lit: boolean
  isMe: boolean
  onSelect: (id: string) => void
  onCentre: (id: string) => void
}

/**
 * One person. Memoised on primitives, so choosing someone re-renders the two
 * cards whose state changed rather than every card in the tree.
 */
const TreeNode = memo(function TreeNode({ placed, rootId, selected, lit, isMe, onSelect, onCentre }: NodeProps) {
  const { tok } = useAppTheme()
  const { person, relation, more, sibling_kind } = placed.node
  const isRoot = placed.id === rootId
  const life = lifespan(person)
  const spoken = [
    fullName(person),
    isMe ? 'you' : relation,
    life || null,
    person.status === 'verified' ? 'confirmed' : person.status === 'disputed' ? 'disputed' : 'not yet confirmed',
    more ? 'has more relatives beyond this view' : null,
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <button
      type="button"
      data-person={placed.id}
      data-row={placed.row}
      aria-label={`${spoken}. Press Enter for details, or double-click to centre the tree here.`}
      aria-current={isRoot ? 'true' : undefined}
      aria-pressed={selected}
      title={fullName(person)}
      onClick={() => onSelect(placed.id)}
      onDoubleClick={() => onCentre(placed.id)}
      style={{ left: placed.x, top: placed.y, width: CARD_W, height: CARD_H }}
      className={cn(
        'absolute flex flex-col justify-center rounded-card-md border px-3 text-start',
        tok.cardSolid,
        isRoot && 'border-gold/70 bg-gold/10',
        lit && !isRoot && 'border-gold/50',
        selected && 'ring-2 ring-gold/80',
        'hover:border-gold/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/70',
      )}
    >
      <span className={cn('truncate pe-5 text-[0.8rem] font-semibold leading-tight', tok.text)}>
        {fullName(person)}
      </span>
      <span className={cn('truncate text-[0.68rem] leading-tight', tok.low)}>
        {isMe ? 'You' : relation}
        {sibling_kind === 'half' ? ' · half' : ''}
        {life ? ` · ${life}` : ''}
      </span>
      <StatusIcon status={person.status} size={13} className="absolute end-2 top-1.5" />
      {more && (
        <span
          className="absolute -bottom-2 start-1/2 -translate-x-1/2 rounded-full border border-gold/40 bg-ink-2 p-0.5 text-gold-soft"
          aria-hidden="true"
        >
          <ChevronsUpDown size={11} />
        </span>
      )}
    </button>
  )
})

/**
 * The whole tree as a picture: generations in rows, the person in the middle
 * highlighted, lines for who descended from whom.
 *
 * Cards are real buttons (focusable, named, laid out by CSS), with the lines
 * drawn on a layer behind them, so the tree is operable from the keyboard and
 * readable by a screen reader rather than being a drawing of text. The layout is
 * computed once per tree; selecting someone does not recompute it.
 */
export default function TreeCanvas({
  tree,
  selectedId,
  highlight,
  onSelect,
  onCentre,
}: {
  tree: FamilyTree
  selectedId: string | null
  /** People on a "how are we related?" path, drawn lit. */
  highlight?: string[]
  onSelect: (personId: string) => void
  onCentre: (personId: string) => void
}) {
  const layout = useMemo(() => layoutTree(tree), [tree])
  const lit = useMemo(() => new Set(highlight ?? []), [highlight])
  const scroller = useRef<HTMLDivElement>(null)

  // Bring the person in the middle into view whenever a different tree arrives.
  useEffect(() => {
    const el = scroller.current
    const root = layout.placed.find((p) => p.id === tree.root)
    if (!el || !root) return
    el.scrollLeft = Math.max(0, root.x + CARD_W / 2 - el.clientWidth / 2)
    el.scrollTop = Math.max(0, root.y + CARD_H / 2 - el.clientHeight / 2)
  }, [layout, tree.root])

  // Reading order is top to bottom, left to right, whatever order the server sent.
  const reading = useMemo(
    () => [...layout.placed].sort((a, b) => a.row - b.row || a.x - b.x),
    [layout],
  )

  const move = useCallback(
    (event: React.KeyboardEvent) => {
      const current = (event.target as HTMLElement).closest<HTMLElement>('[data-person]')?.dataset.person
      const here = layout.placed.find((p) => p.id === current)
      if (!here) return
      const sameRow = reading.filter((p) => p.row === here.row)
      let next: Placed | undefined
      if (event.key === 'ArrowRight') next = sameRow[sameRow.indexOf(here) + 1]
      else if (event.key === 'ArrowLeft') next = sameRow[sameRow.indexOf(here) - 1]
      else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        const row = reading.filter((p) => p.row === here.row + (event.key === 'ArrowDown' ? 1 : -1))
        next = [...row].sort((a, b) => Math.abs(a.x - here.x) - Math.abs(b.x - here.x))[0]
      } else return
      if (!next) return
      event.preventDefault()
      scroller.current?.querySelector<HTMLElement>(`[data-person="${next.id}"]`)?.focus()
    },
    [layout, reading],
  )

  return (
    <div
      ref={scroller}
      onKeyDown={move}
      className="max-h-[70vh] min-h-[320px] overflow-auto rounded-card-md border border-white/8"
    >
      <div className="relative mx-auto" style={{ width: layout.width, height: layout.height }} role="group" aria-label="Family tree">
        <svg width={layout.width} height={layout.height} className="pointer-events-none absolute inset-0" aria-hidden="true">
          {layout.edges.map((edge) => {
            const onPath = lit.has(edge.from) && lit.has(edge.to)
            const soft = edge.kind === 'adoptive_parent_of' || edge.kind === 'guardian_of' || edge.kind === 'sibling_of'
            return (
              <path
                key={edge.id}
                d={edge.d}
                fill="none"
                stroke="currentColor"
                strokeWidth={onPath ? 2.5 : 1.4}
                strokeDasharray={soft ? '5 4' : undefined}
                className={onPath ? 'text-gold' : edge.kind === 'spouse_of' ? 'text-sky/60' : 'text-text-low/50'}
              />
            )
          })}
        </svg>
        {reading.map((placed) => (
          <TreeNode
            key={placed.id}
            placed={placed}
            rootId={tree.root}
            selected={placed.id === selectedId}
            lit={lit.has(placed.id)}
            isMe={placed.id === tree.me}
            onSelect={onSelect}
            onCentre={onCentre}
          />
        ))}
      </div>
    </div>
  )
}
