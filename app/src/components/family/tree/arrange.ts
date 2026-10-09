/**
 * Where each person stands, computed from the structure of the family alone.
 *
 * Nothing here knows about React, pixels of a card's contents or who is "selected".
 * The input is the primitive facts (who is whose parent, who are partners, which
 * generation a person is on); the output is the left edge of every card. The steps:
 *
 *   1. unions     the parents of a child, as a set (computed, never stored)
 *   2. chains     people who must stand side by side on one generation: partners,
 *                 co-parents of a child, siblings declared without a shared parent
 *   3. blocks     a chain plus, below it, one group of children per union; each child
 *                 is itself a block (their chain and everything under it). A block
 *                 knows how far it reaches on every row (its contour)
 *   4. widths     groups are packed side by side by contour, so a subtree is as narrow
 *                 as it can be without touching its neighbour
 *   5. centring   a union's children are centred under the point between its parents;
 *                 where two unions of the same person need more room, the parents are
 *                 moved apart (never the children together) until both are exact
 *   6. forest     top-level families are packed the same way, the ones linked by a
 *                 marriage kept next to each other
 *
 * Same input, same output: every choice is made from sorted keys, never from the
 * order the server happened to list things in.
 */
export const CARD_W = 148
export const CARD_H = 58
/** Between neighbours on a generation. */
export const GAP = 18
/** Between two partners: room for the stem that goes down to their children. */
export const COUPLE_GAP = 36
/** Between one generation and the next: room for the unions and the bars. */
export const ROW_GAP = 96
/** Between the descendants of two brothers or sisters. */
export const SIB_GAP = 24
/** Between the children of two different unions of the same person. */
export const UNION_GAP = 44
/** Between two unrelated top-level families. */
export const ROOT_GAP = 72

export interface ArrangeInput {
  ids: string[]
  /** Generation row of each person; a smaller number is higher on the page. */
  row: Map<string, number>
  /** Parents of each child, only those on a higher row. */
  parents: Map<string, string[]>
  partners: Map<string, Set<string>>
  declared: Map<string, Set<string>>
  /** Total order used for every tie: older first, then by name. */
  compare: (a: string, b: string) => number
}

interface Block {
  cards: Array<{ id: string; x: number; row: number }>
  lo: Map<number, number>
  hi: Map<number, number>
  /** Centre of the person this block hangs from (the one who is their parents' child). */
  anchor: number
  /** Unions whose children stand in another family's block: where the parents are, and who those children are. */
  hooks: Array<{ x: number; kids: string[] }>
}

const mapped = (m: Map<number, number>, dx: number) => new Map([...m].map(([row, v]) => [row, v + dx] as const))

const shifted = (b: Block, dx: number): Block => ({
  cards: b.cards.map((c) => ({ ...c, x: c.x + dx })),
  lo: mapped(b.lo, dx),
  hi: mapped(b.hi, dx),
  anchor: b.anchor + dx,
  hooks: b.hooks.map((h) => ({ ...h, x: h.x + dx })),
})

function merged(blocks: Block[], anchor = 0): Block {
  const lo = new Map<number, number>()
  const hi = new Map<number, number>()
  const cards: Block['cards'] = []
  const hooks: Block['hooks'] = []
  for (const b of blocks) {
    cards.push(...b.cards)
    hooks.push(...b.hooks)
    for (const [row, v] of b.lo) lo.set(row, Math.min(lo.get(row) ?? Infinity, v))
    for (const [row, v] of b.hi) hi.set(row, Math.max(hi.get(row) ?? -Infinity, v))
  }
  return { cards, lo, hi, anchor, hooks }
}

/** The least `dx` that lets `b`, moved right by it, clear `a` by `gap` on every row they share. */
function clearance(a: Block, b: Block, gap: number): number {
  let need = -Infinity
  for (const [row, hi] of a.hi) {
    const lo = b.lo.get(row)
    if (lo !== undefined) need = Math.max(need, hi + gap - lo)
  }
  if (need === -Infinity) {
    const right = Math.max(...a.hi.values())
    const left = Math.min(...b.lo.values())
    need = right + gap - left
  }
  return need
}

interface Union {
  key: string
  parents: string[]
  children: string[]
}

export interface Arranged {
  /** Left edge of every card. */
  x: Map<string, number>
  /** Unions with a child who stands in another family's tree (a marriage joins two families): drawn with a longer bar. */
  crossLinked: Set<string>
}

export function arrange(input: ArrangeInput): Arranged {
  const { row, compare } = input
  const ids = [...new Set(input.ids)].sort(compare)

  const parentsOf = new Map<string, string[]>()
  for (const id of ids) {
    const mine = (input.parents.get(id) ?? []).filter((p) => row.has(p) && row.get(p)! < row.get(id)!)
    if (mine.length) parentsOf.set(id, [...new Set(mine)].sort())
  }

  // 1. unions
  const unions = new Map<string, Union>()
  for (const id of ids) {
    const parents = parentsOf.get(id)
    if (!parents) continue
    const key = parents.join('|')
    const union = unions.get(key) ?? { key, parents, children: [] }
    union.children.push(id)
    unions.set(key, union)
  }

  // 2. chains
  const glue = new Map<string, Set<string>>()
  const couple = new Set<string>()
  const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)
  const join = (a: string, b: string, isCouple: boolean) => {
    if (a === b || !row.has(a) || !row.has(b) || row.get(a) !== row.get(b)) return
    glue.set(a, (glue.get(a) ?? new Set()).add(b))
    glue.set(b, (glue.get(b) ?? new Set()).add(a))
    if (isCouple) couple.add(pairKey(a, b))
  }
  for (const [a, set] of input.partners) for (const b of set) join(a, b, true)
  for (const [a, set] of input.declared) for (const b of set) join(a, b, false)
  for (const union of unions.values())
    for (let i = 0; i < union.parents.length; i++)
      for (let j = i + 1; j < union.parents.length; j++) join(union.parents[i], union.parents[j], true)

  const compOf = new Map<string, number>()
  const comps: string[][] = []
  for (const id of ids) {
    if (compOf.has(id)) continue
    const members: string[] = []
    const stack = [id]
    compOf.set(id, comps.length)
    while (stack.length) {
      const current = stack.pop()!
      members.push(current)
      for (const next of glue.get(current) ?? []) {
        if (compOf.has(next)) continue
        compOf.set(next, comps.length)
        stack.push(next)
      }
    }
    comps.push(members.sort(compare))
  }

  /** Members of a chain from one end to the other. A person with an origin family stands where their siblings are. */
  const orderOf = (ci: number, anchor: string | null, partnersLeft: boolean): string[] => {
    const members = comps[ci]
    if (members.length === 1) return members
    const degree = (id: string) => glue.get(id)?.size ?? 0
    const ends = members.filter((id) => degree(id) <= 1)
    const pool = ends.length ? ends : members
    let start = pool[0]
    if (anchor && ends.includes(anchor)) start = partnersLeft ? (ends.find((e) => e !== anchor) ?? anchor) : anchor
    const seen = new Set<string>()
    const out: string[] = []
    const stack = [start]
    while (stack.length) {
      const current = stack.pop()!
      if (seen.has(current)) continue
      seen.add(current)
      out.push(current)
      const next = [...(glue.get(current) ?? [])].filter((o) => !seen.has(o)).sort(compare)
      for (const o of next.reverse()) stack.push(o)
    }
    for (const id of members) if (!seen.has(id)) out.push(id)
    return out
  }

  const claimed = new Set<number>()
  const crossLinked = new Set<string>()

  /** A chain, its unions, and everything under them. */
  const build = (ci: number, anchor: string | null, partnersLeft: boolean): Block => {
    claimed.add(ci)
    const order = orderOf(ci, anchor, partnersLeft)
    const at = new Map(order.map((id, i) => [id, i] as const))
    const r = row.get(order[0])!

    const owned = [...unions.values()]
      .filter((u) => compOf.get(u.parents[0]) === ci)
      .map((u) => ({ u, members: u.parents.filter((p) => at.has(p)).map((p) => at.get(p)!) }))
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
    owned.sort((a, b) => mean(a.members) - mean(b.members) || a.members.length - b.members.length || (a.u.key < b.u.key ? -1 : 1))

    // 3. each union's children, each child a block, packed side by side
    const groups: Array<{ members: number[]; block: Block }> = []
    const hookUnions: Array<{ members: number[]; kids: string[] }> = []
    for (const { u, members } of owned) {
      const fresh: string[] = []
      const cross: string[] = []
      for (const kid of [...u.children].sort(compare)) {
        const kc = compOf.get(kid)!
        if (claimed.has(kc)) {
          if (!fresh.some((f) => compOf.get(f) === kc)) cross.push(kid)
          continue
        }
        claimed.add(kc)
        fresh.push(kid)
      }
      if (cross.length) {
        crossLinked.add(u.key)
        hookUnions.push({ members, kids: cross })
      }
      if (!fresh.length) continue
      const blocks = fresh.map((kid, i) => build(compOf.get(kid)!, kid, i < (fresh.length - 1) / 2))
      let acc = blocks[0]
      const firstAnchor = blocks[0].anchor
      let lastAnchor = firstAnchor
      for (let i = 1; i < blocks.length; i++) {
        const dx = clearance(acc, blocks[i], SIB_GAP)
        const placed = shifted(blocks[i], dx)
        lastAnchor = placed.anchor
        acc = merged([acc, placed])
      }
      // 5. the children's bar is centred: the group's origin is the middle of its first and last child
      groups.push({ members, block: shifted(acc, -(firstAnchor + lastAnchor) / 2) })
    }

    // 4/5. place the chain so that every group sits exactly under the point between its parents
    const m: number[] = []
    order.forEach((id, i) => {
      const gap = i === 0 ? 0 : couple.has(pairKey(order[i - 1], id)) ? COUPLE_GAP : GAP
      m.push(i === 0 ? 0 : m[i - 1] + CARD_W + gap)
    })
    const target = (g: { members: number[] }) => g.members.reduce((s, i) => s + m[i] + CARD_W / 2, 0) / g.members.length
    const needs = groups.map((g, i) => groups.map((h, j) => (j > i ? clearance(g.block, h.block, UNION_GAP) : 0)))
    for (let pass = 0; pass < 400; pass++) {
      let moved = false
      for (let i = 0; i < groups.length; i++) {
        for (let j = i + 1; j < groups.length; j++) {
          const deficit = needs[i][j] - (target(groups[j]) - target(groups[i]))
          if (deficit <= 1e-6) continue
          let bestQ = -1
          let bestGain = 1e-9
          for (let q = 1; q < order.length; q++) {
            const share = (g: { members: number[] }) => g.members.filter((k) => k >= q).length / g.members.length
            const gain = share(groups[j]) - share(groups[i])
            if (gain >= bestGain) {
              bestGain = gain
              bestQ = q
            }
          }
          if (bestQ < 0) continue
          for (let k = bestQ; k < order.length; k++) m[k] += deficit / bestGain
          moved = true
        }
      }
      if (!moved) break
    }

    const own: Block = {
      cards: order.map((id, i) => ({ id, x: m[i], row: r })),
      lo: new Map([[r, Math.min(...m)]]),
      hi: new Map([[r, Math.max(...m) + CARD_W]]),
      anchor: 0,
      hooks: hookUnions.map((h) => ({ x: target(h), kids: h.kids })),
    }
    const parts = [own, ...groups.map((g) => shifted(g.block, target(g)))]
    return merged(parts, anchor ? m[at.get(anchor)!] + CARD_W / 2 : 0)
  }

  // 6. the families at the top, then anything a cycle left out
  const rootsOf = comps
    .map((members, ci) => ({ ci, members }))
    .filter(({ members }) => members.every((id) => !parentsOf.has(id)))
    .sort(
      (a, b) =>
        Math.min(...a.members.map((id) => row.get(id)!)) - Math.min(...b.members.map((id) => row.get(id)!)) ||
        compare(a.members[0], b.members[0]),
    )
  const trees: Block[] = []
  for (const { ci } of rootsOf) if (!claimed.has(ci)) trees.push(build(ci, null, false))
  for (let ci = 0; ci < comps.length; ci++) if (!claimed.has(ci)) trees.push(build(ci, null, false))

  // Families joined by a marriage (a child of one stands in the other) are kept side by side.
  const holds = trees.map((t) => new Set(t.cards.map((c) => c.id)))
  const linked = (a: number, b: number) =>
    trees[a].cards.some((c) => (parentsOf.get(c.id) ?? []).some((p) => holds[b].has(p))) ||
    trees[b].cards.some((c) => (parentsOf.get(c.id) ?? []).some((p) => holds[a].has(p)))
  const left = trees.map((_t, i) => i)
  const sequence: number[] = []
  while (left.length) {
    const last = sequence[sequence.length - 1]
    const next = last === undefined ? left[0] : (left.find((i) => linked(last, i)) ?? left[0])
    sequence.push(next)
    left.splice(left.indexOf(next), 1)
  }

  let all: Block | null = null
  const placedAt = new Map<string, number>()
  for (const i of sequence) {
    let tree = trees[i]
    if (all) {
      const right = clearance(all, tree, ROOT_GAP)
      const leftmost = -clearance(tree, all, ROOT_GAP)
      // A family that holds the parents of someone already placed wants to stand over them.
      const wants = tree.hooks.flatMap((h) => h.kids.filter((k) => placedAt.has(k)).map((k) => placedAt.get(k)! + CARD_W / 2 - h.x))
      let dx = right
      if (wants.length) {
        const want = wants.reduce((a, b) => a + b, 0) / wants.length
        if (want >= right) dx = want
        else if (want <= leftmost) dx = want
        else dx = Math.abs(want - right) <= Math.abs(want - leftmost) ? right : leftmost
      }
      tree = shifted(tree, dx)
      all = merged([all, tree])
    } else all = tree
    for (const c of tree.cards) placedAt.set(c.id, c.x)
  }
  const x = new Map<string, number>()
  for (const c of all?.cards ?? []) x.set(c.id, c.x)
  return { x, crossLinked }
}
