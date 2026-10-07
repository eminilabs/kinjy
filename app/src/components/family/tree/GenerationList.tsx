import { memo, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useAppTheme } from '@/components/appdemo/theme'
import type { FamilyTree } from '@/lib/api'
import { cn } from '@/lib/utils'
import StatusIcon from './Status'
import { GENDER_TINT, fullName, genderKey, generationLabel, initials, lifespan } from './layout'

type Node = FamilyTree['nodes'][number]

interface Section {
  id: string
  label: string
  nodes: Node[]
  /** Open on arrival: the three the product asks for (Parents, the person and partners, Children). */
  core: boolean
}

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
  const gender = genderKey(person.gender)
  const tint = GENDER_TINT[gender]
  return (
    <button
      type="button"
      data-person={person.id}
      data-gender={gender}
      data-level={node.level}
      onClick={() => onSelect(person.id)}
      aria-pressed={selected}
      aria-current={isRoot ? 'true' : undefined}
      className={cn(
        'relative flex min-h-14 w-full items-center gap-3 overflow-hidden rounded-card-md border px-3 py-2.5 text-start',
        tok.cardSolid,
        isRoot && 'border-gold/70',
        selected && 'ring-2 ring-gold/80',
        'hover:border-gold/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold/70',
      )}
    >
      {tint && (
        <>
          <span aria-hidden="true" className={cn('pointer-events-none absolute inset-0', tint.wash)} />
          <span aria-hidden="true" className={cn('pointer-events-none absolute inset-y-0 start-0 w-[3px]', tint.edge)} />
        </>
      )}
      {isRoot && <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gold/10" />}
      <span aria-hidden="true" className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold/15 text-sm font-semibold text-gold-soft">
        {initials(person)}
      </span>
      <span className="relative min-w-0 flex-1">
        <span className={cn('block truncate text-sm font-semibold', tok.text)}>{fullName(person)}</span>
        <span className={cn('block truncate text-xs', tok.low)}>
          {isMe ? 'You' : node.relation}
          {node.sibling_kind === 'half' ? ' · half' : ''}
          {life ? ` · ${life}` : ''}
          {node.more ? ' · more relatives' : ''}
        </span>
      </span>
      <StatusIcon status={person.status} className="relative" />
      <ChevronRight size={16} aria-hidden="true" className={cn('relative', tok.low)} />
    </button>
  )
})

/**
 * The same tree as expandable sections - Parents, the person with their partners,
 * Children, and the generations beyond - which is what a phone can hold.
 *
 * A drawing of a family is wide and a phone is not. This answers the same question (who
 * is above, who is below, who is beside) in a form that reads top to bottom at any
 * width, with every row a full-width touch target and each generation folded away
 * until it is wanted.
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
  const [opened, setOpened] = useState<Record<string, boolean>>({})

  const sections = useMemo<Section[]>(() => {
    const root = tree.nodes.find((n) => n.person.id === tree.root)
    const who = tree.me === tree.root ? 'Me' : (root?.person.given_name ?? 'This person')
    const ordered = (nodes: Node[]) =>
      [...nodes].sort((a, b) => a.closeness - b.closeness || fullName(a.person).localeCompare(fullName(b.person)))
    const byLevel = new Map<number, Node[]>()
    for (const node of tree.nodes) byLevel.set(node.level, [...(byLevel.get(node.level) ?? []), node])
    const out: Section[] = []
    for (const level of [...byLevel.keys()].sort((a, b) => b - a)) {
      const nodes = byLevel.get(level)!
      if (level === 0) {
        const self = nodes.filter((n) => n.person.id === tree.root || n.relation === 'spouse')
        const siblings = nodes.filter((n) => !self.includes(n) && n.sibling_kind)
        const rest = nodes.filter((n) => !self.includes(n) && !n.sibling_kind)
        out.push({ id: 'self', label: `${who} & partner${self.length > 2 ? 's' : '(s)'}`, nodes: ordered(self), core: true })
        if (siblings.length) out.push({ id: 'siblings', label: 'Brothers & sisters', nodes: ordered(siblings), core: false })
        if (rest.length) out.push({ id: 'same', label: 'Others on this generation', nodes: ordered(rest), core: false })
      } else {
        out.push({ id: `gen-${level}`, label: generationLabel(level), nodes: ordered(nodes), core: level === 1 || level === -1 })
      }
    }
    return out
  }, [tree])

  // A small family is shown whole; a larger one opens the three that matter and folds the rest.
  const small = tree.nodes.length <= 14
  const isOpen = (section: Section) => opened[section.id] ?? (small || section.core)

  return (
    <div className="space-y-3">
      {sections.map((section) => {
        const open = isOpen(section)
        return (
          <section key={section.id} data-generation={section.id}>
            <h3 className="m-0">
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`gen-panel-${section.id}`}
                onClick={() => setOpened((current) => ({ ...current, [section.id]: !open }))}
                className={cn('flex min-h-11 w-full items-center gap-2 rounded-card-md px-2 text-start text-xs font-semibold uppercase tracking-wide', tok.mid, tok.hoverBg)}
              >
                {open ? <ChevronDown size={15} aria-hidden="true" /> : <ChevronRight size={15} aria-hidden="true" />}
                {section.label}
                <span className={cn('font-normal normal-case tracking-normal', tok.low)}>{section.nodes.length}</span>
              </button>
            </h3>
            {open && (
              <ul id={`gen-panel-${section.id}`} className="mt-1.5 space-y-2">
                {section.nodes.map((node) => (
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
            )}
          </section>
        )
      })}
    </div>
  )
}
