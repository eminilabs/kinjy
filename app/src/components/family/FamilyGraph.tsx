import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { FamilyTree, Person } from '@/lib/api'

const NODE_W = 152
const NODE_H = 58
const GAP_X = 26
const GAP_Y = 80

interface Placed {
  id: string
  x: number
  y: number
  level: number
  relation: string
  person: Person
  siblingKind?: string | null
}

function fullName(p: Person): string {
  return `${p.given_name} ${p.family_name ?? ''}`.trim()
}

/**
 * The tree as /family describes it: **Level 0 is you, parents above, children
 * below**, indefinite depth, and the edges drawn.
 *
 * The screen this replaces listed each level as a row of buttons — a table of
 * the graph rather than a view of it. You could read who sat at level 2 and
 * still not know who descended from whom, which is the one thing a family tree
 * exists to show.
 *
 * Layout is deterministic (level → row, index → column) rather than a force
 * simulation. A tree that rearranges itself on every load cannot be learned,
 * and people navigate these by remembering where a relative sits.
 */
export default function FamilyGraph({
  tree,
  rootId,
  highlight,
  onSelect,
  onReRoot,
  selectedId,
}: {
  tree: FamilyTree
  rootId: string
  /** Person ids on the "how are we related?" path — drawn lit. */
  highlight?: string[]
  onSelect: (personId: string) => void
  onReRoot: (personId: string) => void
  selectedId?: string | null
}) {
  const lit = useMemo(() => new Set(highlight ?? []), [highlight])

  const { placed, width, height, byId } = useMemo(() => {
    const levels = [...new Set(tree.nodes.map((n) => n.level))].sort((a, b) => b - a)
    const rows = new Map<number, typeof tree.nodes>()
    for (const node of tree.nodes) {
      rows.set(node.level, [...(rows.get(node.level) ?? []), node])
    }

    const widest = Math.max(...[...rows.values()].map((r) => r.length), 1)
    const width = Math.max(widest * (NODE_W + GAP_X) + GAP_X, 520)

    const placed: Placed[] = []
    levels.forEach((level, rowIndex) => {
      const row = rows.get(level) ?? []
      const rowWidth = row.length * NODE_W + (row.length - 1) * GAP_X
      const startX = (width - rowWidth) / 2
      row.forEach((node, i) => {
        placed.push({
          id: node.person.id,
          x: startX + i * (NODE_W + GAP_X),
          y: rowIndex * (NODE_H + GAP_Y) + GAP_Y / 2,
          level: node.level,
          relation: node.relation,
          person: node.person,
          siblingKind: node.sibling_kind,
        })
      })
    })

    return {
      placed,
      byId: new Map(placed.map((p) => [p.id, p])),
      width,
      height: levels.length * (NODE_H + GAP_Y) + GAP_Y / 2,
    }
  }, [tree])

  return (
    <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Family tree"
        className="min-w-full"
      >
        {tree.edges.map((edge) => {
          const a = byId.get(edge.from)
          const b = byId.get(edge.to)
          if (!a || !b) return null
          const onPath = lit.has(edge.from) && lit.has(edge.to)
          const spouse = edge.kind === 'spouse_of'
          const x1 = a.x + NODE_W / 2
          const y1 = a.y + NODE_H / 2
          const x2 = b.x + NODE_W / 2
          const y2 = b.y + NODE_H / 2
          const mid = (y1 + y2) / 2
          const d = spouse
            ? `M ${x1} ${y1} L ${x2} ${y2}`
            : `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`
          return (
            <path
              key={edge.id}
              d={d}
              fill="none"
              stroke="currentColor"
              strokeWidth={onPath ? 2.5 : 1.4}
              // A proposed edge is dashed: an unconfirmed link must not look
              // like a settled fact.
              strokeDasharray={edge.status === 'proposed' ? '4 4' : undefined}
              className={cn(
                'transition-colors duration-500',
                onPath ? 'text-gold' : spouse ? 'text-sky/50' : 'text-text-low/40',
              )}
            />
          )
        })}

        {/* The corroboration state, on the link itself.
            /family promises "nothing enters the tree unverified", and a claim
            like that has to be visible where the claim is made — on the edge
            between two people, not summarised elsewhere. */}
        {tree.edges.map((edge) => {
          const a = byId.get(edge.from)
          const b = byId.get(edge.to)
          if (!a || !b || edge.kind === 'spouse_of') return null
          const verified = edge.status === 'verified'
          const x = (a.x + b.x) / 2 + NODE_W / 2
          const y = (a.y + b.y) / 2 + NODE_H / 2
          return (
            <g key={`chip-${edge.id}`} transform={`translate(${x}, ${y})`}>
              <rect
                x={-27}
                y={-8}
                width={54}
                height={15}
                rx={7.5}
                className={verified
                  ? 'fill-success/15 stroke-success/50'
                  : 'fill-warning/15 stroke-warning/50'}
                strokeWidth={0.8}
              />
              <text
                textAnchor="middle"
                dy={3.5}
                className={cn('mono-data', verified ? 'fill-success' : 'fill-warning')}
                style={{ fontSize: 7.5, fontWeight: 600 }}
              >
                {verified ? 'VERIFIED' : 'PENDING'}
              </text>
            </g>
          )
        })}

        {placed.map((node) => {
          const isRoot = node.id === rootId
          const isLit = lit.has(node.id)
          const isSelected = node.id === selectedId
          const verified = node.person.status === 'verified'
          const disputed = node.person.status === 'disputed'
          return (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              className="cursor-pointer"
              onClick={() => onSelect(node.id)}
              onDoubleClick={() => onReRoot(node.id)}
              role="button"
              tabIndex={0}
              aria-label={`${fullName(node.person)}, ${node.relation}. Enter to open, space to centre the tree here.`}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onSelect(node.id)
                if (event.key === ' ') {
                  event.preventDefault()
                  onReRoot(node.id)
                }
              }}
            >
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={10}
                className={cn(
                  'transition-all duration-300',
                  isRoot
                    ? 'fill-gold/15 stroke-gold/70'
                    : isLit
                      ? 'fill-gold/10 stroke-gold/45'
                      : 'fill-ink-2/85 stroke-text-low/30',
                )}
                strokeWidth={isSelected ? 2.5 : 1.2}
              />
              {/* Deceased carry a quiet edge marker rather than a different
                  shape — the graveyard is its own module, and a tree that
                  visually segregates the dead reads badly. */}
              {node.person.deceased && (
                <rect width={3} height={NODE_H} rx={2} className="fill-text-low/60" />
              )}
              <text x={12} y={23} className="fill-text-hi text-[12.5px] font-semibold">
                {fullName(node.person).slice(0, 17)}
              </text>
              <text x={12} y={41} className="fill-text-low text-[10.5px]">
                {node.relation}
                {node.siblingKind === 'half' ? ' · half' : ''}
              </text>
              {(verified || disputed) && (
                <circle
                  cx={NODE_W - 14}
                  cy={14}
                  r={4.5}
                  className={verified ? 'fill-success' : 'fill-warning'}
                />
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
