/**
 * Kinjy API client.
 *
 * Everything goes through the gateway on a single origin (`/api`), which Vite
 * proxies to the gateway container in dev. No per-service URLs live in the
 * frontend — if a route moves between services, only the gateway changes.
 */

const BASE = import.meta.env.VITE_API_BASE ?? '/api'
/** For the few requests fetch() cannot make, such as uploads that report progress. */
export const API_BASE = BASE

const ACCESS_KEY = 'kaluta.access_token'
const REFRESH_KEY = 'kaluta.refresh_token'

export class ApiError extends Error {
  // Declared as fields rather than constructor parameter properties: this
  // project builds with `erasableSyntaxOnly`, which forbids the shorthand.
  readonly status: number
  readonly detail?: unknown

  constructor(status: number, message: string, detail?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  set({ access_token, refresh_token }: { access_token: string; refresh_token: string }) {
    localStorage.setItem(ACCESS_KEY, access_token)
    localStorage.setItem(REFRESH_KEY, refresh_token)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

/** Pull a readable message out of FastAPI's error shapes. */
function messageFrom(status: number, body: unknown): string {
  if (typeof body === 'string' && body) return body
  if (body && typeof body === 'object' && 'detail' in body) {
    const detail = (body as { detail: unknown }).detail
    if (typeof detail === 'string') return detail
    // 422 validation errors arrive as a list of {loc, msg}
    if (Array.isArray(detail)) {
      return detail
        .map((d) => (typeof d?.msg === 'string' ? d.msg : JSON.stringify(d)))
        .join(' · ')
    }
  }
  return `Request failed (${status})`
}

let refreshing: Promise<boolean> | null = null

/**
 * Swap an expired access token for a fresh one. Concurrent 401s share one call.
 * Also used by the realtime socket when the server closes it with 4401.
 */
export async function refreshAccessToken(): Promise<boolean> {
  const refresh_token = tokens.refresh
  if (!refresh_token) return false
  if (refreshing) return refreshing

  refreshing = (async () => {
    try {
      const response = await fetch(`${BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token }),
      })
      if (!response.ok) {
        tokens.clear()
        return false
      }
      tokens.set(await response.json())
      return true
    } catch {
      return false
    } finally {
      refreshing = null
    }
  })()

  return refreshing
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  /** Attach the bearer token when one is stored. Default true. */
  auth?: boolean
  /** Language the API should answer in. */
  lang?: string
  signal?: AbortSignal
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, auth = true, lang, headers, ...rest } = options

  const send = async (): Promise<Response> => {
    const finalHeaders = new Headers(headers)
    if (body !== undefined && !(body instanceof FormData)) {
      finalHeaders.set('Content-Type', 'application/json')
    }
    if (lang) finalHeaders.set('X-Lang', lang)
    const token = auth ? tokens.access : null
    if (token) finalHeaders.set('Authorization', `Bearer ${token}`)

    return fetch(`${BASE}${path}`, {
      ...rest,
      headers: finalHeaders,
      body:
        body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
    })
  }

  let response = await send()

  // One transparent retry after refreshing an expired access token.
  if (response.status === 401 && auth && tokens.refresh) {
    if (await refreshAccessToken()) response = await send()
  }

  if (response.status === 204) return undefined as T

  const text = await response.text()
  const payload = text ? safeJson(text) : null

  if (!response.ok) {
    throw new ApiError(response.status, messageFrom(response.status, payload), payload)
  }
  return payload as T
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}

/* ------------------------------------------------------------------ */
/* Typed endpoints — only what the frontend actually consumes today.   */
/* ------------------------------------------------------------------ */

export interface StackStatus {
  healthy: number
  total: number
  services: Record<string, { status: 'ok' | 'degraded' | 'down' }>
}

export interface EconomyRules {
  /** Always "direct", and always one level — kept on the wire so a client can
      tell a stale deployment from a current one rather than guessing. */
  programme: string
  levels: number
  sponsor_commission_pct: string
  leaders_pool_pct: string
  platform_pct: string
  basis: string
  marketplace: {
    markup_pct: string
    note: string
    worked_example: {
      seller_price: string
      customer_price: string
      kinjy_revenue: string
      sponsor_commission: string
      leaders_pool: string
    }
  }
  creator_revenue: { creator_pct: string; note: string }
  leaders: { pool_pct: string; pool_size: number; ranked_by: string; allocation: string }
  referral_pool: { entry_price: string; cap: number }
  escrow: {
    custodian: string
    licence: string
    auto_release_days: number
    note: string
  }
  payout: { threshold_usd: string; requires: string[] }
}

export interface SplitShare {
  beneficiary: string
  role: string
  amount: string
  reason: string
}

export interface Simulation {
  kind: string
  source: string
  basis: string
  distributed: string
  shares: SplitShare[]
}

export interface Algorithm {
  id: string
  name: string
  description: string
  builtin: boolean
  author_id: string | null
  installs: number
  weights: Record<string, number>
  filters: { topics: string | null; formats: string | null }
}

export interface FeedMode {
  id: string
  label: string
  ranked: boolean
  description: string
}

export interface AuthUser {
  id: string
  email: string
  handle: string
  display_name: string
  role: string
  lang: string
  kyc_verified: boolean
  referral_code: string
  status: string
}

export interface AuthResult {
  user: AuthUser
  tokens: { access_token: string; refresh_token: string; expires_in: number }
}

export interface Wallet {
  owner_id: string
  currency: string
  available: string
  pending: string
  lifetime_earned: string
  lifetime_paid: string
  payout_threshold: string
  payout_eligible: boolean
  blocked_by: string | null
}

export interface CommissionsPage {
  total: number
  /** { "marketplace_order": "12.40", "ad_purchase": "3.10", … }. There is one
      commission level, so the useful breakdown is by what generated it. */
  by_source: Record<string, string>
  items: Array<{
    id: string
    source_kind: string
    source_ref: string | null
    role: string
    amount: string
    status: string
    created_at: string
  }>
}

export interface PayoutEligibility {
  eligible: boolean
  blocked_by: string | null
  accrued_usd: string
  threshold_usd: string
  kyc_verified: boolean
  wallet_on_file: boolean
  action_required: string | null
}

export interface KycStatus {
  year: number
  fee_paid: boolean
  status: 'unverified' | 'pending' | 'verified' | 'rejected'
  attempts_used: number
  attempts_allowed: number
  verified_on?: string | null
  expires_on?: string | null
  fee_usd: string
}

export interface DeviceSession {
  id: string
  device_label: string | null
  user_agent: string | null
  ip: string | null
  created_at: string
  last_seen_at: string
  expires_at: string
  revoked_at: string | null
}

export interface Passkey {
  id: string
  label: string
  transports: string | null
  created_at: string
  last_used_at: string | null
}

/** What anyone can see: `GET /users/{handle}`. */
export interface Profile {
  user_id: string
  handle: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  cover_url: string | null
  /** ISO 3166 alpha-2, upper case. */
  country: string | null
  state: string | null
  city: string | null
  /** ISO 639 codes the member speaks, most fluent first, e.g. "fr,ln". */
  languages: string
  is_creator: boolean
  verified: boolean
  followers_count: number
  following_count: number
  created_at: string
}

/**
 * What only the owner sees: `GET /users/me`. The neighbourhood is a precise
 * location and never appears on the public profile.
 */
export interface MyProfile extends Profile {
  neighborhood: string | null
  /** Interface language: one Kinjy is translated into. */
  lang: string
}

/**
 * `PATCH /users/me`. Omit a field to leave it unchanged; `null` (or an empty
 * string) clears it. Images are referenced by the asset id returned by
 * `uploadProfileImage`, never by URL: the server refuses URLs.
 */
export interface ProfileUpdate {
  display_name?: string
  bio?: string | null
  avatar_asset_id?: string | null
  cover_asset_id?: string | null
  country?: string | null
  state?: string | null
  city?: string | null
  /** Adults only; refused (403) for younger members. */
  neighborhood?: string | null
  languages?: string
  lang?: string
}

/**
 * `GET /users/me/eligibility`: which age-gated fields the editor should offer.
 * A readout only; `PATCH /users/me` enforces the rule itself.
 */
export interface ProfileEligibility {
  neighborhood: boolean
}

export interface PostMedia {
  /** Null when data saver withheld it — the bytes were never sent. */
  url: string | null
  kind: string
  alt_text: string | null
  deferred?: boolean
  /** Measured client-side at upload; lets the player frame a clip without a jump. */
  width?: number | null
  height?: number | null
  duration_seconds?: number | null
}

export interface WhyFactor {
  factor: string
  label: string
  contribution: number
}

export interface ReactionSummary {
  counts: Record<string, number>
  total: number
  /** The viewer's own reaction, or null. */
  mine: string | null
}

export interface PostAuthor {
  handle: string
  display_name: string
  avatar_url: string | null
  verified: boolean
}

export interface Post {
  id: string
  author_id: string
  author: PostAuthor | null
  body: string
  format: string
  lang: string
  visibility: string
  circle_id: string | null
  community_id: string | null
  country: string | null
  city: string | null
  topics: string[]
  provenance: string
  series_id: string | null
  episode_number: number | null
  likes_count: number
  comments_count: number
  reposts_count: number
  views_count?: number
  /** The shared post, when this card is a repost. */
  repost_of?: Post | null
  reposted_by_me?: boolean
  created_at: string
  edited_at: string | null
  media: PostMedia[]
  reactions: ReactionSummary
  /** Author's own declaration; a minor's feed never carries these. */
  mature?: boolean
  /** True when the server trimmed this card for data saver. */
  data_saver?: boolean
  /** False when the member turned autoplay off. */
  autoplay?: boolean
  /** Present only on ranked feeds — the real score breakdown, not a blurb. */
  why: WhyFactor[] | null
}

export interface FeedPage {
  mode: string
  algorithm: string
  algorithm_name?: string
  ranked: boolean
  total_candidates?: number
  empty_reason?: string
  /**
   * The member's age could not be confirmed, so this feed was filtered as for
   * a minor and may be missing posts. Temporary; worth saying so on screen.
   */
  degraded?: boolean
  items: Post[]
}

export interface WhyExplanation {
  post_id: string
  mode: string
  ranked: boolean
  /** What put this post in the feed, before any ranking. */
  reasons: Array<{ kind: string; label: string }>
  explanation?: string
  algorithm?: string
  algorithm_name?: string
  score?: number
  factors: WhyFactor[]
  actions: string[]
}

export interface UploadedMedia {
  id: string
  url: string
  kind: string
  content_type?: string
  filename?: string
  size_bytes: number
  provenance: string
  provenance_signed: boolean
  alt_text?: string | null
  deduplicated?: boolean
}

export interface NewPost {
  body: string
  format?: string
  visibility?: string
  circle_id?: string
  topics?: string[]
  lang?: string
  country?: string
  city?: string
  provenance?: string
  /** The author declaring adult content, so minors' feeds can exclude it. */
  mature?: boolean
  media?: Array<{
    media_id: string
    url: string
    kind: string
    alt_text?: string | null
    /** Measured from the file before upload; the reel frames the clip with these. */
    width?: number | null
    height?: number | null
    duration_seconds?: number | null
  }>
}

export interface WellbeingStatus {
  enabled: boolean
  minutes_today: number
  limit_minutes: number | null
  remaining_minutes: number | null
  over_limit: boolean
}

export interface CommentAuthor {
  id: string
  handle: string
  display_name: string
  avatar_url: string | null
}

export interface CommentNode {
  id: string
  author_id: string
  author: CommentAuthor | null
  parent_id: string | null
  /** 0 = top level. Capped server-side; deeper replies flatten and mention. */
  depth: number
  reply_to: string | null
  reply_to_user: CommentAuthor | null
  body: string
  lang: string
  created_at: string
}

export interface PersonSuggestion {
  user_id: string
  handle: string
  display_name: string
  bio: string | null
  avatar_url: string | null
  city: string | null
  country: string | null
  followers_count: number
  verified: boolean
}

export interface Discoveries {
  reason: string
  communities: Array<{
    id: string
    slug: string
    name: string
    description: string
    kind: string
    members_count: number
  }>
  forums: Array<{ id: string; slug: string; name: string; hierarchy: string; threads_count: number }>
}

export interface ConnectionEntry {
  id: number
  user_id: string
  profile: { handle: string; display_name: string; avatar_url: string | null } | null
  status: string
  message: string | null
  created_at: string
}

export interface Permissions {
  connected: boolean
  pending?: boolean
  invited_by_me?: boolean
  can_message: boolean
  can_add_family: boolean
  can_add_community: boolean
  can_invite: boolean
  reason: string
}

export interface Privacy {
  who_can_invite: string
  who_can_message: string
  who_can_add_family: string
  who_can_add_community: string
  discoverable: boolean
}

/**
 * What a smart circle is made of: a relationship, optionally narrowed to where
 * people live. Evaluated on the server at every read — it holds no list.
 */
export interface CircleRule {
  source: 'connections' | 'followers' | 'following' | 'mutuals'
  country?: string | null
  city?: string | null
}

export interface Circle {
  id: string
  owner_id?: string
  name: string
  kind: string
  color?: string | null
  rule?: CircleRule | null
  /** Who a post shared to it would reach right now. */
  members_count: number
  created_at?: string
}

export interface CircleMember {
  user_id: string
  handle: string | null
  display_name: string | null
  avatar_url: string | null
  city: string | null
  verified: boolean
  /** False when the circle can no longer reach them (a block, or the age rule). */
  active: boolean
}

export interface CircleDetail extends Circle {
  members: CircleMember[]
}

export interface Community {
  id: string
  slug: string
  name: string
  description: string
  kind: string
  price_usd: string | null
  members_count: number
  country: string | null
  city: string | null
}

export interface Forum {
  id: string
  slug: string
  name: string
  hierarchy: string
  scope: string | null
  scope_value: string | null
  parent_id: string | null
  /** The community whose door applies, or null for a free-standing forum. */
  community_id: string | null
  /** That community and what the viewer is to it; null for a free-standing forum. */
  community: { id: string; name: string; kind: string; my_role: string | null; my_status: string | null } | null
  /** false on a sub-forum its creator opened to everyone. */
  inherit_access: boolean
  threads_count: number
}

export interface Thread {
  id: string
  title: string
  /** First ~200 characters of the body, on one line. */
  preview: string
  author_id: string
  replies_count: number
  views_count: number
  pinned: boolean
  /** Id of the original, when a steward marked this thread a duplicate. */
  duplicate_of: string | null
  ai_summary: string | null
  last_activity_at: string
}

export interface ThreadReply {
  id: string
  author_id: string
  parent_id: string | null
  body: string
  upvotes: number
  accepted_answer: boolean
  /** Votes up minus votes down. */
  score: number
  /** The viewer's own vote: 1, -1, or 0 for none. */
  my_vote: number
  created_at: string
  edited?: boolean
  edited_at?: string | null
}

export interface ThreadDetail {
  id: string
  title: string
  body: string
  author_id: string
  lang: string
  ai_summary: string | null
  locked: boolean
  pinned: boolean
  duplicate_of: { id: string; title: string } | null
  /** Whether to offer the moderation buttons. The routes check the rule again. */
  can_moderate: boolean
  accepted_reply_id: string | null
  replies: ThreadReply[]
}

export interface KnowledgeEntry {
  id: string
  question: string
  answer: string
  lang: string
  /** 0 to 1, from the discussion's own signal; reviewing does not change it. */
  confidence: number
  reviewed: boolean
  reviewed_by: string | null
  source_thread_id: string
  source_thread_title: string
  source_reply_id: string | null
  created_at: string
  /** Whether to offer Approve, Edit and Delete. The routes check the rule again. */
  can_review: boolean
}

/** A community I belong to or have asked to join. */
export interface MyCommunity {
  id: string
  slug: string
  name: string
  description: string
  kind: string
  price_usd: string | null
  members_count: number
  /** Who may open a forum in it: any member, or only the owner and moderators. */
  forum_creation: 'members' | 'stewards'
  avatar_url: string | null
  my_role: 'owner' | 'moderator' | 'member'
  my_status: 'active' | 'pending'
  joined_at: string
}

export interface InviteLink {
  id: string
  community_id: string
  max_uses: number | null
  uses: number
  expires_at: string | null
  revoked: boolean
  created_at: string
}

export interface CommunityInvitation {
  id: string
  community_id: string
  community_name: string | null
  inviter: { handle: string; display_name: string; avatar_url: string | null } | null
  expires_at: string
  created_at: string
}

export interface PersonBrief {
  handle: string
  display_name: string
  avatar_url?: string | null
  verified?: boolean
  city?: string | null
}

export interface Conversation {
  id: string
  kind: string
  title: string | null
  encrypted: boolean
  last_message_at: string
  participants: string[]
  /** Resolved by messaging-service so the list can show people, not ids. */
  profiles?: Record<string, PersonBrief>
  unread?: number
  /** Each participant's last read time — what "Seen" is drawn from. */
  read_state?: Record<string, string | null>
  /** Stored encrypted on the server (at rest) — not end to end. */
  sealed_at_rest?: boolean
  last_message?: {
    sender_id: string
    /** Text, or "Sent a photo: …" for an attachment. Never ciphertext. */
    preview: string
    media_kind: string | null
    created_at: string
  } | null
}

export interface Presence {
  online: boolean
  /** Unknown (null) after a server restart — never a guessed time. */
  last_seen: string | null
}

export interface Message {
  id: string
  sender_id: string
  encrypted: boolean
  ciphertext_b64: string | null
  body: string | null
  kind: string
  media_url?: string | null
  /** image | video | audio | document | file — as media-service classified it. */
  media_kind?: string | null
  media_name?: string | null
  media_type?: string | null
  media_size?: number | null
  created_at: string
}

export interface Person {
  id: string
  user_id?: string | null
  given_name: string
  family_name?: string | null
  gender?: string | null
  birth_date?: string | null
  death_date?: string | null
  deceased?: boolean
  photo_url?: string | null
  status?: string
  confirmations?: number
}

export interface FamilyTree {
  root: string
  depth: number
  nodes: Array<{
    person: Person
    /** 0 = the root, positive = ancestors, negative = descendants. */
    level: number
    relation: string
    closeness: number
    sibling_kind: string | null
  }>
  edges: Array<{ id: string; from: string; to: string; kind: string; status: string }>
}

export interface HowRelated {
  related: boolean
  relation: string
  steps?: number
  /** How much of the chain is corroborated — a path is as good as its weakest link. */
  verified_links?: number
  total_links?: number
  path: Array<{
    person_id: string
    name: string | null
    /** The stored edge kind. */
    step: string
    /** The derived relation to the person the path started from. */
    relation?: string
  }>
  common_ancestors?: Array<{ person_id: string; name: string | null }>
}

export interface Memorial {
  id: string
  full_name: string
  birth_date: string | null
  death_date: string | null
  biography: string | null
  /** Signed for this viewer, short-lived: never store or share them. */
  photo_url: string | null
  cover_url: string | null
  faith_style: string
  faith_style_source: string | null
  audio: { url: string | null; autoplay: boolean }
  qr_code: string
  qr_url: string
  visibility: 'public' | 'private'
  moderation: 'open' | 'pending_approval'
  /** unconfirmed → reported → under_review → verified */
  death_status: string
  verified_at: string | null
  tribute_counts: Record<string, number>
  /** Whether the viewer administers it. */
  is_admin: boolean
  /** Administrators only. */
  pending_tributes?: number
  /** Administrators only: 1 is the first in the succession, who alone may delete it. */
  admin_rank?: number
  grave: {
    lat: number | null
    lng: number | null
    label: string | null
    verified: boolean
    /** What the device said when it was captured at the grave, in metres. */
    accuracy_m: number | null
  }
  created_at: string
}

export interface Tribute {
  id: string
  kind: string
  author_name: string
  body: string | null
  media_url: string | null
  created_at: string
  status?: string
}

export interface MemorialEvent {
  id: string
  year: number
  month: number | null
  day: number | null
  title: string
  body: string | null
}

export interface MemorialAdmin {
  user_id: string
  succession_order: number
  handle: string | null
  display_name: string | null
  avatar_url: string | null
}

export interface DeathReviewItem {
  id: string
  full_name: string
  death_date: string | null
  death_status: string
  qr_code: string
  reports: Array<{ id: number; evidence: string; document_url: string | null; reported_by: string; created_at: string }>
}

export interface Product {
  id: string
  title: string
  description: string
  kind: string
  vendor_id: string
  customer_price: string
  currency: string
  country: string | null
  city: string | null
  images: string[]
}

export interface Order {
  id: string
  role: string | null
  product_id: string
  quantity: number
  customer_price: string
  vendor_price: string
  margin: string
  refunded_amount: string
  /** pending | in_escrow | delivered | settled | part_refunded | refunded | disputed | cancelled */
  status: string
  custodian: string | null
  custodian_name?: string
  escrow_funded_at: string | null
  delivered_at: string | null
  delivery_note: string | null
  dispute_window_ends: string | null
  escrow_released_at: string | null
  dispute_id?: string | null
  created_at: string
}

export interface EscrowTerms {
  custodian: string
  provider: string
  licence: string
  holds_funds: string
  released_when: string
  auto_release_days: number
  dispute_response_days: number
  arbitration_days: number
  outcomes: string[]
}

export interface DisputeMessage {
  author_id: string
  author_role: 'buyer' | 'seller' | 'kinjy'
  body: string
  evidence: string[]
  created_at: string
}

export interface Dispute {
  id: string
  order_id: string
  opened_by: string
  against: string
  role: 'buyer' | 'seller'
  category: string
  reason: string
  amount_claimed: string
  /** open | answered | arbitration | resolved | withdrawn */
  status: string
  outcome: string | null
  refund_amount: string
  resolution_note: string | null
  respond_by: string | null
  arbitrate_by: string | null
  resolved_at: string | null
  created_at: string
  messages?: DisputeMessage[]
}

export interface LeaderStanding {
  rank: number
  member_id: string
  direct_commissions: string
  share_ratio: string
  projected_payout: string
}

export interface LeaderBoard {
  period: string
  pool_amount: string
  pool_pct: string
  pool_size: number
  qualifying: number
  items: LeaderStanding[]
}

export interface MyLeaderStanding {
  period: string
  direct_commissions: string
  qualifying: boolean
  rank: number | null
  share_ratio: string | null
  projected_payout: string
  pool_amount: string
  pool_size: number
}

export interface ReferralPoolState {
  entry_price: string
  currency: string
  cap: number
  seats_taken: number
  seats_left: number
  open: boolean
  active_seats: number
  my_seat: {
    seat_id: string
    seat_number: number
    status: string
    assigned_count: number
    last_assigned_at: string | null
    joined_at: string
  } | null
  note: string
}

/* --- WebAuthn wire format ------------------------------------------------ */
/* The server speaks base64url JSON; the browser API speaks ArrayBuffers. These
   translate between the two — the only place in the app that needs to.        */

export interface PublicKeyCredentialCreationOptionsJSON {
  challenge: string
  rp: { id: string; name: string }
  user: { id: string; name: string; displayName: string }
  pubKeyCredParams: Array<{ type: 'public-key'; alg: number }>
  timeout?: number
  excludeCredentials?: Array<{ id: string; type: 'public-key'; transports?: string[] }>
  authenticatorSelection?: Record<string, unknown>
  attestation?: string
}

export interface PublicKeyCredentialRequestOptionsJSON {
  challenge: string
  timeout?: number
  rpId?: string
  allowCredentials?: Array<{ id: string; type: 'public-key'; transports?: string[] }>
  userVerification?: string
}

function fromB64Url(value: string): ArrayBuffer {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(padded + '='.repeat((4 - (padded.length % 4)) % 4))
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

function toB64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function parseCreationOptions(
  options: PublicKeyCredentialCreationOptionsJSON,
): PublicKeyCredentialCreationOptions {
  return {
    ...options,
    challenge: fromB64Url(options.challenge),
    user: { ...options.user, id: fromB64Url(options.user.id) },
    excludeCredentials: options.excludeCredentials?.map((c) => ({
      ...c,
      id: fromB64Url(c.id),
      transports: c.transports as AuthenticatorTransport[] | undefined,
    })),
  } as PublicKeyCredentialCreationOptions
}

function parseRequestOptions(
  options: PublicKeyCredentialRequestOptionsJSON,
): PublicKeyCredentialRequestOptions {
  return {
    ...options,
    challenge: fromB64Url(options.challenge),
    allowCredentials: options.allowCredentials?.map((c) => ({
      ...c,
      id: fromB64Url(c.id),
      transports: c.transports as AuthenticatorTransport[] | undefined,
    })),
  } as PublicKeyCredentialRequestOptions
}

function serializeCredential(credential: PublicKeyCredential): Record<string, unknown> {
  const response = credential.response as AuthenticatorAttestationResponse &
    AuthenticatorAssertionResponse
  const payload: Record<string, unknown> = {
    id: credential.id,
    rawId: toB64Url(credential.rawId),
    type: credential.type,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: toB64Url(response.clientDataJSON),
    } as Record<string, unknown>,
  }
  const inner = payload.response as Record<string, unknown>
  if (response.attestationObject) inner.attestationObject = toB64Url(response.attestationObject)
  if (response.authenticatorData) inner.authenticatorData = toB64Url(response.authenticatorData)
  if (response.signature) inner.signature = toB64Url(response.signature)
  if (response.userHandle) inner.userHandle = toB64Url(response.userHandle)
  return payload
}

/** Whether this browser can do passkeys at all. */
export const passkeysSupported = () =>
  typeof window !== 'undefined' && Boolean(window.PublicKeyCredential)

export interface SupervisionDisclosure {
  can_see: string[]
  cannot_see: string[]
  can_do: string[]
  cannot_do: string[]
  note: string
}

export interface SupervisionLink {
  id: string
  role: 'parent' | 'teen'
  parent_id: string
  teen_id: string
  status: 'invited' | 'active' | 'declined' | 'ended'
  invited_by: string
  created_at: string
  accepted_at: string | null
  ended_at: string | null
  ended_by: string | null
}

export interface SupervisionRequest {
  id: string
  setting: string
  requested_value: string
  status: 'pending' | 'approved' | 'declined'
  created_at: string
  answered_at?: string | null
  role: 'parent' | 'teen'
}

export interface SupervisionState {
  items: SupervisionLink[]
  requests: SupervisionRequest[]
  disclosure: SupervisionDisclosure
}

export interface SupervisedView {
  supervision: SupervisionLink
  settings: Record<string, unknown>
  time: { daily_limit_minutes: number | null; minutes_today: number }
  requests: Omit<SupervisionRequest, 'role'>[]
  not_included: string[]
}

export interface ModerationOverview {
  classified_total: number
  pending_review: number
  child_safety_escalations: number
  reports_24h: number
  reports_total: number
  appeals: {
    open: number
    overdue: number
    answered: number
    overturned: number
    overturn_rate: number | null
  }
}

export interface ReviewItem {
  content_id: string
  content_kind: string
  age_rating: string
  classifier_source: string
  confidence: number
  exploitation_risk: number
  levels: Record<string, number>
  body: string | null
  author_id: string | null
  media_count: number
  reports: number
  created_at: string
}

export interface AppealItem {
  id: string
  decision_id: string
  appellant_id: string
  grounds: string | null
  due_at: string
  overdue: boolean
  content_id: string | null
  content_kind: string | null
  action: string | null
  age_rating: string | null
  body_snapshot: string | null
  decided_by: string | null
}

export interface MyDecision {
  id: string
  content_id: string
  content_kind: string
  action: 'refused_publication' | 'restricted_by_rating' | 'restricted_by_reports' | 'human_review'
  age_rating: string
  decided_by: 'automatic' | 'a reviewer'
  appealable: boolean
  created_at: string
  appeal: {
    id: string
    status: 'open' | 'upheld' | 'overturned'
    created_at: string
    answered_at: string | null
    reviewer_note: string | null
  } | null
}

export const kaluta = {
  status: () => api.get<StackStatus>('/status', { auth: false }),

  economy: {
    rules: () => api.get<EconomyRules>('/ledger/rules', { auth: false }),
    simulate: (kind: Simulation['kind'], amount: string | number) =>
      api.post<Simulation>('/ledger/simulate', { kind, amount: String(amount) }, { auth: false }),
    marketplacePricing: (vendorPrice: string | number) =>
      api.get<Record<string, string>>(`/commerce/pricing?vendor_price=${vendorPrice}`, { auth: false }),
  },

  calls: {
    /**
     * Relay one WebRTC signal. The media itself never touches the server —
     * this only introduces the two browsers to each other.
     *
     * Without a TURN relay a call between peers behind symmetric NATs will not
     * connect; the UI must say so rather than spin.
     */
    signal: (input: {
      conversation_id: string
      signal: 'offer' | 'answer' | 'candidate' | 'hangup' | 'reject' | 'busy'
      payload?: Record<string, unknown>
      media?: 'audio' | 'video'
    }) => api.post<{ delivered: number; reachable: boolean }>('/calls/signal', input),
  },

  notifications: {
    list: (unreadOnly = false) =>
      api.get<{
        unread: number
        items: Array<{
          id: number
          kind: string
          title: string
          body: string | null
          link: string | null
          read: boolean
          created_at: string
        }>
      }>(`/notifications${unreadOnly ? '?unread_only=true' : ''}`),
    markRead: () => api.post<{ read: boolean }>('/notifications/read'),
  },

  creators: {
    /**
     * One-to-Many (blueprint §Creator Studio): one idea, several formats.
     *
     * Targets that need a media pipeline come back `unsupported` with the
     * reason rather than sitting queued forever, so the UI can say why.
     */
    publish: (input: {
      source_text: string
      source_lang: string
      targets: string[]
      target_langs?: string[]
      source_ref?: string
    }) =>
      api.post<{
        job_id: string
        status: string
        outputs: number
        ready: number
        unsupported: string[]
      }>('/creators/publish', { source_kind: 'text', ...input }),

    job: (jobId: string) =>
      api.get<{
        job_id: string
        status: string
        outputs: Array<{
          target: string
          lang: string
          status: string
          content: string | null
          media_url: string | null
          provenance: string
          error: string | null
        }>
      }>(`/creators/publish/${jobId}`),

    enable: () => api.post<{ enabled: boolean }>('/creators/enable'),
  },

  shorts: {
    /** The vertical reel — posts published as shorts, newest first. */
    page: (params: { limit?: number; offset?: number; author?: string } = {}) => {
      const query = new URLSearchParams()
      query.set('limit', String(params.limit ?? 12))
      if (params.offset) query.set('offset', String(params.offset))
      if (params.author) query.set('author', params.author)
      return api.get<{
        items: Post[]
        has_more: boolean
        applied_settings: { age_mode?: string; autoplay_media?: boolean; degraded?: boolean }
      }>(`/shorts?${query}`)
    },
  },

  people: {
    /**
     * Find someone to message. Honours their `discoverable` setting, so a
     * member who opted out simply does not appear.
     */
    search: (q: string, limit = 10) =>
      api.get<{ items: Array<PersonBrief & { user_id: string }> }>(
        `/users/search?q=${encodeURIComponent(q)}&limit=${limit}`,
      ),
  },

  feeds: {
    modes: () => api.get<{ modes: FeedMode[] }>('/feed/modes', { auth: false }),
    algorithms: () => api.get<{ items: Algorithm[] }>('/algorithms', { auth: false }),

    page: (
      params: { mode: string; algorithm_id?: string; city?: string; country?: string; topic?: string; limit?: number },
      options: { signal?: AbortSignal } = {},
    ) => {
      const query = new URLSearchParams({ mode: params.mode })
      if (params.algorithm_id) query.set('algorithm_id', params.algorithm_id)
      if (params.city) query.set('city', params.city)
      if (params.country) query.set('country', params.country)
      if (params.topic) query.set('topic', params.topic)
      query.set('limit', String(params.limit ?? 20))
      return api.get<FeedPage>(`/feed?${query}`, { signal: options.signal })
    },

    /** The score breakdown for one post, for this viewer, under this algorithm. */
    why: (postId: string, algorithmId: string, mode = 'new') =>
      api.get<WhyExplanation>(
        `/feed/why/${postId}?algorithm_id=${algorithmId}&mode=${encodeURIComponent(mode)}`,
      ),

    /** "Show less like this" — stored and honoured on the next feed build. */
    signal: (input: { kind: string; target_type: string; target_id: string }) =>
      api.post<{ recorded: boolean; applies_from: string }>('/feed/signals', input),
  },

  posts: {
    create: (post: NewPost) => api.post<Post>('/posts', post),
    get: (id: string) => api.get<Post>(`/posts/${id}`),
    /** Ask for media data saver withheld — "load it anyway", for this post only. */
    media: (id: string) => api.get<{ post_id: string; media: PostMedia[] }>(`/posts/${id}/media`),
    byAuthor: (userId: string, limit = 20) =>
      api.get<{ total: number; items: Post[] }>(`/posts/by/${userId}?limit=${limit}`),
    remove: (id: string) => api.delete<void>(`/posts/${id}`),
    /** Share to your own audience. A body makes it a quote rather than a plain share. */
    repost: (id: string, body = '') => api.post<Post>(`/posts/${id}/repost`, { body }),
    undoRepost: (id: string) => api.delete<void>(`/posts/${id}/repost`),
    /**
     * Report posts that were actually on screen. Batched, and deduplicated by
     * the server, so the figure means "people who saw this".
     */
    views: (postIds: string[]) =>
      api.post<{ recorded: number; counts: Record<string, number> }>('/posts/views', {
        post_ids: postIds,
      }),
    like: (id: string) => api.post<{ liked: boolean; likes_count: number }>(`/posts/${id}/like`),
    /** Set, switch or clear a reaction. Tapping the current one clears it. */
    react: (id: string, kind: string) =>
      api.post<{ post_id: string; reactions: ReactionSummary }>(`/posts/${id}/react`, { kind }),
    comments: (id: string) =>
      api.get<{ max_depth: number; items: CommentNode[] }>(`/posts/${id}/comments`),
    comment: (id: string, body: string, parentId?: string) =>
      api.post<{ id: string; created_at: string; depth: number; parent_id: string | null; reply_to: string | null }>(
        `/posts/${id}/comments`,
        { body, parent_id: parentId },
      ),
  },

  media: {
    /**
     * Upload a file and get back its public URL.
     *
     * The provenance label travels with the upload, not with the post: the
     * asset keeps its own label so a photo re-used elsewhere stays labelled.
     */
    async upload(file: File, provenance = 'original', altText?: string): Promise<UploadedMedia> {
      const form = new FormData()
      form.append('file', file)
      form.append('provenance', provenance)
      if (altText) form.append('alt_text', altText)
      return api.post<UploadedMedia>('/media/upload', form)
    },

    /**
     * Upload with real progress.
     *
     * fetch() cannot report how much of a request body has been sent, so a
     * "uploading…" spinner on a 40 MB clip tells the member nothing for a
     * minute. XHR can, and a video upload is exactly where that matters.
     */
    uploadWithProgress(
      file: File,
      onProgress: (fraction: number) => void,
      options: {
        provenance?: string
        altText?: string
        signal?: AbortSignal
        /** 'chat' accepts any file type; a post only formats every browser renders. */
        purpose?: 'post' | 'chat'
      } = {},
    ): Promise<UploadedMedia> {
      const form = new FormData()
      form.append('file', file)
      form.append('provenance', options.provenance ?? 'original')
      form.append('purpose', options.purpose ?? 'post')
      if (options.altText) form.append('alt_text', options.altText)

      // XHR bypasses request(), so it also bypasses its refresh-on-401: an
      // upload started after the access token expired would simply fail.
      const attempt = (retried: boolean): Promise<UploadedMedia> => new Promise<UploadedMedia>((resolve, reject) => {
        const request = new XMLHttpRequest()
        request.open('POST', `${BASE}/media/upload`)
        const token = tokens.access
        if (token) request.setRequestHeader('Authorization', `Bearer ${token}`)

        request.upload.onprogress = (event) => {
          if (event.lengthComputable) onProgress(event.loaded / event.total)
        }
        request.onload = () => {
          let payload: unknown = null
          try {
            payload = JSON.parse(request.responseText)
          } catch {
            payload = null
          }
          if (request.status >= 200 && request.status < 300) {
            onProgress(1)
            resolve(payload as UploadedMedia)
          } else if (request.status === 401 && !retried && tokens.refresh) {
            onProgress(0)
            void refreshAccessToken().then((ok) =>
              ok ? attempt(true).then(resolve, reject) : reject(new ApiError(401, 'Your session expired — sign in again')),
            )
          } else {
            const detail = (payload as { detail?: string } | null)?.detail
            reject(new ApiError(request.status, detail ?? `Upload failed (${request.status})`, payload))
          }
        }
        request.onerror = () => reject(new ApiError(0, 'The upload could not reach the server'))
        request.onabort = () => reject(new ApiError(0, 'Upload cancelled'))
        options.signal?.addEventListener('abort', () => request.abort())
        request.send(form)
      })
      return attempt(false)
    },
  },

  ai: {
    /**
     * One-click translation (blueprint §14).
     *
     * `source_lang` should be the *declared* language of the content when we
     * have one: the server's detector only separates scripts and falls back to
     * English, so it cannot tell Swahili from French. Passing the author's
     * declared language avoids a confidently wrong guess.
     */
    translate: (text: string, target_lang: string, source_lang?: string) =>
      api.post<{
        translated: string
        source_lang: string
        provider?: string
        mock?: boolean
        cached: boolean
        noop?: boolean
      }>('/ai/translate', { text, target_lang, source_lang }, { auth: false }),
  },

  social: {
    follow: (userId: string) => api.post<{ following: boolean }>(`/users/${userId}/follow`),
    unfollow: (userId: string) => api.delete<void>(`/users/${userId}/follow`),
  },

  /**
   * Connections — mutual, unlike follows. Acceptance is what unlocks
   * messaging, family links and community invites.
   */
  connections: {
    list: () =>
      api.get<{ incoming: ConnectionEntry[]; outgoing: ConnectionEntry[]; accepted: ConnectionEntry[] }>(
        '/connections',
      ),
    invite: (userId: string, message?: string) =>
      api.post<{ status: string; already?: boolean; note?: string }>(`/connections/${userId}`, { message }),
    respond: (userId: string, accept: boolean) =>
      api.post<{ status: string }>(`/connections/${userId}/respond?accept=${accept}`),
    remove: (userId: string) => api.delete<void>(`/connections/${userId}`),
    with: (userId: string) => api.get<Permissions>(`/connections/with/${userId}`),
  },

  suggestions: {
    people: (limit = 4) =>
      api.get<{ reason: string; items: PersonSuggestion[] }>(`/users/suggestions?limit=${limit}`),
    places: (limit = 3) => api.get<Discoveries>(`/discover?limit=${limit}`),
  },

  circles: {
    list: () => api.get<Circle[]>('/circles'),
    /** One circle and its members — its owner only. */
    get: (id: string) => api.get<CircleDetail>(`/circles/${id}`),
    create: (input: { name: string; kind?: string; color?: string; rule?: CircleRule }) =>
      api.post<CircleDetail>('/circles', { kind: 'custom', ...input }),
    update: (id: string, patch: { name?: string; kind?: string; color?: string | null; rule?: CircleRule }) =>
      api.patch<CircleDetail>(`/circles/${id}`, patch),
    remove: (id: string) => api.delete<void>(`/circles/${id}`),
    addMember: (circleId: string, memberId: string) =>
      api.post<{ added: boolean; already?: boolean; members_count?: number }>(
        `/circles/${circleId}/members/${memberId}`,
      ),
    removeMember: (circleId: string, memberId: string) =>
      api.delete<void>(`/circles/${circleId}/members/${memberId}`),
  },

  communities: {
    /** The communities I belong to or have asked to join, newest first. */
    mine: () => api.get<{ items: MyCommunity[] }>('/communities/mine'),

    /** One community. A secret one answers 404 unless you are a member. */
    get: (id: string) =>
      api.get<{
        id: string
        slug: string
        name: string
        description: string
        kind: string
        price_usd: string | null
        members_count: number
        forum_creation: 'members' | 'stewards'
        my_role: string | null
        my_status: string | null
      }>(`/communities/${id}`),

    /** The roll and the queue waiting on it. Owner and moderators only. */
    members: (id: string, status?: string) =>
      api.get<{
        items: Array<{
          user_id: string
          role: string
          status: string
          joined_at: string
          profile: { handle: string; display_name: string; avatar_url: string | null } | null
        }>
      }>(`/communities/${id}/members${status ? `?status=${status}` : ''}`),

    act: (id: string, userId: string, action: 'approve' | 'reject' | 'ban' | 'unban' | 'promote' | 'demote') =>
      api.post<{ ok: boolean; action: string }>(`/communities/${id}/members/${userId}`, { action }),

    list: (params: { q?: string; country?: string; limit?: number } = {}) => {
      const query = new URLSearchParams()
      if (params.q) query.set('q', params.q)
      if (params.country) query.set('country', params.country)
      query.set('limit', String(params.limit ?? 30))
      return api.get<{ total: number; items: Community[] }>(`/communities?${query}`, { auth: false })
    },
    create: (input: {
      name: string
      description?: string
      kind?: string
      price_usd?: number
      country?: string
      /** Who may open forums: any member (default) or only the owner and moderators. */
      forum_creation?: 'members' | 'stewards'
    }) => api.post<{ id: string; slug: string; kind: string }>('/communities', { kind: 'public', ...input }),
    join: (id: string) => api.post<{ joined: boolean; status: string }>(`/communities/${id}/join`),

    /** Add one of your accepted connections straight away, with no question asked. */
    add: (id: string, userId: string) =>
      api.post<{ invited: boolean; status: string; already?: boolean }>(`/communities/${id}/invite`, {
        user_id: userId,
      }),

    /** Secret communities: ask someone, who accepts or declines. */
    invite: (id: string, userId: string) =>
      api.post<{ id: string; status: string; expires_at: string }>(`/communities/${id}/invitations`, {
        user_id: userId,
      }),
    myInvitations: () => api.get<{ items: CommunityInvitation[] }>('/communities/me/invitations'),
    acceptInvitation: (invitationId: string) =>
      api.post<{ status: string; community_id?: string }>(`/communities/invitations/${invitationId}/accept`),
    declineInvitation: (invitationId: string) =>
      api.post<{ status: string }>(`/communities/invitations/${invitationId}/decline`),

    /** Secret communities: links that owners and moderators mint and can cancel. */
    links: (id: string) =>
      api.get<{ items: InviteLink[] }>(`/communities/${id}/links`),
    createLink: (id: string, input: { max_uses?: number; expires_at?: string } = {}) =>
      api.post<InviteLink & { token: string }>(`/communities/${id}/links`, input),
    revokeLink: (id: string, linkId: string) =>
      api.delete<{ revoked: boolean }>(`/communities/${id}/links/${linkId}`),
    redeemLink: (token: string) =>
      api.post<{ joined?: boolean; status: string; already?: boolean; community_id?: string }>(
        '/communities/links/redeem',
        { token },
      ),

    /**
     * A paid community is joined by paying. The price is the community's, not
     * the caller's; without a live payment rail the checkout is a mock that
     * `settleMock` completes.
     */
    checkout: (communityId: string, amount: number) =>
      api.post<{ payment_id: string; rail: string; mock: boolean; amount: string; checkout_url?: string | null }>(
        '/payments/checkout',
        { purpose: 'community_membership', amount, reference: communityId, rail: 'mock' },
      ),
    settleMock: (paymentId: string) =>
      api.post<{ payment_id: string; status: string; mock: boolean }>(`/payments/${paymentId}/mock-settle`),

    /** Leave. The owner and a banned member cannot; the message says what it cost. */
    leave: (id: string) =>
      api.post<{ left: boolean; community_id: string; message: string }>(`/communities/${id}/leave`),
    /** Owner only. The kind never changes; price_usd only for a paid community. */
    edit: (
      id: string,
      input: {
        name?: string
        description?: string
        avatar_url?: string | null
        country?: string | null
        city?: string | null
        price_usd?: number
        forum_creation?: 'members' | 'stewards'
      },
    ) =>
      api.patch<{
        id: string
        name: string
        description: string
        price_usd: string | null
        forum_creation: 'members' | 'stewards'
      }>(`/communities/${id}`, input),
    /** Owner only. Deletes the community with its forums, threads and replies. */
    remove: (id: string) => api.delete<{ deleted: boolean }>(`/communities/${id}`),
  },

  forums: {
    /**
     * Digest a long thread. Refuses short ones on purpose — a summary of six
     * replies is a worse version of scrolling.
     */
    summary: (threadId: string, lang = 'en') =>
      api.get<{
        summarised: boolean
        reason?: string
        summary?: string
        replies_counted: number
        provider?: string
        model?: string
        mock?: boolean
      }>(`/threads/${threadId}/summary?lang=${lang}`),

    // The calls below send the member's token when there is one: a forum's door
    // depends on who is asking, so an anonymous call would be refused a private
    // community's forum even for a member. Signed out, no token is sent.
    list: (params: { hierarchy?: string; scope?: string; parent_id?: string; community_id?: string } = {}) => {
      const query = new URLSearchParams()
      if (params.hierarchy) query.set('hierarchy', params.hierarchy)
      if (params.scope) query.set('scope', params.scope)
      if (params.parent_id) query.set('parent_id', params.parent_id)
      if (params.community_id) query.set('community_id', params.community_id)
      return api.get<{ geo_scopes: string[]; items: Forum[] }>(`/forums?${query}`)
    },
    create: (input: {
      name: string
      description?: string
      hierarchy?: string
      scope?: string
      scope_value?: string
      parent_id?: string
      /** Attach a top-level forum to a community you run. A sub-forum takes its parent's. */
      community_id?: string
      /** Sub-forums only. false opens it to everyone instead of following its parent's door. */
      inherit_access?: boolean
    }) =>
      api.post<{ id: string; slug: string }>('/forums', { hierarchy: 'topic', ...input }),
    threads: (forumId: string) => api.get<{ items: Thread[] }>(`/forums/${forumId}/threads`),
    createThread: (forumId: string, input: { title: string; body: string; lang?: string }) =>
      api.post<{ id: string }>(`/forums/${forumId}/threads`, input),
    thread: (threadId: string) => api.get<ThreadDetail>(`/threads/${threadId}`),
    reply: (threadId: string, body: string, parentId?: string) =>
      api.post<{ id: string }>(`/threads/${threadId}/replies`, { body, parent_id: parentId }),

    /** Moderation. Owners and moderators of the thread's community only. */
    pin: (threadId: string) => api.post<{ pinned: boolean }>(`/threads/${threadId}/pin`),
    unpin: (threadId: string) => api.delete<{ pinned: boolean }>(`/threads/${threadId}/pin`),
    lock: (threadId: string) => api.post<{ locked: boolean }>(`/threads/${threadId}/lock`),
    unlock: (threadId: string) => api.delete<{ locked: boolean }>(`/threads/${threadId}/lock`),
    markDuplicate: (threadId: string, originalId: string) =>
      api.post<{ id: string; duplicate_of: string | null; locked: boolean }>(`/threads/${threadId}/duplicate`, {
        original_id: originalId,
      }),
    unmarkDuplicate: (threadId: string) =>
      api.delete<{ id: string; duplicate_of: string | null; locked: boolean }>(`/threads/${threadId}/duplicate`),

    /** The thread's author or a moderator marks the reply that solved it. */
    accept: (threadId: string, replyId: string) =>
      api.post<{ accepted_reply_id: string | null }>(`/threads/${threadId}/replies/${replyId}/accept`),
    unaccept: (threadId: string, replyId: string) =>
      api.delete<{ accepted_reply_id: string | null }>(`/threads/${threadId}/replies/${replyId}/accept`),
    /** value: 1 up, -1 down, 0 takes the vote back. */
    vote: (threadId: string, replyId: string, value: 1 | -1 | 0) =>
      api.put<{ reply_id: string; score: number; my_vote: number }>(
        `/threads/${threadId}/replies/${replyId}/vote`,
        { value },
      ),

    /** Edit and delete: the author edits; the author or a moderator deletes. */
    editThread: (threadId: string, input: { title?: string; body?: string }) =>
      api.patch<{ id: string; title: string; body: string }>(`/threads/${threadId}`, input),
    deleteThread: (threadId: string) => api.delete<{ deleted: boolean }>(`/threads/${threadId}`),
    editReply: (threadId: string, replyId: string, body: string) =>
      api.patch<{ id: string; body: string; edited: boolean; edited_at: string }>(
        `/threads/${threadId}/replies/${replyId}`,
        { body },
      ),
    deleteReply: (threadId: string, replyId: string) =>
      api.delete<{ deleted: boolean }>(`/threads/${threadId}/replies/${replyId}`),

    /** Knowledge base: accepted answers, cited. Review, edit and delete are for stewards. */
    knowledge: (forumId: string, params: { q?: string; reviewed?: boolean } = {}) => {
      const query = new URLSearchParams()
      if (params.q) query.set('q', params.q)
      if (params.reviewed !== undefined) query.set('reviewed', String(params.reviewed))
      const suffix = query.toString()
      return api.get<{ items: KnowledgeEntry[] }>(`/forums/${forumId}/knowledge${suffix ? `?${suffix}` : ''}`)
    },
    reviewKnowledge: (entryId: string) =>
      api.post<{ id: string; reviewed: boolean; reviewed_by: string }>(`/forums/knowledge/${entryId}/review`),
    editKnowledge: (entryId: string, input: { question?: string; answer?: string }) =>
      api.patch<{ id: string; question: string; answer: string; reviewed: boolean }>(
        `/forums/knowledge/${entryId}`,
        input,
      ),
    deleteKnowledge: (entryId: string) => api.delete<{ deleted: boolean }>(`/forums/knowledge/${entryId}`),
  },

  messages: {
    /** Turn disappearing messages on (seconds) or off (0) for a conversation. */
    setDisappearing: (conversationId: string, seconds: number) =>
      api.post<{ seconds: number }>(`/conversations/${conversationId}/disappearing`, { seconds }),
    conversations: () => api.get<{ items: Conversation[] }>('/conversations'),
    /** The Messages badge: unread messages from others, and in how many threads. */
    unreadCount: () => api.get<{ messages: number; conversations: number }>('/conversations/unread-count'),
    start: (participantIds: string[]) =>
      api.post<{ id: string; encrypted: boolean; existing: boolean }>('/conversations', {
        participant_ids: participantIds,
        kind: participantIds.length > 1 ? 'group' : 'direct',
        // Opt out of E2E for this demo surface: the server refuses plaintext in
        // an encrypted conversation, and no key exchange is implemented yet.
        encrypted: false,
      }),
    /**
     * A page of the thread, oldest first. `after` catches up after a
     * reconnect; `before` pages back through history.
     */
    list: (conversationId: string, options: { after?: string; before?: string } = {}) => {
      const query = new URLSearchParams()
      if (options.after) query.set('after', options.after)
      if (options.before) query.set('before', options.before)
      const qs = query.toString()
      return api.get<{ items: Message[] }>(
        `/conversations/${conversationId}/messages${qs ? `?${qs}` : ''}`,
      )
    },
    /**
     * Text, an uploaded attachment (`mediaId`), or both. `clientId` makes a
     * retry idempotent: the same id is never stored twice.
     */
    send: (
      conversationId: string,
      message: { body?: string | null; mediaId?: string; clientId?: string },
    ) =>
      api.post<{ id: string; created_at: string; client_id: string | null; duplicate?: boolean }>(
        `/conversations/${conversationId}/messages`,
        {
          body: message.body || null,
          kind: message.mediaId ? 'media' : 'text',
          media_id: message.mediaId,
          client_id: message.clientId,
        },
      ),
    /** The thread is on screen: record it as read and tell the room. */
    markRead: (conversationId: string) =>
      api.post<{ read_at: string }>(`/conversations/${conversationId}/read`),
    /** Online state for connections and conversation partners; others are omitted. */
    presence: (userIds: string[]) =>
      api.get<{ items: Record<string, Presence> }>(
        `/presence?ids=${encodeURIComponent(userIds.join(','))}`,
      ),
  },

  family: {
    /** Searches your own family only — the server scopes it to your graph. */
    search: (q: string) => api.get<{ items: Person[] }>(`/family/search?q=${encodeURIComponent(q)}`),
    addPerson: (input: Partial<Person> & { given_name: string }) =>
      api.post<Person>('/family/persons', input),
    tree: (personId: string, depth = 3) =>
      // Authenticated on purpose: the tree is family-only, and the server
      // refuses a caller with no part in it.
      api.get<FamilyTree>(`/family/tree/${personId}?depth=${depth}`),
    /** Browse — what the tree screen opens with. Search needs a real query. */
    persons: (limit = 30) => api.get<{ items: Person[] }>(`/family/persons?limit=${limit}`),
    link: (input: { from_person_id: string; to_person_id: string; kind: string }) =>
      api.post<{ id: string; status: string }>('/family/relationships', input),
    howRelated: (from: string, to: string) =>
      api.get<HowRelated>(`/family/how-related?from_person=${from}&to_person=${to}`),
    confirm: (personId: string, decision: 'confirm' | 'dispute', note?: string) =>
      api.post<{ status: string; confirmations: number; threshold: number }>(
        `/family/persons/${personId}/confirm`,
        { decision, note },
      ),
  },

  memorials: {
    /**
     * Browse the graveyard. Public on purpose: a memorial exists to be
     * visited, and requiring an account to find a grave is the wrong default.
     * `mine` lists the memorials you look after instead, private ones included.
     */
    list: (params: { q?: string; mine?: boolean; limit?: number } = {}) => {
      const query = new URLSearchParams()
      if (params.q) query.set('q', params.q)
      if (params.mine) query.set('mine', 'true')
      query.set('limit', String(params.limit ?? 30))
      return api.get<{ total: number; items: Memorial[] }>(`/memorials?${query}`)
    },
    create: (input: {
      full_name: string
      birth_date?: string
      death_date?: string
      biography?: string
      visibility?: 'public' | 'private'
    }) => api.post<Memorial>('/memorials', input),
    get: (id: string) => api.get<Memorial>(`/memorials/${id}`),
    byQr: (code: string) => api.get<Memorial>(`/memorials/qr/${encodeURIComponent(code)}`),
    update: (
      id: string,
      patch: Partial<{
        full_name: string
        birth_date: string | null
        death_date: string | null
        biography: string | null
        visibility: 'public' | 'private'
        moderation: 'open' | 'pending_approval'
        faith_style: string
        faith_style_source: 'documented_wish' | 'admin_choice' | null
        photo_media_id: string | null
        cover_media_id: string | null
        audio_media_id: string | null
        audio_autoplay: boolean
      }>,
    ) => api.patch<Memorial>(`/memorials/${id}`, patch),
    remove: (id: string) => api.delete<void>(`/memorials/${id}`),

    /**
     * Approved tributes, newest first. `kind` is one kind or several joined by
     * commas — the guest book asks for `message,photo` so candles cannot push
     * the words off the first page. `counts` is always whole; `total` follows
     * the filter.
     */
    tributes: (id: string, opts: { kind?: string; limit?: number; offset?: number } = {}) => {
      const query = new URLSearchParams()
      if (opts.kind) query.set('kind', opts.kind)
      if (opts.limit) query.set('limit', String(opts.limit))
      if (opts.offset) query.set('offset', String(opts.offset))
      const qs = query.toString()
      return api.get<{ total: number; counts: Record<string, number>; items: Tribute[] }>(
        `/memorials/${id}/tributes${qs ? `?${qs}` : ''}`,
      )
    },
    tribute: (id: string, input: { kind: string; author_name?: string; body?: string; media_id?: string }) =>
      api.post<{ id: string; status: string }>(`/memorials/${id}/tributes`, input),
    pendingTributes: (id: string) => api.get<{ items: Tribute[] }>(`/memorials/${id}/tributes/pending`),
    moderate: (id: string, tributeId: string, decision: 'approved' | 'rejected') =>
      api.post<{ id: string; status: string }>(
        `/memorials/${id}/tributes/${tributeId}/moderate?decision=${decision}`,
      ),

    events: (id: string) => api.get<{ items: MemorialEvent[] }>(`/memorials/${id}/events`),
    addEvent: (id: string, input: { year: number; month?: number; day?: number; title: string; body?: string }) =>
      api.post<MemorialEvent>(`/memorials/${id}/events`, input),
    deleteEvent: (id: string, eventId: string) => api.delete<void>(`/memorials/${id}/events/${eventId}`),

    setLocation: (
      id: string,
      input: { lat: number; lng: number; label?: string; captured_on_site: boolean; accuracy_m?: number },
    ) =>
      api.post<{ verified: boolean; lat: number; lng: number; label: string | null; accuracy_m: number | null }>(
        `/memorials/${id}/location`,
        input,
      ),
    clearLocation: (id: string) => api.delete<void>(`/memorials/${id}/location`),

    admins: (id: string) => api.get<{ max: number; items: MemorialAdmin[] }>(`/memorials/${id}/admins`),
    addAdmin: (id: string, userId: string) =>
      api.post<{ added: boolean; already?: boolean; succession_order?: number }>(`/memorials/${id}/admins/${userId}`),
    removeAdmin: (id: string, userId: string) => api.delete<void>(`/memorials/${id}/admins/${userId}`),

    reminders: (id: string) =>
      api.get<{ items: Array<{ occasion: string; due_at: string; offset_hours: number | null }> }>(
        `/memorials/${id}/reminders`,
      ),
    reportDeath: (id: string, input: { evidence: string; document_media_id?: string }) =>
      api.post<{ death_status: string }>(`/memorials/${id}/report-death`, input),

    /** Platform staff: deaths waiting for a decision. */
    reviewQueue: () => api.get<{ items: DeathReviewItem[] }>('/admin/memorials/death-reports'),
    startReview: (id: string) => api.post<{ death_status: string }>(`/admin/memorials/${id}/review`),
    decideDeath: (id: string, outcome: 'verified' | 'rejected') =>
      api.post<{ death_status: string }>(`/admin/memorials/${id}/verify-death?outcome=${outcome}`),
  },

  market: {
    products: (params: { q?: string; country?: string; limit?: number } = {}) => {
      const query = new URLSearchParams()
      if (params.q) query.set('q', params.q)
      if (params.country) query.set('country', params.country)
      query.set('limit', String(params.limit ?? 30))
      return api.get<{ total: number; items: Product[] }>(`/commerce/products?${query}`, { auth: false })
    },
    createProduct: (input: { title: string; description?: string; vendor_price: string; country?: string }) =>
      api.post<{ id: string; pricing: Record<string, string> }>('/commerce/products', input),
    order: (productId: string, quantity = 1) =>
      api.post<{ id: string; status: string; customer_price: string }>('/commerce/orders', {
        product_id: productId,
        quantity,
      }),
    myOrders: () => api.get<{ items: Order[] }>('/commerce/orders/me'),
    order_: (id: string) => api.get<Order>(`/commerce/orders/${id}`),

    /** Who holds the money and for how long. Readable signed out on purpose. */
    escrowTerms: () => api.get<EscrowTerms>('/commerce/escrow/terms', { auth: false }),

    /** The seller says it has shipped. This does not release the money. */
    markDelivered: (orderId: string, note = '') =>
      api.post<Order>(`/commerce/orders/${orderId}/delivered`, { note }),

    /** The buyer releases the escrow. Only they can. */
    confirmDelivery: (orderId: string) =>
      api.post<{ id: string; status: string }>(`/commerce/orders/${orderId}/confirm-delivery`, {}),

    openDispute: (
      orderId: string,
      input: { category: string; reason: string; amount_claimed?: string; evidence?: string[] },
    ) => api.post<Dispute>(`/commerce/orders/${orderId}/dispute`, input),

    myDisputes: () => api.get<{ items: Dispute[] }>('/commerce/disputes/me'),
    dispute: (id: string) => api.get<Dispute>(`/commerce/disputes/${id}`),
    replyToDispute: (id: string, input: { body: string; evidence?: string[] }) =>
      api.post<{ ok: boolean; status: string }>(`/commerce/disputes/${id}/messages`, input),
    withdrawDispute: (id: string) => api.post<Dispute>(`/commerce/disputes/${id}/withdraw`, {}),
    concedeDispute: (id: string) => api.post<Dispute>(`/commerce/disputes/${id}/concede`, {}),
  },

  /** Kinjy Leaders — 5% of monthly revenue, split by commission earned. */
  leaders: {
    standings: (period?: string) =>
      api.get<LeaderBoard>(`/leaders/standings${period ? `?period=${period}` : ''}`, { auth: false }),
    me: (period?: string) =>
      api.get<MyLeaderStanding>(`/leaders/me${period ? `?period=${period}` : ''}`),
    frozen: (period: string) =>
      api.get<{ period: string; items: Array<LeaderStanding & { leader_id: string; payout_amount: string; paid: boolean }> }>(
        `/leaders-pool/${period}`,
        { auth: false },
      ),
  },

  /** The referral pool — a paid seat that receives uninvited sign-ups. */
  referralPool: {
    state: () => api.get<ReferralPoolState>('/auth/referral-pool', { auth: false }),
    mine: () => api.get<ReferralPoolState>('/auth/referral-pool'),
    assignments: () =>
      api.get<{
        items: Array<{
          member_id: string
          handle: string | null
          display_name: string | null
          seats_in_draw: number
          assigned_at: string
        }>
      }>('/auth/referral-pool/assignments'),
    join: () =>
      api.post<{ payment_id: string; rail: string; amount: string; checkout_url?: string; mock?: boolean }>(
        '/payments/referral-pool/join',
        {},
      ),
  },

  ads: {
    rateCard: () =>
      api.get<{ floors: Record<string, string>; currency: string; note: string }>('/ads/rate-card', {
        auth: false,
      }),
  },

  auth: {
    async register(input: {
      email: string
      password: string
      display_name: string
      handle: string
      /** ISO date. Required: the server derives the account's age tier from it
          and will refuse a registration without one. The tier itself is never
          sent by the client. */
      date_of_birth: string
      country?: string
      lang?: string
      referral_code?: string
    }) {
      const result = await api.post<AuthResult>('/auth/register', input, { auth: false })
      tokens.set(result.tokens)
      return result.user
    },
    /** Sign in with a passkey instead of a password. */
    async loginWithPasskey(email: string) {
      const options = await api.post<PublicKeyCredentialRequestOptionsJSON & { handle: string }>(
        '/auth/passkeys/login/options',
        { email },
        { auth: false },
      )
      const assertion = (await navigator.credentials.get({
        publicKey: parseRequestOptions(options),
      })) as PublicKeyCredential | null
      if (!assertion) throw new ApiError(401, 'No passkey was offered')
      const result = await api.post<AuthResult>(
        '/auth/passkeys/login/verify',
        { handle: options.handle, credential: serializeCredential(assertion) },
        { auth: false },
      )
      tokens.set(result.tokens)
      return result.user
    },

    async login(email: string, password: string) {
      const result = await api.post<AuthResult>('/auth/login', { email, password }, { auth: false })
      tokens.set(result.tokens)
      return result.user
    },
    me: () => api.get<AuthUser>('/auth/me'),
    async logout() {
      const refresh_token = tokens.refresh
      // Revoke the session server-side so the device disappears from the
      // device manager; clearing local storage alone would leave it listed.
      if (refresh_token) {
        try {
          await api.post('/auth/logout', { refresh_token })
        } catch {
          /* the local sign-out must succeed even if the call fails */
        }
      }
      tokens.clear()
    },
    isSignedIn: () => Boolean(tokens.access),
  },

  /**
   * Parental supervision.
   *
   * `disclosure` is deliberately unauthenticated and fetched by both sides
   * before either agrees: what a parent can and cannot see is part of the
   * agreement, not a policy page somebody may or may not have read.
   */
  supervision: {
    disclosure: () => api.get<SupervisionDisclosure>('/supervision/disclosure', { auth: false }),
    mine: () => api.get<SupervisionState>('/supervision'),
    invite: (other_handle: string) =>
      api.post<SupervisionLink>('/supervision/invite', { other_handle }),
    answer: (id: string, approve: boolean) =>
      api.post<SupervisionLink>(`/supervision/${id}/answer`, { approve }),
    end: (id: string) => api.post<SupervisionLink>(`/supervision/${id}/end`),
    view: (id: string) => api.get<SupervisedView>(`/supervision/${id}/view`),
    setTimeLimit: (id: string, daily_limit_minutes: number | null) =>
      api.post<{ daily_limit_minutes: number | null }>(
        `/supervision/${id}/time-limit`, { daily_limit_minutes },
      ),
    answerRequest: (id: string, approve: boolean) =>
      api.post<{ id: string; status: string }>(`/supervision/requests/${id}`, { approve }),
  },

  /** Trust & Safety. Every call here is staff-only at the service. */
  trustSafety: {
    overview: () => api.get<ModerationOverview>('/admin/moderation/overview'),
    reviewQueue: (limit = 50) =>
      api.get<{ pending: number; shown: number; items: ReviewItem[] }>(
        `/admin/classification-queue?limit=${limit}`,
      ),
    rate: (contentId: string, body: Record<string, unknown>) =>
      api.post(`/admin/classification/${contentId}/review`, body),
    appeals: (limit = 50) =>
      api.get<{ stats: ModerationOverview['appeals']; items: AppealItem[] }>(
        `/admin/moderation/appeals?limit=${limit}`,
      ),
    decideAppeal: (appealId: string, overturn: boolean, note?: string) =>
      api.post<{ id: string; status: string }>(`/admin/moderation/appeals/${appealId}`, {
        overturn,
        note,
      }),
  },

  /** What moderation did to you, and how to contest it. */
  moderation: {
    myDecisions: () => api.get<{ items: MyDecision[] }>('/moderation/decisions'),
    appeal: (decisionId: string, grounds: string) =>
      api.post(`/moderation/decisions/${decisionId}/appeal`, { grounds }),
    reportPost: (postId: string, reason: string, note?: string) =>
      api.post(`/posts/${postId}/report`, { reason, note }),
    reportComment: (commentId: string, reason: string, note?: string) =>
      api.post(`/comments/${commentId}/report`, { reason, note }),
  },

  /** Everything behind the member dashboard. */
  account: {
    profile: () => api.get<MyProfile>('/users/me'),
    profileByHandle: (handle: string) => api.get<Profile>(`/users/${handle}`, { auth: false }),
    preferences: () => api.get<Record<string, unknown>>('/preferences'),
    setPreferences: (patch: Record<string, unknown>) => api.patch('/preferences', patch),

    wellbeing: () => api.get<WellbeingStatus>('/wellbeing'),
    /**
     * Report time spent. The server clamps the claim against the wall clock, so
     * a missed beat cannot be made up for and a fast one cannot inflate the
     * count — the limit means the same thing across tabs and devices.
     */
    wellbeingBeat: (minutes: number) =>
      api.post<WellbeingStatus>('/wellbeing/heartbeat', { minutes }),
    updateProfile: (patch: ProfileUpdate) => api.patch<MyProfile>('/users/me', patch),
    profileEligibility: () => api.get<ProfileEligibility>('/users/me/eligibility'),

    wallet: () => api.get<Wallet>('/wallet'),
    commissions: (params: { source_kind?: string; limit?: number } = {}) => {
      const query = new URLSearchParams()
      if (params.source_kind) query.set('source_kind', params.source_kind)
      query.set('limit', String(params.limit ?? 20))
      return api.get<CommissionsPage>(`/commissions?${query}`)
    },
    payoutEligibility: () => api.get<PayoutEligibility>('/payments/eligibility'),
    addPayoutDestination: (input: { address: string; rail?: string; currency?: string; label?: string }) =>
      api.post<{ rail: string; address: string; whitelisted: boolean; note: string }>(
        '/payments/destinations',
        { rail: 'nowpayments', currency: 'usdtbsc', ...input },
      ),

    kyc: () => api.get<KycStatus>('/kyc/status'),
    startKyc: () => api.post<{ status: string; attempt?: number }>('/kyc/start'),

    sessions: () => api.get<DeviceSession[]>('/auth/sessions'),
    revokeSession: (id: string) => api.delete<void>(`/auth/sessions/${id}`),
    passkeys: () => api.get<Passkey[]>('/auth/passkeys'),

    /**
     * Register a passkey. The private key is generated by the authenticator and
     * never leaves it; what crosses the wire is a public key and an attestation.
     */
    async registerPasskey(label?: string) {
      const options = await api.post<PublicKeyCredentialCreationOptionsJSON>(
        '/auth/passkeys/register/options',
      )
      const credential = (await navigator.credentials.create({
        publicKey: parseCreationOptions(options),
      })) as PublicKeyCredential | null
      if (!credential) throw new ApiError(400, 'No passkey was created')
      return api.post<{ id: string; label: string }>('/auth/passkeys/register/verify', {
        credential: serializeCredential(credential),
        label,
      })
    },
    removePasskey: (id: string) => api.delete<void>(`/auth/passkeys/${id}`),

    /** Blueprint §4 — no justification field, by design. */
    closeAccount: (input: { password: string; mode: 'deactivate' | 'delete'; cooling_period_days: number }) =>
      api.post<{ status: string; effective_at: string | null; note: string }>(
        '/auth/account/delete',
        input,
      ),
  },
}
