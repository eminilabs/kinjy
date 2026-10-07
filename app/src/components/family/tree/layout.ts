import type { FamilyTree, Person } from '@/lib/api'
import { arrange, CARD_H, CARD_W, ROW_GAP } from './arrange'

type Node = FamilyTree['nodes'][number]

export { CARD_W, CARD_H, GAP, COUPLE_GAP, ROW_GAP } from './arrange'
const PAD = 28

export interface Placed {
  id: string
  x: number
  y: number
  row: number
  node: Node
}

/** One drawn line. `parents` and `children` say which people it joins, so the "how are we related" path can light it. */
export interface Connector {
  id: string
  kind: 'stem' | 'drop' | 'partner' | 'sibling'
  d: string
  dashed: boolean
  parents: string[]
  children: string[]
  /** For partner and sibling lines: the two ends. */
  ends?: [string, string]
}

export interface Layout {
  placed: Placed[]
  connectors: Connector[]
  /** Where two parents are joined: a small dot on the line between them. */
  junctions: Array<{ id: string; x: number; y: number }>
  /** Parent sets (joined with `|`) whose children stand in another family's tree, so their bar runs longer. */
  crossLinked: string[]
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

export type GenderKey = 'female' | 'male' | 'other' | 'unspecified'

const FEMALE = new Set(['female', 'f', 'woman', 'femme', 'femelle'])
const MALE = new Set(['male', 'm', 'man', 'homme', 'mâle'])

/**
 * Which tint a card gets. The gender is the person's own, as they gave it (a free
 * text field on the server); anything not recognised is "other" and anything
 * missing is "unspecified" - both drawn plainly. It says nothing about the role
 * someone has in a relationship: that is stored on the link.
 */
export function genderKey(gender?: string | null): GenderKey {
  const value = (gender ?? '').trim().toLowerCase()
  if (!value) return 'unspecified'
  if (FEMALE.has(value)) return 'female'
  if (MALE.has(value)) return 'male'
  return 'other'
}

/** Muted tones from the palette, applied as a thin edge and a faint wash; none for "not given". */
export const GENDER_TINT: Partial<Record<GenderKey, { edge: string; wash: string }>> = {
  female: { edge: 'bg-coral/60', wash: 'bg-coral/[0.045]' },
  male: { edge: 'bg-indigo/60', wash: 'bg-indigo/[0.045]' },
}

export const GENDER_LABEL: Record<GenderKey, string> = {
  female: 'woman',
  male: 'man',
  other: 'another gender',
  unspecified: 'gender not given',
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

const FILIATION = new Set(['parent_of', 'adoptive_parent_of', 'guardian_of'])

/**
 * Where each person goes on the page, and the lines that join them.
 *
 * The picture is a genealogy, not a graph: generations are rows (ancestors on top);
 * the children of the same parents hang from one bar under the line joining those
 * parents; each union of someone with several partners has its own bar. A "union" is
 * only a way of drawing - the parents of a child - and is not stored anywhere.
 *
 * Positions come from `arrange` (a recursive, contour-based placement over the family
 * structure, see arrange.ts); this function only turns them into cards and lines. The
 * person in the middle is not the origin: nothing here depends on who is selected.
 */
export function layoutTree(tree: FamilyTree): Layout {
  const byId = new Map(tree.nodes.map((n) => [n.person.id, n]))
  const levels = [...new Set(tree.nodes.map((n) => n.level))].sort((a, b) => b - a)
  const rowOf = new Map<string, number>()
  for (const node of tree.nodes) rowOf.set(node.person.id, levels.indexOf(node.level))

  const parentsOf = new Map<string, string[]>()
  const soft = new Set<string>() // "parent>child" links that are adoptive or guardian
  const partners = new Map<string, Set<string>>()
  const declared = new Map<string, Set<string>>()
  const link = (map: Map<string, Set<string>>, a: string, b: string) => {
    map.set(a, (map.get(a) ?? new Set()).add(b))
    map.set(b, (map.get(b) ?? new Set()).add(a))
  }
  for (const edge of tree.edges) {
    if (!byId.has(edge.from) || !byId.has(edge.to)) continue
    if (FILIATION.has(edge.kind)) {
      parentsOf.set(edge.to, [...(parentsOf.get(edge.to) ?? []), edge.from])
      if (edge.kind !== 'parent_of') soft.add(`${edge.from}>${edge.to}`)
    } else if (edge.kind === 'spouse_of') link(partners, edge.from, edge.to)
    else if (edge.kind === 'sibling_of') link(declared, edge.from, edge.to)
  }

  const birthOf = (id: string) => byId.get(id)!.person.birth_date ?? '9999'
  const nameOf = (id: string) => fullName(byId.get(id)!.person)
  const compare = (a: string, b: string) => birthOf(a).localeCompare(birthOf(b)) || nameOf(a).localeCompare(nameOf(b)) || (a < b ? -1 : a > b ? 1 : 0)

  const { x, crossLinked } = arrange({ ids: [...byId.keys()], row: rowOf, parents: parentsOf, partners, declared, compare })

  const minX = Math.min(...[...x.values()], 0)
  for (const [id, value] of x) x.set(id, value - minX + PAD)
  const width = Math.max(...[...x.values()].map((v) => v + CARD_W), CARD_W) + PAD
  const top = (id: string) => PAD + (rowOf.get(id) ?? 0) * (CARD_H + ROW_GAP)
  const height = levels.length * (CARD_H + ROW_GAP) - ROW_GAP + PAD * 2

  const placed: Placed[] = []
  for (const node of tree.nodes) {
    const id = node.person.id
    placed.push({ id, x: x.get(id) ?? PAD, y: top(id), row: rowOf.get(id) ?? 0, node })
  }
  placed.sort((a, b) => a.row - b.row || a.x - b.x)

  // --- the lines ---------------------------------------------------------------------------
  const connectors: Connector[] = []
  const junctions: Layout['junctions'] = []
  const cx = (id: string) => (x.get(id) ?? 0) + CARD_W / 2
  const bottom = (id: string) => top(id) + CARD_H
  const midY = (id: string) => top(id) + CARD_H / 2

  /** Two people on one generation with no card between them: the line joining them is clear all the way. */
  const standTogether = (a: string, b: string) => {
    if (rowOf.get(a) !== rowOf.get(b)) return false
    const lo = Math.min(x.get(a) ?? 0, x.get(b) ?? 0)
    const hi = Math.max(x.get(a) ?? 0, x.get(b) ?? 0)
    return !placed.some((p) => p.row === rowOf.get(a) && p.id !== a && p.id !== b && p.x > lo && p.x < hi)
  }

  // The children of one set of parents are one family: one stem, one bar, one drop each.
  const units = new Map<string, { parents: string[]; children: string[] }>()
  for (const [child, ps] of parentsOf) {
    const inView = ps.filter((p) => (rowOf.get(p) ?? 0) < (rowOf.get(child) ?? 0))
    if (!inView.length) continue
    const key = [...inView].sort().join('|')
    const unit = units.get(key) ?? { parents: [...inView].sort(), children: [] }
    unit.children.push(child)
    units.set(key, unit)
  }

  // Bars of neighbouring families that overlap are drawn at different heights, so a bar
  // never reads as running into the next family's.
  const barsByGap = new Map<number, Array<{ key: string; from: number; to: number }>>()
  const layoutOfUnit = new Map<string, { jx: number; jy: number; stemTop: number; level: number; row: number }>()
  const sortedUnits = [...units.entries()].map(([key, unit]) => {
    const [a, b] = unit.parents
    const adjacent = unit.parents.length === 2 && standTogether(a, b)
    let jx: number
    let jy: number
    if (unit.parents.length === 1) {
      jx = cx(a)
      jy = bottom(a)
    } else if (adjacent) {
      const left = (x.get(a) ?? 0) < (x.get(b) ?? 0) ? a : b
      jx = ((x.get(left) ?? 0) + CARD_W + (x.get(left === a ? b : a) ?? 0)) / 2
      jy = midY(a)
    } else {
      jx = unit.parents.reduce((sum, p) => sum + cx(p), 0) / unit.parents.length
      jy = Math.max(...unit.parents.map(bottom)) + 12
    }
    const childRow = Math.min(...unit.children.map((c) => rowOf.get(c) ?? 0))
    const from = Math.min(jx, ...unit.children.map(cx))
    const to = Math.max(jx, ...unit.children.map(cx))
    return { key, unit, jx, jy, adjacent, childRow, from, to }
  })
  sortedUnits.sort((p, q) => p.childRow - q.childRow || p.from - q.from)
  for (const u of sortedUnits) {
    const bars = barsByGap.get(u.childRow) ?? []
    let level = 0
    while (bars.some((b) => (layoutOfUnit.get(b.key)?.level ?? 0) === level && b.to >= u.from - 8 && b.from <= u.to + 8)) level++
    bars.push({ key: u.key, from: u.from, to: u.to })
    barsByGap.set(u.childRow, bars)
    layoutOfUnit.set(u.key, { jx: u.jx, jy: u.jy, stemTop: u.jy, level, row: u.childRow })
  }

  for (const u of sortedUnits) {
    const { jx, jy, level } = layoutOfUnit.get(u.key)!
    const childTop = Math.min(...u.unit.children.map(top))
    const barY = childTop - 22 - level * 9
    let d = ''
    if (!u.adjacent && u.unit.parents.length > 1) {
      // Parents who do not stand together: each drops to a line under their cards, and the stem hangs from its middle.
      const xs = u.unit.parents.map(cx)
      for (const p of u.unit.parents) d += `M ${cx(p)} ${bottom(p)} V ${jy} `
      d += `M ${Math.min(...xs)} ${jy} H ${Math.max(...xs)} `
    }
    if (u.adjacent && !partners.get(u.unit.parents[0])?.has(u.unit.parents[1])) {
      // Two parents of the same child form one parental unit, married or not: the line between
      // them belongs to the union (drawn from the final positions), not to a spouse link.
      const [first, second] = (x.get(u.unit.parents[0]) ?? 0) <= (x.get(u.unit.parents[1]) ?? 0) ? u.unit.parents : [u.unit.parents[1], u.unit.parents[0]]
      d += `M ${(x.get(first) ?? 0) + CARD_W} ${jy} H ${x.get(second) ?? 0} `
    }
    d += `M ${jx} ${jy} V ${barY} `
    const xs = [jx, ...u.unit.children.map(cx)]
    if (Math.max(...xs) - Math.min(...xs) > 0.5) d += `M ${Math.min(...xs)} ${barY} H ${Math.max(...xs)} `
    connectors.push({ id: `stem-${u.key}`, kind: 'stem', d: d.trim(), dashed: false, parents: u.unit.parents, children: u.unit.children })
    if (u.adjacent) junctions.push({ id: `junction-${u.key}`, x: jx, y: jy })
    for (const child of u.unit.children) {
      const adoptive = u.unit.parents.every((p) => soft.has(`${p}>${child}`))
      connectors.push({
        id: `drop-${u.key}-${child}`,
        kind: 'drop',
        d: `M ${cx(child)} ${barY} V ${top(child)}`,
        dashed: adoptive,
        parents: u.unit.parents,
        children: [child],
      })
    }
  }

  // Partners: a short line between neighbours; a line under the cards when something stands between them.
  const done = new Set<string>()
  const pairs: Array<[string, string, 'partner' | 'sibling']> = []
  for (const [a, set] of partners) for (const b of set) pairs.push([a, b, 'partner'])
  for (const [a, set] of declared) for (const b of set) pairs.push([a, b, 'sibling'])
  for (const [a, b, kind] of pairs) {
    const key = [kind, ...[a, b].sort()].join('|')
    if (done.has(key)) continue
    done.add(key)
    const [left, right] = (x.get(a) ?? 0) <= (x.get(b) ?? 0) ? [a, b] : [b, a]
    const sameRow = rowOf.get(left) === rowOf.get(right)
    const neighbours = sameRow && standTogether(left, right)
    let d: string
    if (neighbours) d = `M ${(x.get(left) ?? 0) + CARD_W} ${midY(left)} H ${x.get(right) ?? 0}`
    else if (sameRow && kind === 'partner') d = `M ${cx(left)} ${bottom(left)} v 8 H ${cx(right)} V ${bottom(right)}`
    else if (sameRow) d = `M ${cx(left)} ${top(left)} v -8 H ${cx(right)} V ${top(right)}`
    else d = `M ${cx(a)} ${bottom(rowOf.get(a)! < rowOf.get(b)! ? a : b)} L ${cx(b)} ${top(rowOf.get(a)! < rowOf.get(b)! ? b : a)}`
    connectors.push({ id: `${kind}-${key}`, kind, d, dashed: kind === 'sibling', parents: [], children: [], ends: [a, b] })
  }

  return { placed, connectors, junctions, crossLinked: [...crossLinked], width, height }
}
