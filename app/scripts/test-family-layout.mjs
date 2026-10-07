// Geometric checks on the family-tree layout algorithm, with synthetic data and no browser.
//   docker compose exec web node scripts/test-family-layout.mjs      (prints ALL CHECKS PASSED)
import assert from 'node:assert/strict'
import { build } from 'esbuild'
import { pathToFileURL } from 'node:url'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const dir = mkdtempSync(join(tmpdir(), 'layout-'))
const out = join(dir, 'layout.mjs')
await build({ entryPoints: ['src/components/family/tree/layout.ts'], bundle: true, format: 'esm', outfile: out, logLevel: 'error' })
const { layoutTree, CARD_W, CARD_H } = await import(pathToFileURL(out).href)
rmSync(dir, { recursive: true, force: true })

let checks = 0
const ok = (cond, msg) => {
  checks++
  assert.ok(cond, msg)
}

// --- a tiny family builder ------------------------------------------------------------------
function family() {
  const nodes = []
  const edges = []
  const ids = {}
  const person = (name, level, birth, gender) => {
    ids[name] = name
    nodes.push({
      person: { id: name, given_name: name, family_name: '', gender: gender ?? null, birth_date: birth ? `${birth}-01-01` : null },
      level, relation: '', closeness: Math.abs(level), sibling_kind: null, more: false, mine: false, editable: true,
    })
  }
  let n = 0
  const edge = (from, to, kind, role = null) => edges.push({ id: `e${n++}`, from, to, kind, role, status: 'verified', removable: true })
  return {
    person,
    parent: (p, c, role) => edge(p, c, 'parent_of', role),
    spouse: (a, b) => edge(a, b, 'spouse_of'),
    sibling: (a, b) => edge(a, b, 'sibling_of'),
    tree: () => ({ root: nodes[0].person.id, depth: 9, me: null, family_size: nodes.length, truncated: false, nodes: [...nodes], edges: [...edges] }),
  }
}

// §11: a central person, parents, germane siblings, half-siblings on both sides, several unions, two generations above, children below.
function scenario() {
  const f = family()
  const P = f.person
  P('Moi', 0, 1992, 'female'); P('Soeur', 0, 1990, 'female'); P('Frere', 0, 1995, 'male')
  P('DemiFrereM', 0, 1985, 'male'); P('DemiSoeurM', 0, 1988, 'female'); P('DemiFrereP', 0, 1998, 'male')
  P('PereA', 1, 1962, 'male'); P('Mere', 1, 1964, 'female'); P('PereB', 1, 1960, 'male'); P('MereC', 1, 1970, 'female')
  P('GPP', 2, 1935, 'male'); P('GMP', 2, 1938, 'female'); P('GPM', 2, 1936, 'male'); P('GMM', 2, 1939, 'female')
  P('AP', 3, 1910, 'male'); P('AM', 3, 1912, 'male')
  P('Partenaire', 0, 1991, 'male'); P('E1', -1, 2018, 'female'); P('E2', -1, 2020, 'male'); P('E3', -1, 2022, null)
  f.spouse('PereA', 'Mere'); f.spouse('Mere', 'PereB'); f.spouse('PereA', 'MereC'); f.spouse('GPP', 'GMP'); f.spouse('GPM', 'GMM'); f.spouse('Moi', 'Partenaire')
  for (const c of ['Moi', 'Soeur', 'Frere']) { f.parent('PereA', c, 'father'); f.parent('Mere', c, 'mother') }
  for (const c of ['DemiFrereM', 'DemiSoeurM']) { f.parent('PereB', c, 'father'); f.parent('Mere', c, 'mother') }
  f.parent('PereA', 'DemiFrereP', 'father'); f.parent('MereC', 'DemiFrereP', 'mother')
  f.parent('GPP', 'PereA', 'father'); f.parent('GMP', 'PereA', 'mother')
  f.parent('GPM', 'Mere', 'father'); f.parent('GMM', 'Mere', 'mother')
  f.parent('AP', 'GPP', 'father'); f.parent('AM', 'GPM', 'father')
  for (const c of ['E1', 'E2', 'E3']) { f.parent('Moi', c, 'mother'); f.parent('Partenaire', c, 'father') }
  return f.tree()
}

// --- geometric helpers ----------------------------------------------------------------------
function pathSegments(d) {
  const t = d.split(/[\s,]+/).filter(Boolean)
  const segs = []
  let i = 0, x = 0, y = 0
  while (i < t.length) {
    const c = t[i++]
    if (c === 'M') { x = +t[i++]; y = +t[i++] }
    else if (c === 'H') { const nx = +t[i++]; segs.push([x, y, nx, y]); x = nx }
    else if (c === 'V') { const ny = +t[i++]; segs.push([x, y, x, ny]); y = ny }
    else if (c === 'v') { const ny = y + +t[i++]; segs.push([x, y, x, ny]); y = ny }
    else if (c === 'L') { const nx = +t[i++], ny = +t[i++]; segs.push([x, y, nx, ny]); x = nx; y = ny }
    else throw new Error(`unexpected path command ${c}`)
  }
  return segs
}
const longestStem = (segs) => segs.filter((g) => g[0] === g[2] && g[1] !== g[3]).sort((a, b) => Math.abs(b[3] - b[1]) - Math.abs(a[3] - a[1]))[0]
const crossesCard = (seg, p) => {
  const [x1, y1, x2, y2] = seg
  const l = Math.min(x1, x2), r = Math.max(x1, x2), tp = Math.min(y1, y2), b = Math.max(y1, y2)
  // strictly through the card's interior (a line that ends on its edge is a legitimate attachment)
  return r > p.x + 0.5 && l < p.x + CARD_W - 0.5 && b > p.y + 0.5 && tp < p.y + CARD_H - 0.5
}

function geometry(name, tree, expectations = () => {}) {
  const lay = layoutTree(tree)
  const at = new Map(lay.placed.map((p) => [p.id, p]))
  const level = new Map(tree.nodes.map((n) => [n.person.id, n.level]))

  // same generation, same Y; deeper generation, lower on the page
  const yOf = new Map()
  for (const p of lay.placed) {
    const l = level.get(p.id)
    if (yOf.has(l)) ok(yOf.get(l) === p.y, `${name}: generation ${l} is not on one Y`)
    yOf.set(l, p.y)
  }
  for (const [l1, y1] of yOf) for (const [l2, y2] of yOf) if (l1 > l2) ok(y1 < y2, `${name}: ancestors must be above descendants`)

  // no card overlap
  for (const a of lay.placed) for (const b of lay.placed) {
    if (a.id >= b.id) continue
    const apart = a.x + CARD_W <= b.x || b.x + CARD_W <= a.x || a.y + CARD_H <= b.y || b.y + CARD_H <= a.y
    ok(apart, `${name}: cards ${a.id} and ${b.id} overlap`)
  }

  // no connector through any card
  for (const c of lay.connectors) for (const seg of pathSegments(c.d)) for (const p of lay.placed)
    ok(!crossesCard(seg, p), `${name}: connector ${c.id} passes through ${p.id}`)

  // every parent edge is a real connector, and a parent is above its child
  const stems = lay.connectors.filter((c) => c.kind === 'stem')
  for (const e of tree.edges.filter((e) => e.kind === 'parent_of')) {
    ok(at.get(e.from).y < at.get(e.to).y, `${name}: parent ${e.from} must be above ${e.to}`)
    ok(stems.some((s) => s.parents.includes(e.from) && s.children.includes(e.to)), `${name}: no parent connector ${e.from} -> ${e.to}`)
  }

  // a child hangs only from its own parents, and sits within the span of their union
  for (const s of stems) {
    const kids = tree.edges.filter((e) => e.kind === 'parent_of' && s.children.includes(e.to))
    for (const k of s.children) {
      const real = kids.filter((e) => e.to === k).map((e) => e.from).sort().join('|')
      ok(real === [...s.parents].sort().join('|'), `${name}: ${k} is drawn under ${s.parents} but is the child of ${real}`)
    }
  }

  // children centred under their union: the bar's middle is the stem's x, to the pixel
  for (const s of stems) {
    const xs = s.children.map((k) => at.get(k).x + CARD_W / 2)
    const centre = (Math.min(...xs) + Math.max(...xs)) / 2
    const stemX = longestStem(pathSegments(s.d))[0]
    const own = s.parents.map((p) => at.get(p).x + CARD_W / 2)
    // junction is between its parents (or under the lone parent)
    ok(stemX >= Math.min(...own) - 0.5 && stemX <= Math.max(...own) + 0.5, `${name}: stem ${s.id} is outside its parents`)
    // a union whose children stand in another family's tree (joined by marriage) is the one honest exception
    if (lay.crossLinked.includes([...s.parents].sort().join('|'))) continue
    ok(Math.abs(centre - stemX) < 1, `${name}: children of ${s.parents} are not centred under their union (${centre} vs ${stemX})`)
  }

  // two parents of one child are one parental unit: a horizontal line joins them, the stem leaves from it,
  // and it reaches no further than those two parents (so it cannot tie two different unions together)
  for (const s of stems.filter((s) => s.parents.length === 2)) {
    const spouseLine = lay.connectors.filter((c) => c.kind === 'partner' && c.ends && s.parents.every((p) => c.ends.includes(p)))
    const segs = [s.d, ...spouseLine.map((c) => c.d)].flatMap(pathSegments)
    const stem = longestStem(segs)
    const lo = Math.min(...s.parents.map((p) => at.get(p).x))
    const hi = Math.max(...s.parents.map((p) => at.get(p).x + CARD_W))
    const joins = segs.filter((seg) => seg[1] === seg[3] && seg[0] !== seg[2] && Math.min(seg[0], seg[2]) <= stem[0] + 0.5 && Math.max(seg[0], seg[2]) >= stem[0] - 0.5 && seg[1] <= stem[1] + 0.5)
    ok(joins.length >= 1, `${name}: the parents ${s.parents} are not joined by a horizontal line at the stem`)
    for (const j of joins) {
      ok(Math.min(j[0], j[2]) >= lo - 0.5 && Math.max(j[0], j[2]) <= hi + 0.5, `${name}: the line of ${s.parents} reaches beyond its two parents`)
      const [a, b] = s.parents.map((p) => at.get(p))
      ok(Math.min(j[0], j[2]) <= Math.max(a.x, b.x) + 0.5, `${name}: the line of ${s.parents} does not reach the second parent`)
    }
    ok(stem[1] >= Math.min(...s.parents.map((p) => at.get(p).y)) + CARD_H / 2 - 0.5, `${name}: stem of ${s.parents} starts above its parents`)
  }

  expectations({ lay, at, stems })
  // determinism: the same data, even listed backwards, gives the same positions
  const again = layoutTree({ ...tree, nodes: [...tree.nodes].reverse(), edges: [...tree.edges].reverse() })
  for (const p of again.placed) ok(at.get(p.id).x === p.x && at.get(p.id).y === p.y, `${name}: ${p.id} moves when the input order changes`)
  return lay
}

const centreX = (at, id) => at.get(id).x + CARD_W / 2
const spanOf = (at, ids) => [Math.min(...ids.map((i) => at.get(i).x)), Math.max(...ids.map((i) => at.get(i).x + CARD_W))]

// --- 1. the §11 scenario ---------------------------------------------------------------------
geometry('scenario', scenario(), ({ at, stems }) => {
  const stemOf = (parents) => stems.find((s) => s.parents.slice().sort().join('|') === parents.slice().sort().join('|'))
  const full = stemOf(['PereA', 'Mere'])
  ok(full && ['Moi', 'Soeur', 'Frere'].every((k) => full.children.includes(k)), 'germane siblings share one union')
  const viaMother = stemOf(['Mere', 'PereB'])
  ok(viaMother && viaMother.children.sort().join() === 'DemiFrereM,DemiSoeurM', 'half-siblings by the mother hang from Mere + PereB')
  const viaFather = stemOf(['PereA', 'MereC'])
  ok(viaFather && viaFather.children.join() === 'DemiFrereP', 'the half-brother by the father hangs from PereA + MereC')
  ok(!full.children.some((k) => k.startsWith('Demi')), 'a half-sibling is never drawn under the other union')

  // the mother is one card, between her two unions
  ok(at.get('PereB').x < at.get('Mere').x && at.get('Mere').x < at.get('PereA').x, 'Mere stands between her two partners')
  ok(at.get('PereA').x < at.get('MereC').x, 'PereA stands between Mere and MereC')

  // distinct unions do not interleave: each union's children are one contiguous run of the generation
  const runs = [full, viaMother, viaFather].map((s) => spanOf(at, s.children))
  for (let i = 0; i < runs.length; i++) for (let j = i + 1; j < runs.length; j++)
    ok(runs[i][1] <= runs[j][0] || runs[j][1] <= runs[i][0], 'the children of two unions interleave')

  // each child group lies under the span of its parents' union
  for (const s of [full, viaMother, viaFather]) {
    const [lo, hi] = spanOf(at, s.parents)
    const c = centreX(at, s.children[0])
    ok(c > lo - 400 && c < hi + 400, 'children stay near their parents')
  }
  // everything above is consistent: grandparents over their child
  ok(Math.abs(centreX(at, 'GPP') / 2 + centreX(at, 'GMP') / 2 - (centreX(at, 'PereA'))) < 400, 'grandparents are over their child')
})

// --- 2. very small and degenerate families ---------------------------------------------------
{
  const f = family()
  f.person('Alone', 0, 1990)
  geometry('single person', f.tree())
}
{
  // case D: parents unknown - two siblings declared, nobody invented above them
  const f = family()
  f.person('A', 0, 1990); f.person('B', 0, 1992)
  f.sibling('A', 'B')
  const lay = geometry('siblings without parents', f.tree())
  ok(lay.connectors.every((c) => c.kind !== 'stem'), 'no parent is invented for siblings of unknown parents')
  ok(lay.placed.length === 2, 'no card is invented')
}
{
  // father + mother + one child
  const f = family()
  f.person('Me', 0, 2000); f.person('Dad', 1, 1970); f.person('Mum', 1, 1972)
  f.spouse('Dad', 'Mum'); f.parent('Dad', 'Me', 'father'); f.parent('Mum', 'Me', 'mother')
  geometry('father mother me', f.tree())
}
{
  // a lone parent (the other parent unknown) with two children
  const f = family()
  f.person('Me', 0, 2000); f.person('Sib', 0, 2002); f.person('Mum', 1, 1972)
  f.parent('Mum', 'Me', 'mother'); f.parent('Mum', 'Sib', 'mother')
  geometry('lone parent', f.tree())
}
{
  // a person with three unions in a row is the hard case: still no overlap and no line through a card
  const f = family()
  f.person('Hub', 1, 1960); f.person('P1', 1, 1962); f.person('P2', 1, 1964)
  f.person('K1', 0, 1985); f.person('K2', 0, 1987); f.person('K3', 0, 1990); f.person('K4', 0, 1991)
  f.spouse('Hub', 'P1'); f.spouse('Hub', 'P2')
  f.parent('Hub', 'K1'); f.parent('P1', 'K1'); f.parent('Hub', 'K2'); f.parent('P1', 'K2'); f.parent('Hub', 'K3'); f.parent('P2', 'K3'); f.parent('P2', 'K4'); f.parent('Hub', 'K4')
  geometry('two partners with children each', f.tree())
}
{
  // a wide family: a couple with six children, three of whom have three children each
  const f = family()
  f.person('G', 2, 1930); f.person('H', 2, 1932); f.spouse('G', 'H')
  for (let i = 0; i < 6; i++) {
    f.person(`C${i}`, 1, 1955 + i)
    f.parent('G', `C${i}`); f.parent('H', `C${i}`)
    if (i % 2 === 0) for (let j = 0; j < 3; j++) { f.person(`C${i}g${j}`, 0, 1980 + i * 3 + j); f.parent(`C${i}`, `C${i}g${j}`) }
  }
  geometry('wide family', f.tree())
}
{
  // a child whose partner has parents of their own (a second family joined by marriage)
  const f = family()
  f.person('Me', 0, 1992); f.person('Spouse', 0, 1991); f.person('Dad', 1, 1962); f.person('Mum', 1, 1964)
  f.person('InLawDad', 1, 1960); f.person('InLawMum', 1, 1961); f.person('Kid', -1, 2020)
  f.spouse('Dad', 'Mum'); f.spouse('InLawDad', 'InLawMum'); f.spouse('Me', 'Spouse')
  f.parent('Dad', 'Me'); f.parent('Mum', 'Me'); f.parent('InLawDad', 'Spouse'); f.parent('InLawMum', 'Spouse')
  f.parent('Me', 'Kid'); f.parent('Spouse', 'Kid')
  geometry('two families by marriage', f.tree())
}

// --- 3. adding a member only changes its own branch -----------------------------------------
{
  const before = layoutTree(scenario())
  const tree = scenario()
  tree.nodes.push({ person: { id: 'Extra', given_name: 'Extra', family_name: '', gender: null, birth_date: '2024-01-01' }, level: -2, relation: '', closeness: 2, sibling_kind: null, more: false, mine: false, editable: true })
  tree.edges.push({ id: 'ex', from: 'E3', to: 'Extra', kind: 'parent_of', role: null, status: 'verified', removable: true })
  const after = geometry('scenario + a grandchild', tree)
  const was = new Map(before.placed.map((p) => [p.id, p]))
  // everything above the new generation keeps the same relative order and rows
  const order = (lay, row) => lay.placed.filter((p) => p.row === row).sort((a, b) => a.x - b.x).map((p) => p.id).join()
  for (const row of [0, 1, 2, 3]) ok(order(before, row) === order(after, row), `adding a grandchild reordered row ${row}`)
  ok(was.get('Moi').y === after.placed.find((p) => p.id === 'Moi').y, 'a new generation below does not move the ones above')
}


// --- 4. the parental unit does not depend on a spouse link ----------------------------------------
// No spouse_of anywhere in these: two people who are parents of the same child are still one unit.
function unitCase(label, kidsOfUnion) {
  // kidsOfUnion: array of child counts, one per union of the central parent M (unions: M+P0, M+P1, ...)
  const f = family()
  f.person('M', 1, 1960)
  kidsOfUnion.forEach((count, u) => {
    f.person(`P${u}`, 1, 1958 + u * 5)
    for (let k = 0; k < count; k++) {
      f.person(`K${u}_${k}`, 0, 1985 + u * 6 + k)
      f.parent('M', `K${u}_${k}`); f.parent(`P${u}`, `K${u}_${k}`)
    }
  })
  return geometry(label, f.tree(), ({ at, stems }) => {
    ok(stems.length === kidsOfUnion.length, `${label}: one parental unit per union`)
    for (const s of stems) {
      const u = s.parents.find((p) => p !== 'M').slice(1)
      ok(s.children.length === kidsOfUnion[u] && s.children.every((k) => k.startsWith(`K${u}_`)), `${label}: union ${u} holds only its own children`)
    }
  })
}
for (const n of [1, 2, 3, 5, 9]) {
  const lay = unitCase(`two parents + ${n} children (no spouse link)`, [n])
  ok(lay.connectors.every((c) => c.kind !== 'partner'), 'no spouse link was invented')
}
unitCase('two unions, no spouse link', [2, 3])
unitCase('three unions, no spouse link', [2, 1, 4])
{
  // half-siblings by the mother and by the father, parents never recorded as partners
  const f = family()
  f.person('Me', 0, 1992); f.person('Full', 0, 1994); f.person('HalfM', 0, 1985); f.person('HalfP', 0, 1998)
  f.person('Dad', 1, 1962); f.person('Mum', 1, 1964); f.person('Dad2', 1, 1960); f.person('Mum2', 1, 1970)
  for (const k of ['Me', 'Full']) { f.parent('Dad', k, 'father'); f.parent('Mum', k, 'mother') }
  f.parent('Dad2', 'HalfM', 'father'); f.parent('Mum', 'HalfM', 'mother')
  f.parent('Dad', 'HalfP', 'father'); f.parent('Mum2', 'HalfP', 'mother')
  geometry('half-siblings by mother and father, no spouse links', f.tree(), ({ stems }) => {
    ok(stems.length === 3, 'three distinct parental units')
    const key = (s) => [...s.parents].sort().join('+')
    const byKey = Object.fromEntries(stems.map((s) => [key(s), s.children.slice().sort().join()]))
    ok(byKey['Dad+Mum'] === 'Full,Me' && byKey['Dad2+Mum'] === 'HalfM' && byKey['Dad+Mum2'] === 'HalfP', 'each union keeps its own children')
  })
}
{
  // a married pair keeps the spouse line and does not get a second one on top of it
  const f = family()
  f.person('A', 1, 1960); f.person('B', 1, 1961); f.person('C', 0, 1990)
  f.spouse('A', 'B'); f.parent('A', 'C'); f.parent('B', 'C')
  const lay = layoutTree(f.tree())
  ok(lay.connectors.filter((c) => c.kind === 'partner').length === 1, 'one spouse line')
  ok(!pathSegments(lay.connectors.find((c) => c.kind === 'stem').d).some((seg) => seg[1] === seg[3] && seg[0] !== seg[2] && seg[1] < 200), 'the unit line is not doubled over a spouse line')
}

console.log(`${checks} geometric checks`)
console.log('ALL CHECKS PASSED')
