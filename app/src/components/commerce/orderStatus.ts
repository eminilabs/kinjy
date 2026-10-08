import type { Order } from '@/lib/api'

export type Tone = 'wait' | 'good' | 'warn' | 'muted'

export const STATUS: Record<string, { label: string; tone: Tone }> = {
  pending: { label: 'Awaiting payment', tone: 'muted' },
  in_escrow: { label: 'Paid · in escrow', tone: 'wait' },
  delivered: { label: 'Delivered — confirm receipt', tone: 'wait' },
  settled: { label: 'Completed', tone: 'good' },
  part_refunded: { label: 'Partly refunded', tone: 'good' },
  refunded: { label: 'Refunded', tone: 'warn' },
  disputed: { label: 'In dispute', tone: 'warn' },
  cancelled: { label: 'Cancelled', tone: 'muted' },
}

export const TONE_CLASS: Record<Tone, string> = {
  wait: 'border-sky/35 bg-sky/10 text-sky',
  good: 'border-emerald-400/35 bg-emerald-400/10 text-emerald-200',
  warn: 'border-amber-400/35 bg-amber-400/10 text-amber-200',
  muted: 'border-white/12 bg-white/5 text-text-mid',
}

export function statusInfo(status: string): { label: string; tone: Tone } {
  return STATUS[status] ?? { label: status, tone: 'muted' }
}

/** Filter pills on the buyer's orders page; each groups the raw statuses a member thinks of as one thing. */
export const STATUS_GROUPS = [
  { id: 'pending', label: 'Awaiting payment', statuses: ['pending'] },
  { id: 'in_escrow', label: 'Paid, in escrow', statuses: ['in_escrow'] },
  { id: 'delivered', label: 'Delivered', statuses: ['delivered'] },
  { id: 'done', label: 'Completed', statuses: ['settled', 'part_refunded'] },
  { id: 'disputed', label: 'In dispute', statuses: ['disputed'] },
  { id: 'closed', label: 'Refunded or cancelled', statuses: ['refunded', 'cancelled'] },
] as const

/** One line telling the viewer what happens next, so a status is never a dead end. */
export function nextStepHint(order: Pick<Order, 'status' | 'role'>): string {
  const buyer = order.role !== 'seller'
  switch (order.status) {
    case 'pending':
      return buyer ? 'Pay to start the escrow' : 'Waiting for the buyer to pay. Ship only once it is held in escrow.'
    case 'in_escrow':
      return buyer ? 'Waiting for the seller to ship' : 'Ship the order, then mark it as delivered'
    case 'delivered':
      return buyer ? 'Confirm receipt to release the money' : 'Waiting for the buyer to confirm receipt'
    case 'settled':
      return buyer ? 'The seller has been paid' : 'The money has been released to you'
    case 'part_refunded':
      return 'Part of the money was refunded, the rest went to the seller'
    case 'refunded':
      return buyer ? 'Your money was returned' : 'The buyer was refunded'
    case 'disputed':
      return 'The release clock is stopped while the dispute is open'
    case 'cancelled':
      return 'This order was cancelled'
    default:
      return ''
  }
}

export function dateLabel(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

export function dateTimeLabel(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function money(value: string | number): string {
  return `$${value}`
}
