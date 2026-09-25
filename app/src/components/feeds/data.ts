import type { ProvenanceKind } from '@/components/ui-kit'

/* ------------------------------ Feed posts ------------------------------ */

export interface FeedPost {
  id: string
  author: string
  avatar: number
  verified?: boolean
  time: string
  minutesAgo: number
  location: string
  scope: 'local' | 'country' | 'global'
  text: string
  media: string // gradient class for the media placeholder
  provenance: ProvenanceKind
  engagement: number // likes count, drives For You / Trending
  circle?: boolean
  friend?: boolean
  recommended?: boolean
  topic?: string
  newCreator?: boolean
}

export const POSTS: FeedPost[] = [
  {
    id: 'p1',
    author: 'Demo K.',
    avatar: 1,
    verified: true,
    time: '18:42',
    minutesAgo: 12,
    location: 'Dar es Salaam',
    scope: 'local',
    text: 'Golden hour over the harbor — the whole city looked like it was breathing gold tonight.',
    media: 'from-[#2E2A6E] via-[#4A52E0]/60 to-[#D9A648]/50',
    provenance: 'original',
    engagement: 4820,
    friend: true,
    circle: true,
    topic: 'Design',
  },
  {
    id: 'p2',
    author: 'Baraka T.',
    avatar: 8,
    time: '17:15',
    minutesAgo: 99,
    location: 'Nairobi',
    scope: 'country',
    text: 'Our forum just crossed 10,000 members. Asante sana to everyone who believed early.',
    media: 'from-[#12304A] via-[#4A52E0]/50 to-[#8FB8E8]/40',
    provenance: 'verified',
    engagement: 9310,
    friend: true,
    recommended: true,
    topic: 'AI',
  },
  {
    id: 'p3',
    author: 'Zawadi J.',
    avatar: 7,
    verified: true,
    time: '15:03',
    minutesAgo: 231,
    location: 'Zanzibar',
    scope: 'country',
    text: 'Restored my grandmother’s 1968 portrait with Heritage AI. She cried. I cried.',
    media: 'from-[#3A2E14] via-[#D9A648]/40 to-[#F0C878]/30',
    provenance: 'ai-assisted',
    engagement: 12400,
    circle: true,
    recommended: true,
    topic: 'Family',
  },
  {
    id: 'p4',
    author: 'Diego M.',
    avatar: 10,
    time: '11:26',
    minutesAgo: 448,
    location: 'São Paulo',
    scope: 'global',
    text: 'Match analysis: why the 4-2-2-2 is quietly eating world football this season.',
    media: 'from-[#08131F] via-[#3FB27F]/30 to-[#2E2A6E]',
    provenance: 'edited',
    engagement: 15600,
    recommended: true,
    topic: 'Football',
  },
  {
    id: 'p5',
    author: 'Mei L.',
    avatar: 3,
    time: '09:58',
    minutesAgo: 536,
    location: 'Shanghai',
    scope: 'global',
    text: 'First post on Kinjy! Sharing my ink-wash studies — one per day for 100 days.',
    media: 'from-[#1A1F3B] via-[#8FB8E8]/25 to-[#F6F1E7]/20',
    provenance: 'original',
    engagement: 2140,
    newCreator: true,
    topic: 'Design',
  },
  {
    id: 'p6',
    author: 'Kito B.',
    avatar: 11,
    time: '08:11',
    minutesAgo: 643,
    location: 'Arusha',
    scope: 'local',
    text: 'Selling hand-woven kitenge bags at the Saturday market — first 20 get launch pricing.',
    media: 'from-[#3A2E4E] via-[#E07856]/40 to-[#D9A648]/40',
    provenance: 'original',
    engagement: 1180,
    newCreator: true,
    friend: true,
    circle: true,
  },
]

/* ------------------------------ Feed modes ------------------------------ */

export type FeedModeKey =
  | 'following' | 'foryou' | 'circles' | 'friends' | 'local'
  | 'country' | 'global' | 'topics' | 'trending' | 'new'

export interface FeedMode {
  key: FeedModeKey
  label: string
  caption: string
  /** ordered post ids for this mode */
  order: string[]
}

const byTime = [...POSTS].sort((a, b) => a.minutesAgo - b.minutesAgo).map((p) => p.id)
const byEngagement = [...POSTS].sort((a, b) => b.engagement - a.engagement).map((p) => p.id)

export const FEED_MODES: FeedMode[] = [
  { key: 'following', label: 'Following', caption: 'No ranking. No surprises.', order: byTime },
  { key: 'foryou', label: 'For You', caption: 'Personalized by your chosen algorithm — every pick explains itself.', order: byEngagement },
  { key: 'circles', label: 'Circles', caption: 'Only the circles you chose — family, close friends, business.', order: POSTS.filter((p) => p.circle).map((p) => p.id) },
  { key: 'friends', label: 'Friends', caption: 'Just your friends. Nobody else gets in.', order: POSTS.filter((p) => p.friend).map((p) => p.id) },
  { key: 'local', label: 'Local', caption: 'Within 20 km of you — Dar es Salaam first.', order: ['p1', 'p6', 'p3', 'p2', 'p5', 'p4'] },
  { key: 'country', label: 'Country', caption: 'Tanzania today — from the harbor to the highlands.', order: ['p1', 'p3', 'p6', 'p2', 'p4', 'p5'] },
  { key: 'global', label: 'Global', caption: 'The whole planet, translated as it arrives.', order: ['p4', 'p5', 'p2', 'p1', 'p3', 'p6'] },
  { key: 'topics', label: 'Topics', caption: 'Follow topics, not just people.', order: ['p1', 'p5', 'p4', 'p2', 'p3', 'p6'] },
  { key: 'trending', label: 'Trending', caption: 'What the world is talking about right now.', order: byEngagement },
  { key: 'new', label: 'New', caption: 'Fresh voices — new creators get their first sunlight here.', order: ['p5', 'p6', 'p1', 'p3', 'p2', 'p4'] },
]

/* --------------------------- Algorithm library -------------------------- */

export type AlgoCategory = 'People' | 'Places' | 'Interests' | 'Format' | 'Discovery'

export interface Algorithm {
  id: string
  glyph: string
  name: string
  promise: string
  publisher: string
  installs: number
  category: AlgoCategory
  community?: boolean
  note?: string
  /** feed order when previewed in the Section-2 demo */
  order: string[]
}

export const ALGORITHMS: Algorithm[] = [
  { id: 'chronological', glyph: 'algo-clock', name: 'Chronological', promise: 'Pure time order. Nothing hidden, nothing boosted.', publisher: 'By Kinjy', installs: 8412053, category: 'People', order: byTime },
  { id: 'friends-first', glyph: 'algo-friends', name: 'Friends First', promise: 'Your people before the noise — always near the top.', publisher: 'By Kinjy', installs: 6123847, category: 'People', order: ['p1', 'p2', 'p6', 'p3', 'p4', 'p5'] },
  { id: 'family-first', glyph: 'algo-family', name: 'Family First', promise: 'Your bloodline’s moments, always near the top.', publisher: 'By Kinjy', installs: 4891102, category: 'People', order: ['p3', 'p1', 'p6', 'p2', 'p5', 'p4'] },
  { id: 'local-news', glyph: 'algo-map-pin', name: 'Local News', promise: 'Your district first, then the city, then the world.', publisher: 'By Kinjy', installs: 3720455, category: 'Places', order: ['p1', 'p6', 'p3', 'p2', 'p4', 'p5'] },
  { id: 'business', glyph: 'algo-briefcase', name: 'Business', promise: 'Markets, margins and moves — commerce at the front.', publisher: 'By Kinjy', installs: 1540877, category: 'Interests', order: ['p6', 'p2', 'p4', 'p1', 'p3', 'p5'] },
  { id: 'technology', glyph: 'algo-chip', name: 'Technology', promise: 'Ship logs, breakthroughs and honest takes on tech.', publisher: 'By @devlabs', installs: 2286510, category: 'Interests', community: true, order: ['p2', 'p4', 'p5', 'p1', 'p3', 'p6'] },
  { id: 'entertainment', glyph: 'algo-film', name: 'Entertainment', promise: 'Film, music and the week’s best distractions.', publisher: 'By Kinjy', installs: 5102344, category: 'Interests', order: ['p4', 'p3', 'p2', 'p1', 'p5', 'p6'] },
  { id: 'learning', glyph: 'algo-book', name: 'Learning', promise: 'Every scroll teaches something worth keeping.', publisher: 'By @somaedu', installs: 987231, category: 'Interests', community: true, order: ['p2', 'p5', 'p4', 'p3', 'p1', 'p6'] },
  { id: 'politics', glyph: 'algo-scale', name: 'Politics', promise: 'Civic signal with receipts — sources ranked by verification.', publisher: 'By Kinjy', installs: 1204559, category: 'Interests', order: ['p2', 'p1', 'p4', 'p3', 'p6', 'p5'] },
  { id: 'positive', glyph: 'algo-sun', name: 'Positive Content', promise: 'A feed tuned for calm, craft and good news.', publisher: 'By Kinjy', installs: 3340821, category: 'Interests', note: 'Ranked for wellbeing — no outrage bait.', order: ['p3', 'p1', 'p5', 'p6', 'p2', 'p4'] },
  { id: 'longform', glyph: 'algo-longtext', name: 'Long-form', promise: 'Essays and deep reads. Bring coffee.', publisher: 'By Kinjy', installs: 764390, category: 'Format', order: ['p4', 'p2', 'p3', 'p1', 'p5', 'p6'] },
  { id: 'video-only', glyph: 'algo-video', name: 'Video Only', promise: 'Motion or nothing — pure video feed.', publisher: 'By Kinjy', installs: 4201876, category: 'Format', order: ['p4', 'p3', 'p1', 'p2', 'p5', 'p6'] },
  { id: 'audio-only', glyph: 'algo-waveform', name: 'Audio Only', promise: 'Voices, podcasts and soundscapes for your commute.', publisher: 'By Kinjy', installs: 1102945, category: 'Format', order: ['p2', 'p3', 'p4', 'p1', 'p6', 'p5'] },
  { id: 'new-creators', glyph: 'algo-sprout', name: 'New Creators', promise: 'First posts get real reach — discover tomorrow’s voices today.', publisher: 'By Kinjy', installs: 1865302, category: 'Discovery', order: ['p5', 'p6', 'p1', 'p3', 'p2', 'p4'] },
  { id: 'global-discovery', glyph: 'algo-globe', name: 'Global Discovery', promise: 'One post per country per hour — the planet in rotation.', publisher: 'By @mundial', installs: 12482, category: 'Discovery', community: true, order: ['p4', 'p5', 'p2', 'p1', 'p3', 'p6'] },
]

export const POST_BY_ID = new Map(POSTS.map((p) => [p.id, p]))
