import type { FamilyTree, Person } from '@/lib/api'

type Node = FamilyTree['nodes'][number]

export const CARD_W = 148
export const CARD_H = 58
/** Between neighbours on a generation. */
export const GAP = 18
/** Between two partners: room for the stem that goes down to their children. */
export const COUPLE_GAP = 36
/** Between one generation and the next: room for the unions and the bars. */
export const ROW_GAP = 96
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

/** Least-squares fit of a non-decreasing sequence (pool adjacent violators). */
function isotonic(target: number[], weight: number[]): number[] {
  const blocks: Array<{ sum: number; w: number; n: number }> = []
  target.forEach((value, i) => {
    blocks.push({ sum: value * weight[i], w: weight[i], n: 1 })
    while (blocks.length > 1) {
      const b = blocks[blocks.length - 1]
      const a = blocks[blocks.length - 2]
      if (a.sum / a.w <= b.sum / b.w) break
      a.sum += b.sum
      a.w += b.w
      a.n += b.n
      blocks.pop()
    }
  })
  return blocks.flatMap((b) => Array<number>(b.n).fill(b.sum / b.w))
}

/**
 * Where each person goes on the page, and the lines that join them.
 *
 * The picture is a genealogy, not a graph: generations are rows (ancestors on top);
 * the children of the same two parents are grouped under one bar that hangs from the
 * line joining those parents, so a child is plainly *theirs* and not their
 * neighbour's; partners sit side by side; someone with two partners stands between
 * them, and each union's children hang from that union alone. A "union" here is only
 * a way of drawing - the parents of a child - and is not stored anywhere.
 *
 * Every line runs in the space between two generations (or in the gap between two
 * partners), never across a card. The layout is deterministic and computed once per
 * tree; selecting someone does not redo it.
 */
export function layoutTree(tree: FamilyTree): Layout {
  const byId = new Map(tree.nodes.map((n) => [n.person.id, n]))
  const levels = [...new Set(tree.nodes.map((n) => n.level))].sort((a, b) => b - a)
  const rowOf = new Map<string, number>()
  const rows: string[][] = levels.map(() => [])
  for (const node of tree.nodes) {
    const row = levels.indexOf(node.level)
    rowOf.set(node.person.id, row)
    rows[row].push(node.person.id)
  }

  const parentsOf = new Map<string, string[]>()
  const childrenOf = new Map<string, string[]>()
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
      childrenOf.set(edge.from, [...(childrenOf.get(edge.from) ?? []), edge.to])
      if (edge.kind !== 'parent_of') soft.add(`${edge.from}>${edge.to}`)
    } else if (edge.kind === 'spouse_of') link(partners, edge.from, edge.to)
    else if (edge.kind === 'sibling_of') link(declared, edge.from, edge.to)
  }

  const nameOf = (id: string) => fullName(byId.get(id)!.person)
  const birthOf = (id: string) => byId.get(id)!.person.birth_date ?? '9999'
  const personKey = (a: string, b: string) => birthOf(a).localeCompare(birthOf(b)) || nameOf(a).localeCompare(nameOf(b))
  const unitOf = (id: string) => [...(parentsOf.get(id) ?? [])].sort().join('|')

  // People who must stand side by side: partners, and siblings declared without a shared parent.
  const glue = (id: string, row: number): string[] =>
    [...(partners.get(id) ?? []), ...(declared.get(id) ?? [])].filter((other) => rowOf.get(other) === row)
  const isPartners = (a: string, b: string) => partners.get(a)?.has(b) ?? false

  const x = new Map<string, number>() // left edge of each card
  const centre = (id: string) => (x.get(id) ?? 0) + CARD_W / 2

  /** Everyone glued together on a row, in the order they will stand: along the chain, from one end. */
  const components = (ids: string[], row: number): string[][] => {
    const seen = new Set<string>()
    const out: string[][] = []
    for (const start of [...ids].sort(personKey)) {
      if (seen.has(start)) continue
      const members: string[] = []
      const stack = [start]
      const reach = new Set<string>([start])
      while (stack.length) {
        const current = stack.pop()!
        reach.add(current)
        for (const next of glue(current, row)) if (!reach.has(next)) stack.push(next)
      }
      for (const id of reach) seen.add(id)
      const mine = [...reach]
      // Begin at an end of the chain (someone with one neighbour), so a run of partners reads in a line.
      const ends = mine.filter((id) => glue(id, row).length === 1).sort(personKey)
      const first = (ends[0] ?? [...mine].sort(personKey)[0])!
      const visited = new Set<string>()
      const walk = [first]
      while (walk.length) {
        const current = walk.pop()!
        if (visited.has(current)) continue
        visited.add(current)
        members.push(current)
        for (const next of glue(current, row).sort(personKey).reverse()) if (!visited.has(next)) walk.push(next)
      }
      out.push(members)
    }
    return out
  }

  const closeness = (id: string) => byId.get(id)!.closeness

  const order: string[][] = []
  const gapBetween = (a: string, b: string) => (isPartners(a, b) ? COUPLE_GAP : GAP)

  const isGlued = (a: string, b: string) => isPartners(a, b) || (declared.get(a)?.has(b) ?? false)

  /**
   * Put a row left to right as close to where each person "wants" to be as the gaps allow.
   * Partners (and siblings declared without a parent) are one rigid block: they keep their
   * place side by side, and it is the block that moves.
   */
  const place = (row: string[], wanted: Map<string, number>) => {
    const blocks: Array<{ ids: string[]; offsets: number[]; width: number }> = []
    row.forEach((id, i) => {
      if (i > 0 && isGlued(row[i - 1], id)) {
        const block = blocks[blocks.length - 1]
        const offset = block.width + gapBetween(row[i - 1], id)
        block.ids.push(id)
        block.offsets.push(offset)
        block.width = offset + CARD_W
      } else blocks.push({ ids: [id], offsets: [0], width: CARD_W })
    })
    const start: number[] = []
    blocks.forEach((_block, i) => start.push(i === 0 ? 0 : start[i - 1] + blocks[i - 1].width + GAP))
    const target: number[] = []
    const weight: number[] = []
    blocks.forEach((block, i) => {
      const wants = block.ids.map((id, k) => (wanted.has(id) ? wanted.get(id)! - block.offsets[k] : undefined)).filter((w): w is number => w !== undefined)
      if (wants.length) {
        target.push(wants.reduce((sum, w) => sum + w, 0) / wants.length - start[i])
        weight.push(wants.length)
      } else {
        target.push((x.get(block.ids[0]) ?? start[i]) - start[i])
        weight.push(0.08)
      }
    })
    const fitted = isotonic(target, weight)
    blocks.forEach((block, i) => block.ids.forEach((id, k) => x.set(id, fitted[i] + start[i] + block.offsets[k])))
  }

  rows.forEach((ids, r) => {
    const parentsPlaced = (id: string) => (parentsOf.get(id) ?? []).filter((p) => (rowOf.get(p) ?? r) < r)
    const wantedOf = (id: string) => {
      const ps = parentsPlaced(id)
      return ps.length ? ps.reduce((sum, p) => sum + centre(p), 0) / ps.length - CARD_W / 2 : undefined
    }
    const comps = components(ids, r).map((members) => {
      const wants = members.map(wantedOf).filter((w): w is number => w !== undefined)
      return {
        members,
        want: wants.length ? wants.reduce((a, b) => a + b, 0) / wants.length : undefined,
        born: [...members].sort(personKey)[0],
        near: Math.min(...members.map(closeness)),
      }
    })
    // Families that hang from parents already placed come first, in the order of those parents;
    // people with no parent in view (the top of the tree, partners marrying in) follow, nearest first.
    const hanging = comps.filter((c) => c.want !== undefined).sort((a, b) => a.want! - b.want! || personKey(a.born, b.born))
    const free = comps.filter((c) => c.want === undefined).sort((a, b) => a.near - b.near || personKey(a.born, b.born))
    let sequence = r === 0 ? free : [...hanging, ...free]

    // Within a family, the member who is the parents' child stands towards the middle of their
    // brothers and sisters, and the partner who married in stands on the outside.
    sequence = sequence.map((comp, index, all) => {
      const units = new Set(comp.members.map(unitOf).filter(Boolean))
      if (comp.members.length < 2 || units.size !== 1) return comp
      const unit = [...units][0]
      const group = all.map((c, i) => ({ c, i })).filter(({ c }) => c.members.some((m) => unitOf(m) === unit))
      const mid = group.reduce((sum, { i }) => sum + i, 0) / group.length
      const at: number[] = comp.members.map((m) => (unitOf(m) === unit ? 1 : 0))
      const centroid = at.reduce((sum, flag, i) => sum + flag * i, 0) / Math.max(1, at.reduce((a, b) => a + b, 0))
      const wantRight = index < mid // a family on the left: the child stands on its right (towards the others)
      const isRight = centroid > (comp.members.length - 1) / 2
      return wantRight === isRight || index === mid ? comp : { ...comp, members: [...comp.members].reverse() }
    })

    const row = sequence.flatMap((c) => c.members)
    order.push(row)
    let cursor = 0
    row.forEach((id, i) => {
      if (i > 0) cursor += gapBetween(row[i - 1], id)
      x.set(id, cursor)
      cursor += CARD_W
    })
    const wanted = new Map<string, number>()
    for (const id of row) {
      const w = wantedOf(id)
      if (w !== undefined) wanted.set(id, w)
    }
    place(row, wanted)
  })

  // Settle: parents over their children, then children under their parents, a few times over.
  const childCentre = (id: string) => {
    const kids = (childrenOf.get(id) ?? []).filter((c) => (rowOf.get(c) ?? 0) > (rowOf.get(id) ?? 0))
    return kids.length ? kids.reduce((sum, c) => sum + centre(c), 0) / kids.length - CARD_W / 2 : undefined
  }
  const parentCentre = (id: string) => {
    const ps = (parentsOf.get(id) ?? []).filter((p) => (rowOf.get(p) ?? 0) < (rowOf.get(id) ?? 0))
    return ps.length ? ps.reduce((sum, p) => sum + centre(p), 0) / ps.length - CARD_W / 2 : undefined
  }
  for (let pass = 0; pass < 3; pass++) {
    for (let r = order.length - 2; r >= 0; r--) {
      const wanted = new Map<string, number>()
      for (const id of order[r]) {
        const w = childCentre(id)
        if (w !== undefined) wanted.set(id, w)
      }
      place(order[r], wanted)
    }
    for (let r = 1; r < order.length; r++) {
      const wanted = new Map<string, number>()
      for (const id of order[r]) {
        const w = parentCentre(id)
        if (w !== undefined) wanted.set(id, w)
      }
      place(order[r], wanted)
    }
  }

  const minX = Math.min(...[...x.values()], 0)
  for (const [id, value] of x) x.set(id, value - minX + PAD)
  const width = Math.max(...[...x.values()].map((v) => v + CARD_W), CARD_W) + PAD
  const top = (id: string) => PAD + (rowOf.get(id) ?? 0) * (CARD_H + ROW_GAP)
  const height = rows.length * (CARD_H + ROW_GAP) - ROW_GAP + PAD * 2

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
    const adjacent =
      unit.parents.length === 2 &&
      rowOf.get(a) === rowOf.get(b) &&
      Math.abs((x.get(a) ?? 0) - (x.get(b) ?? 0)) <= CARD_W + COUPLE_GAP + 1
    let jx: number
    let jy: number
    if (unit.parents.length === 1) {
      jx = cx(a)
      jy = bottom(a)
    } else if (adjacent) {
      const left = (x.get(a) ?? 0) < (x.get(b) ?? 0) ? a : b
      jx = (x.get(left) ?? 0) + CARD_W + ((Math.abs((x.get(a) ?? 0) - (x.get(b) ?? 0)) - CARD_W) / 2)
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
    const neighbours = sameRow && Math.abs((x.get(right) ?? 0) - (x.get(left) ?? 0)) <= CARD_W + COUPLE_GAP + 1
    let d: string
    if (neighbours) d = `M ${(x.get(left) ?? 0) + CARD_W} ${midY(left)} H ${x.get(right) ?? 0}`
    else if (sameRow && kind === 'partner') d = `M ${cx(left)} ${bottom(left)} v 8 H ${cx(right)} V ${bottom(right)}`
    else if (sameRow) d = `M ${cx(left)} ${top(left)} v -8 H ${cx(right)} V ${top(right)}`
    else d = `M ${cx(a)} ${bottom(rowOf.get(a)! < rowOf.get(b)! ? a : b)} L ${cx(b)} ${top(rowOf.get(a)! < rowOf.get(b)! ? b : a)}`
    connectors.push({ id: `${kind}-${key}`, kind, d, dashed: kind === 'sibling', parents: [], children: [], ends: [a, b] })
  }

  return { placed, connectors, junctions, width, height }
}
