import { memo, useMemo } from 'react'
import { ChevronRight } from 'lucide-react'
import { useAppTheme } from '@/components/appdemo/theme'
import type { FamilyTree } from '@/lib/api'
import { cn } from '@/lib/utils'
import StatusIcon from './Status'
import { fullName, generationLabel, initials, lifespan } from './layout'

type Node = FamilyTree['nodes'][number]

const Row = memo(function Row({
  node,
  selected,
  isRoot,
  isMe,
  onSelect,
}: {
  node: Node
  selected: boolean
  isRoot: boolean
  isMe: boolean
  onSelect: (id: string) => void
}) {
  const { tok } = useAppTheme()
  const { person } = node
  const life = lifespan(person)
  return (
    <button
      type="button"
      data-person={person.id}
      onClick={() => onSelect(person.id)}
      aria-pressed={selected}
      aria-current={isRoot ? 'true' : undefined}
      className={cn(
        'flex w-full items-center gap-3 rounded-card-md border px-3 py-2.5 text-start',
        tok.cardSolid,
        isRoot && 'border-gold/70 bg-gold/10',
        selected && 'ring-2 ring-gold/80',
        'hover:border-gold/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/70',
      )}
    >
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-sm font-semibold text-gold-soft"
      >
        {initials(person)}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block truncate text-sm font-semibold', tok.text)}>{fullName(person)}</span>
        <span className={cn('block truncate text-xs', tok.low)}>
          {isMe ? 'You' : node.relation}
          {node.sibling_kind === 'half' ? ' · half' : ''}
          {life ? ` · ${life}` : ''}
          {node.more ? ' · more relatives' : ''}
        </span>
      </span>
      <StatusIcon status={person.status} />
      <ChevronRight size={16} aria-hidden="true" className={tok.low} />
    </button>
  )
})

/**
 * The same tree as a list, one generation per section.
 *
 * A drawing of a family is wide, and a phone is not. This answers the same
 * question - who is above, who is below, who is beside - in a form that reads
 * top to bottom at any width, and every row is a full-width touch target.
 */
export default function GenerationList({
  tree,
  selectedId,
  onSelect,
}: {
  tree: FamilyTree
  selectedId: string | null
  onSelect: (personId: string) => void
}) {
  const { tok } = useAppTheme()
  const generations = useMemo(() => {
    const byLevel = new Map<number, Node[]>()
    for (const node of tree.nodes) byLevel.set(node.level, [...(byLevel.get(node.level) ?? []), node])
    return [...byLevel.entries()]
      .sort(([a], [b]) => b - a)
      .map(([level, nodes]) => ({
        level,
        nodes: [...nodes].sort(
          (a, b) => a.closeness - b.closeness || fullName(a.person).localeCompare(fullName(b.person)),
        ),
      }))
  }, [tree])

  return (
    <div className="space-y-5">
      {generations.map(({ level, nodes }) => (
        <section key={level} aria-labelledby={`gen-${level}`}>
          <h3 id={`gen-${level}`} className={cn('mb-2 flex items-baseline gap-2 text-xs font-semibold uppercase tracking-wide', tok.mid)}>
            {generationLabel(level)}
            <span className={cn('font-normal normal-case tracking-normal', tok.low)}>{nodes.length}</span>
          </h3>
          <ul className="space-y-2">
            {nodes.map((node) => (
              <li key={node.person.id}>
                <Row
                  node={node}
                  selected={node.person.id === selectedId}
                  isRoot={node.person.id === tree.root}
                  isMe={node.person.id === tree.me}
                  onSelect={onSelect}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
