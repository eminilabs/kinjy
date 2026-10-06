import type { FamilyTree, Person } from '@/lib/api'

type Node = FamilyTree['nodes'][number]

export const CARD_W = 148
export const CARD_H = 58
export const GAP_X = 16
export const GAP_Y = 70
const PAD = 24

export interface Placed {
  id: string
  x: number
  y: number
  row: number
  node: Node
}

export interface PlacedEdge {
  id: string
  kind: string
  /** SVG path between the two cards. */
  d: string
  from: string
  to: string
}

export interface Layout {
  placed: Placed[]
  edges: PlacedEdge[]
  width: number
  height: number
}

export const fullName = (p: Pick<Person, 'given_name' | 'family_name'>): string =>
  `${p.given_name} ${p.family_name ?? ''}`.trim()

export const initials = (p: Pick<Person, 'given_name' | 'family_name'>): string =>
  [p.given_name, p.family_name]
    .filter(Boolean)
    .map((part) => (part as string).trim().charAt(0).toUpperCase())
    .join('')
    .slice(0, 2)

const year = (iso?: string | null): string | null => (iso ? iso.slice(0, 4) : null)

/** "1935 – 2010", "b. 1962", "d. 2001", or nothing when no date is known. */
export function lifespan(p: Pick<Person, 'birth_date' | 'death_date' | 'deceased'>): string {
  const born = year(p.birth_date)
  const died = year(p.death_date)
  if (born && died) return `${born} – ${died}`
  if (born) return p.deceased ? `${born} – ?` : `b. ${born}`
  if (died) return `d. ${died}`
  return ''
}

/** What to call a row of the tree, by how many generations it is from the person in the middle. */
export function generationLabel(level: number): string {
  if (level === 0) return 'Same generation'
  if (level === 1) return 'Parents'
  if (level === 2) return 'Grandparents'
  if (level === 3) return 'Great-grandparents'
  if (level > 3) return `${level - 2} generations above grandparents`
  if (level === -1) return 'Children'
  if (level === -2) return 'Grandchildren'
  if (level === -3) return 'Great-grandchildren'
  return `${-level - 2} generations below grandchildren`
}

/** How a status reads, in plain words. */
export const STATUS_LABEL: Record<string, string> = {
  verified: 'Confirmed by close relatives',
  pending: 'Waiting for confirmation',
  disputed: 'Disputed',
}

/**
 * Where each person goes on the page.
 *
 * Generations are rows (ancestors on top), and the order inside a row is worked
 * out from the row above so that children sit under their parents and a couple
 * sits side by side. It is deterministic - the same family always draws the same
 * way, which is what lets people learn where a relative is - and costs one pass
 * over the nodes, so a re-render after selecting someone does not redo it (the
 * caller memoises on the tree).
 */
export function layoutTree(tree: FamilyTree): Layout {
  const rows = new Map<number, Node[]>()
  for (const node of tree.nodes) rows.set(node.level, [...(rows.get(node.level) ?? []), node])
  const levels = [...rows.keys()].sort((a, b) => b - a)

  const spouse = new Map<string, Set<string>>()
  const parentsOf = new Map<string, string[]>()
  for (const edge of tree.edges) {
    if (edge.kind === 'spouse_of') {
      spouse.set(edge.from, (spouse.get(edge.from) ?? new Set()).add(edge.to))
      spouse.set(edge.to, (spouse.get(edge.to) ?? new Set()).add(edge.from))
    } else if (edge.kind !== 'sibling_of') {
      parentsOf.set(edge.to, [...(parentsOf.get(edge.to) ?? []), edge.from])
    }
  }

  const order = new Map<string, number>() // person id -> index in its row
  const ordered: Node[][] = []
  for (const level of levels) {
    const row = [...(rows.get(level) ?? [])]
    const weight = (node: Node): number => {
      const parents = parentsOf.get(node.person.id) ?? []
      const known = parents.map((id) => order.get(id)).filter((n): n is number => n !== undefined)
      return known.length ? known.reduce((a, b) => a + b, 0) / known.length : Number.POSITIVE_INFINITY
    }
    row.sort(
      (a, b) =>
        weight(a) - weight(b) ||
        a.closeness - b.closeness ||
        fullName(a.person).localeCompare(fullName(b.person)),
    )
    // A couple side by side: after each person, the partner who is in this row.
    const placedIds = new Set<string>()
    const grouped: Node[] = []
    for (const node of row) {
      if (placedIds.has(node.person.id)) continue
      grouped.push(node)
      placedIds.add(node.person.id)
      for (const partnerId of spouse.get(node.person.id) ?? []) {
        const partner = row.find((n) => n.person.id === partnerId)
        if (partner && !placedIds.has(partnerId)) {
          grouped.push(partner)
          placedIds.add(partnerId)
        }
      }
    }
    grouped.forEach((node, index) => order.set(node.person.id, index))
    ordered.push(grouped)
  }

  const widest = Math.max(...ordered.map((row) => row.length), 1)
  const width = widest * (CARD_W + GAP_X) - GAP_X + PAD * 2
  const placed: Placed[] = []
  ordered.forEach((row, rowIndex) => {
    const rowWidth = row.length * (CARD_W + GAP_X) - GAP_X
    const startX = (width - rowWidth) / 2
    row.forEach((node, index) => {
      placed.push({
        id: node.person.id,
        x: startX + index * (CARD_W + GAP_X),
        y: PAD + rowIndex * (CARD_H + GAP_Y),
        row: rowIndex,
        node,
      })
    })
  })
  const height = ordered.length * (CARD_H + GAP_Y) - GAP_Y + PAD * 2

  const at = new Map(placed.map((p) => [p.id, p]))
  const edges: PlacedEdge[] = []
  for (const edge of tree.edges) {
    const a = at.get(edge.from)
    const b = at.get(edge.to)
    if (!a || !b) continue
    let d: string
    if (edge.kind === 'spouse_of' || edge.kind === 'sibling_of') {
      // Same row: a straight line between the facing sides, or across the gap.
      const [left, right] = a.x <= b.x ? [a, b] : [b, a]
      const y = left.y + CARD_H / 2
      d =
        left.row === right.row
          ? `M ${left.x + CARD_W} ${y} L ${right.x} ${y}`
          : `M ${left.x + CARD_W / 2} ${left.y + CARD_H} L ${right.x + CARD_W / 2} ${right.y}`
    } else {
      // Parent above, child below: from the parent's bottom edge to the child's top edge.
      const [top, bottom] = a.y <= b.y ? [a, b] : [b, a]
      const x1 = top.x + CARD_W / 2
      const y1 = top.y + CARD_H
      const x2 = bottom.x + CARD_W / 2
      const y2 = bottom.y
      const mid = (y1 + y2) / 2
      d = `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`
    }
    edges.push({ id: edge.id, kind: edge.kind, d, from: edge.from, to: edge.to })
  }

  return { placed, edges, width, height }
}
