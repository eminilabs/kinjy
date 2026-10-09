import type { Dispute } from '@/lib/api'

/**
 * What the dispute page reads: the API's own Dispute, whose detail-only fields
 * are all optional, so the page also works against an older payload.
 */
export type DisputeView = Dispute
export interface EvidenceFile {
  url: string
  name: string
}

export const MAX_EVIDENCE = 5
export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024

export const DISPUTE_CATEGORIES = [
  { value: 'not_received', label: 'It never arrived' },
  { value: 'not_as_described', label: 'Not what was described' },
  { value: 'damaged', label: 'Arrived damaged' },
  { value: 'unauthorised', label: 'I did not authorise this' },
  { value: 'other', label: 'Something else' },
]

/**
 * The server has one list of five categories and does not read them differently
 * per role (a seller-opened case just defaults the claimed amount to 0), so a
 * seller picks the closest of the same five values with wording that fits them.
 */
export const SELLER_DISPUTE_CATEGORIES = [
  { value: 'not_received', label: 'Delivered, buyer says it never arrived', hint: 'You handed it over and the buyer disputes that.' },
  { value: 'not_as_described', label: 'Buyer’s complaint is unfair', hint: 'The item matches the listing and a refund is being asked for anyway.' },
  { value: 'damaged', label: 'Damage claimed after delivery', hint: 'It left you in good condition.' },
  { value: 'unauthorised', label: 'Payment problem', hint: 'Something is wrong with how this order was paid for.' },
  { value: 'other', label: 'Something else', hint: 'Anything that does not fit the other choices.' },
]

export function categoryLabel(value: string, openerRole: 'buyer' | 'seller'): string {
  const list = openerRole === 'seller' ? SELLER_DISPUTE_CATEGORIES : DISPUTE_CATEGORIES
  return list.find((c) => c.value === value)?.label ?? value
}

export function isClosed(status: string): boolean {
  return status === 'resolved' || status === 'withdrawn'
}

/** The API sends naive UTC timestamps; without a zone the browser reads them as local time. */
export function parseTs(iso: string | null | undefined): number | null {
  if (!iso) return null
  const t = Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}Z`)
  return Number.isNaN(t) ? null : t
}

export type Brief = { display_name?: string; avatar_url?: string | null }

export function briefFor(view: DisputeView, userId: string, role: 'buyer' | 'seller'): Brief | null {
  const party = role === 'buyer' ? view.buyer : view.seller
  if (party && (!party.id || party.id === userId)) return party.profile
  return null
}

