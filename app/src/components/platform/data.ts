export interface ModuleInfo {
  letter: string
  glyph: string
  name: string
  tagline: string
  description: string
  bullets: string[]
  /** ids of letters this module connects to in the constellation */
  connections: string[]
  cta?: { label: string; to: string }
}

export const MODULES: ModuleInfo[] = [
  {
    letter: 'A',
    glyph: 'mod-home',
    name: 'Social Hub',
    tagline: 'Your identity, alive.',
    description:
      'Your profile, friends, followers, status and life events — the warm center of your Kinjy presence, aware of every circle and language you speak.',
    bullets: ['Rich profiles & life events', 'Friends & followers graph', 'Status with audience controls'],
    connections: ['B', 'D', 'F', 'H'],
  },
  {
    letter: 'B',
    glyph: 'mod-globe-grid',
    name: 'Public Content',
    tagline: 'The whole world, drilled down.',
    description:
      'Geographic discovery that zooms from the planet to your street: Global → Continent → Region → Country → State → District → City → Neighborhood.',
    bullets: ['8-level geographic drill-down', 'Local voices surface first', 'Every post carries provenance'],
    connections: ['A', 'C', 'E', 'K', 'L'],
  },
  {
    letter: 'C',
    glyph: 'mod-forums',
    name: 'Forums',
    tagline: 'Structured discussion that remembers.',
    description:
      'Geographic and topic hierarchies with threaded discussion — and AI summaries that digest hundred-post threads into two honest lines.',
    bullets: ['Geographic + topic hierarchies', 'Deep threading, clean reading', 'AI thread summaries'],
    connections: ['B', 'E', 'N'],
  },
  {
    letter: 'D',
    glyph: 'mod-circles',
    name: 'Circles',
    tagline: 'Private networks, filtered your way.',
    description:
      'Family, Close Friends, Business, Customers — plus Smart Circles maintained by AI according to rules you set, not rules we sell.',
    bullets: ['Family · Close Friends · Business', 'Smart Circles by your rules', 'Post to exactly who matters'],
    connections: ['A', 'F', 'H'],
  },
  {
    letter: 'E',
    glyph: 'mod-community',
    name: 'Communities & Groups',
    tagline: 'Gather around anything.',
    description:
      'Public, private, secret or paid — communities with real governance, real privacy tiers and AI managers that keep them healthy.',
    bullets: ['Public / private / secret / paid', 'Member governance tools', 'AI community managers'],
    connections: ['B', 'C', 'J', 'K', 'N'],
  },
  {
    letter: 'F',
    glyph: 'mod-message',
    name: 'Private Messenger',
    tagline: 'Sealed by default.',
    description:
      'End-to-end encrypted messaging with voice & video calls and disappearing messages. Your words belong to the people in the room.',
    bullets: ['E2E encryption, always on', 'Voice & video calls', 'Disappearing messages'],
    connections: ['A', 'D', 'N'],
  },
  {
    letter: 'G',
    glyph: 'mod-creator',
    name: 'Creator Studio',
    tagline: 'Write once. Publish everywhere.',
    description:
      'An AI copilot and the One-to-Many Publishing Engine: one idea becomes an article, short & long video, audio, carousel, newsletter — and translations.',
    bullets: ['One-to-Many Publishing Engine', 'AI copilot, your voice', 'Auto-translation & dubbing'],
    connections: ['E', 'K', 'L', 'M', 'N'],
    cta: { label: 'Creator Studio →', to: '/creators' },
  },
  {
    letter: 'H',
    glyph: 'mod-family',
    name: 'Family Tree',
    tagline: 'Your bloodline, verified.',
    description:
      'A verified genealogy graph with infinite levels, corroboration workflows and the question every family asks: “How are we related?”',
    bullets: ['Verified relationship graph', 'Infinite generational levels', 'Path-finder between any two'],
    connections: ['A', 'D', 'I', 'N'],
    cta: { label: 'Explore Family Tree →', to: '/family' },
  },
  {
    letter: 'I',
    glyph: 'mod-candle',
    name: 'Digital Graveyard',
    tagline: 'Memory, kept with dignity.',
    description:
      'Memorials with candles and flowers, engraved QR codes on physical stones, legacy contacts and succession handled with care.',
    bullets: ['Candles, flowers & tributes', 'QR-linked physical memorials', 'Legacy contacts & succession'],
    connections: ['H', 'A', 'N'],
    cta: { label: 'Visit Memorials →', to: '/memorials' },
  },
  {
    letter: 'J',
    glyph: 'mod-calendar',
    name: 'Events',
    tagline: 'From invite to memory.',
    description:
      'Public and private events with ticketing, RSVPs and reminders — wired into communities, circles and your calendar.',
    bullets: ['Public & private events', 'Ticketing & RSVPs', 'Smart reminders'],
    connections: ['A', 'E', 'K'],
  },
  {
    letter: 'K',
    glyph: 'mod-storefront',
    name: 'Marketplace & Services',
    tagline: 'Honest commerce, transparent margins.',
    description:
      'Shops and services on a clear 20% margin model — sellers always know the math, buyers always know the price.',
    bullets: ['Shops & service listings', 'Transparent 20% markup', 'Escrowed until you confirm'],
    connections: ['B', 'E', 'G', 'J', 'L', 'M', 'O'],
    cta: { label: 'Explore Commerce →', to: '/commerce' },
  },
  {
    letter: 'L',
    glyph: 'mod-megaphone',
    name: 'Advertising Platform',
    tagline: 'Reach, without the creep.',
    description:
      'Auction floors from $0.50 CPM and an AI campaign builder that targets geography and context — never shadow profiles.',
    bullets: ['Auctions from $0.50 CPM', 'AI campaign builder', 'Geographic targeting, 20 km radius'],
    connections: ['B', 'G', 'K', 'N'],
    cta: { label: 'Advertising Engine →', to: '/commerce' },
  },
  {
    letter: 'M',
    glyph: 'mod-coins',
    name: 'Commission & Earnings',
    tagline: 'Growth that pays its people.',
    description:
      'One level: your sponsor earns 20% of Kinjy’s revenue on what you do. Plus Kinjy Leaders and KYC-gated payouts, on an immutable ledger you can audit.',
    bullets: ['One level · 20% of our revenue', 'Kinjy Leaders snapshots', 'KYC-gated payouts'],
    connections: ['A', 'G', 'K'],
  },
  {
    letter: 'N',
    glyph: 'mod-ai',
    name: 'AI Intelligence Layer',
    tagline: 'Woven through everything.',
    description:
      'Personal assistants, autonomous creator agents, community managers, forum assistants and knowledge vaults — an intelligent layer, not a feature.',
    bullets: ['Personal AI per user', 'Autonomous agents with approvals', 'Knowledge vaults'],
    connections: ['A', 'C', 'E', 'F', 'G', 'H', 'I', 'L', 'O'],
  },
  {
    letter: 'O',
    glyph: 'mod-code',
    name: 'Developer Platform',
    tagline: 'Open, agent-readable, yours to build on.',
    description:
      'REST & GraphQL APIs, webhooks, OAuth, an App Marketplace and agent-readable endpoints — even feed algorithms are publishable.',
    bullets: ['REST / GraphQL / webhooks', 'OAuth & App Marketplace', 'Publish feed algorithms'],
    connections: ['K', 'N', 'G'],
    cta: { label: 'Developer Platform →', to: '/developers' },
  },
]

/** Module lookup by letter. */
export const MODULE_BY_LETTER = new Map(MODULES.map((m) => [m.letter, m]))

/** Names of a module's connections, for the constellation side panel. */
export function connectionNames(letter: string): string[] {
  const m = MODULE_BY_LETTER.get(letter)
  if (!m) return []
  return m.connections.map((c) => MODULE_BY_LETTER.get(c)?.name ?? c)
}

/** Deduped edge list (pairs of letters) for the constellation. */
export const CONSTELLATION_EDGES: Array<[string, string]> = (() => {
  const seen = new Set<string>()
  const edges: Array<[string, string]> = []
  for (const m of MODULES) {
    for (const c of m.connections) {
      const key = [m.letter, c].sort().join('-')
      if (!seen.has(key)) {
        seen.add(key)
        edges.push([m.letter, c])
      }
    }
  }
  return edges
})()
