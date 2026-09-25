/**
 * Shared demo dataset for the family page — models the blueprint's
 * relationship GRAPH (Person Nodes + Relationship Edges) as backend truth.
 * Derived relationships (grandparent, cousin…) are computed, never stored.
 */

export type RelKind = 'parent_of' | 'spouse_of' | 'adoptive_parent_of' | 'guardian_of'

export interface Person {
  id: string
  name: string
  /** absolute generation in the demo family */
  gen: number
  /** cell [col,row] in avatars-set.jpg (4×3 contact sheet) */
  cell: [number, number]
  deceased?: boolean
}

export interface RelEdge {
  from: string
  to: string
  kind: RelKind
  status?: 'PENDING' | 'VERIFIED'
}

export const PERSONS: Person[] = [
  { id: 'baraka', name: 'Baraka', gen: 0, cell: [0, 0], deceased: true },
  { id: 'neema', name: 'Neema', gen: 0, cell: [1, 0], deceased: true },
  { id: 'juma', name: 'Juma', gen: 1, cell: [2, 0], deceased: true },
  { id: 'rehema', name: 'Rehema', gen: 1, cell: [3, 0] },
  { id: 'pendo', name: 'Pendo', gen: 1, cell: [0, 1] },
  { id: 'david', name: 'David', gen: 1, cell: [1, 1] },
  { id: 'kito', name: 'Kito', gen: 2, cell: [2, 1] },
  { id: 'lela', name: 'Lela', gen: 2, cell: [3, 1] },
  { id: 'demo', name: 'Demo', gen: 2, cell: [0, 2] },
  { id: 'zawadi', name: 'Zawadi M.', gen: 3, cell: [1, 2] },
  { id: 'nia', name: 'Nia K.', gen: 3, cell: [2, 2] },
]

export const PERSON_MAP: Record<string, Person> = Object.fromEntries(
  PERSONS.map((p) => [p.id, p]),
)

export const EDGES: RelEdge[] = [
  { from: 'baraka', to: 'neema', kind: 'spouse_of', status: 'VERIFIED' },
  { from: 'juma', to: 'rehema', kind: 'spouse_of', status: 'VERIFIED' },
  { from: 'david', to: 'pendo', kind: 'spouse_of', status: 'VERIFIED' },
  { from: 'baraka', to: 'juma', kind: 'parent_of', status: 'VERIFIED' },
  { from: 'neema', to: 'juma', kind: 'parent_of', status: 'VERIFIED' },
  { from: 'baraka', to: 'pendo', kind: 'parent_of', status: 'VERIFIED' },
  { from: 'neema', to: 'pendo', kind: 'parent_of', status: 'VERIFIED' },
  { from: 'juma', to: 'kito', kind: 'parent_of', status: 'VERIFIED' },
  { from: 'rehema', to: 'kito', kind: 'parent_of', status: 'VERIFIED' },
  // Lela shares only one documented parent — the demo's half-sibling case.
  { from: 'juma', to: 'lela', kind: 'parent_of', status: 'PENDING' },
  { from: 'david', to: 'demo', kind: 'parent_of', status: 'VERIFIED' },
  { from: 'pendo', to: 'demo', kind: 'parent_of', status: 'VERIFIED' },
  { from: 'kito', to: 'zawadi', kind: 'parent_of', status: 'VERIFIED' },
  { from: 'demo', to: 'nia', kind: 'parent_of', status: 'VERIFIED' },
]

export interface XY {
  x: number
  y: number
}

/** Parents / children / spouses lookups derived from edges. */
export function parentsOf(id: string): string[] {
  return EDGES.filter((e) => e.kind === 'parent_of' && e.to === id).map((e) => e.from)
}
export function childrenOf(id: string): string[] {
  return EDGES.filter((e) => e.kind === 'parent_of' && e.from === id).map((e) => e.to)
}
export function spousesOf(id: string): string[] {
  return EDGES.filter((e) => e.kind === 'spouse_of' && (e.from === id || e.to === id)).map((e) =>
    e.from === id ? e.to : e.from,
  )
}

/**
 * Person-centered re-rooting: BFS from any node, assigning Kinjy Levels
 * relative to the chosen person (Level 0). Parents rise (−1), children
 * descend (+1), spouses hold the same level. Indefinite depth by design.
 */
export function layoutFromRoot(
  rootId: string,
  width: number,
  levelHeight: number,
  midY: number,
): { positions: Record<string, XY>; levels: Record<string, number> } {
  const levels: Record<string, number> = { [rootId]: 0 }
  const queue = [rootId]
  while (queue.length) {
    const id = queue.shift()!
    const lvl = levels[id]
    for (const p of parentsOf(id)) {
      if (levels[p] === undefined) {
        levels[p] = lvl - 1
        queue.push(p)
      }
    }
    for (const c of childrenOf(id)) {
      if (levels[c] === undefined) {
        levels[c] = lvl + 1
        queue.push(c)
      }
    }
    for (const s of spousesOf(id)) {
      if (levels[s] === undefined) {
        levels[s] = lvl
        queue.push(s)
      }
    }
  }
  // group by level, order horizontally keeping spouses adjacent
  const byLevel = new Map<number, string[]>()
  for (const p of PERSONS) {
    const lvl = levels[p.id]
    if (lvl === undefined) continue
    if (!byLevel.has(lvl)) byLevel.set(lvl, [])
    byLevel.get(lvl)!.push(p.id)
  }
  const sortedLevels = [...byLevel.keys()].sort((a, b) => a - b)
  const minLevel = sortedLevels[0] ?? 0
  const positions: Record<string, XY> = {}
  for (const lvl of sortedLevels) {
    const ids = byLevel.get(lvl)!
    // order: cluster spouses together via absolute gen ordering fallback
    ids.sort((a, b) => PERSON_MAP[a].gen - PERSON_MAP[b].gen || a.localeCompare(b))
    // keep spouse pairs adjacent
    const ordered: string[] = []
    const seen = new Set<string>()
    for (const id of ids) {
      if (seen.has(id)) continue
      ordered.push(id)
      seen.add(id)
      const sp = spousesOf(id).find((s) => ids.includes(s) && !seen.has(s))
      if (sp) {
        ordered.push(sp)
        seen.add(sp)
      }
    }
    const count = ordered.length
    const spread = Math.min(width - 120, count * 108)
    ordered.forEach((id, i) => {
      const x = width / 2 + (count === 1 ? 0 : -spread / 2 + (spread / (count - 1)) * i)
      positions[id] = { x, y: midY + (lvl - minLevel) * levelHeight }
    })
  }
  return { positions, levels }
}

/** Shortest path between two people across all relationship edges (BFS). */
export function findPath(a: string, b: string): string[] {
  if (a === b) return [a]
  const prev: Record<string, string | null> = { [a]: null }
  const queue = [a]
  while (queue.length) {
    const id = queue.shift()!
    const neighbors = [
      ...parentsOf(id),
      ...childrenOf(id),
      ...spousesOf(id),
    ]
    for (const n of neighbors) {
      if (prev[n] !== undefined) continue
      prev[n] = id
      if (n === b) {
        const path = [b]
        let cur = b
        while (prev[cur] !== null) {
          cur = prev[cur]!
          path.unshift(cur)
        }
        return path
      }
      queue.push(n)
    }
  }
  return []
}

/** Common ancestors of two people (shared ancestor couple detection). */
export function commonAncestors(a: string, b: string): string[] {
  const ancestorsOf = (id: string): Set<string> => {
    const set = new Set<string>()
    const queue = [...parentsOf(id)]
    while (queue.length) {
      const p = queue.shift()!
      if (set.has(p)) continue
      set.add(p)
      queue.push(...parentsOf(p))
    }
    return set
  }
  const aa = ancestorsOf(a)
  return [...ancestorsOf(b)].filter((id) => aa.has(id))
}

/**
 * Closeness ranking: full siblings (share both parents) rank before
 * half-siblings (share one). Consistently computed from the graph.
 */
export function siblingsByCloseness(id: string): { id: string; kind: 'full' | 'half' }[] {
  const myParents = new Set(parentsOf(id))
  const result: { id: string; kind: 'full' | 'half' }[] = []
  const candidates = new Set<string>()
  for (const p of myParents) for (const c of childrenOf(p)) if (c !== id) candidates.add(c)
  for (const c of candidates) {
    const shared = parentsOf(c).filter((p) => myParents.has(p)).length
    result.push({ id: c, kind: shared >= 2 ? 'full' : 'half' })
  }
  return result.sort((x, y) => (x.kind === y.kind ? 0 : x.kind === 'full' ? -1 : 1))
}
