import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ArrowLeft, Check, Gavel, Handshake, Undo2 } from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import DisputeComposer from '@/components/commerce/DisputeComposer'
import DisputeCountdown from '@/components/commerce/DisputeCountdown'
import DisputeEvidenceInput from '@/components/commerce/DisputeEvidenceInput'
import {
  DISPUTE_CATEGORIES,
  SELLER_DISPUTE_CATEGORIES,
  briefFor,
  categoryLabel,
  isClosed,
  parseTs,
  type DisputeView,
  type EvidenceFile,
} from '@/components/commerce/DisputeModel'
import DisputeThread from '@/components/commerce/DisputeThread'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { ApiError, kaluta, type DisputeMessage, type EscrowTerms, type Order } from '@/lib/api'

interface Loaded {
  order: Order | null
  dispute: DisputeView | null
}

/** A 404 means "not yours or not there" and the page treats both the same. */
async function load(orderId: string): Promise<Loaded> {
  try {
    const order = await kaluta.market.order_(orderId)
    const dispute = order.dispute_id ? ((await kaluta.market.dispute(order.dispute_id)) as DisputeView) : null
    return { order, dispute }
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return { order: null, dispute: null }
    throw err
  }
}

const field =
  'w-full rounded-card-sm border border-white/12 bg-ink-2/70 px-3 py-2.5 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none'

const STATUS_LABEL: Record<string, string> = {
  open: 'Waiting for a reply',
  answered: 'Both sides are talking',
  arbitration: 'With Kinjy arbitration',
  resolved: 'Resolved',
  withdrawn: 'Withdrawn',
}

const OUTCOME_LABEL: Record<string, string> = {
  release_to_seller: 'The money was released to the seller',
  refund_buyer: 'The buyer was refunded in full',
  split: 'The money was split between buyer and seller',
  withdrawn: 'The dispute was withdrawn',
}

function OpenForm({ order, onDone }: { order: Order; onDone: () => void }) {
  const [category, setCategory] = useState('not_received')
  const [reason, setReason] = useState('')
  const [amount, setAmount] = useState('')
  const [files, setFiles] = useState<EvidenceFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const seller = order.role === 'seller'
  const categories = seller ? SELLER_DISPUTE_CATEGORIES : DISPUTE_CATEGORIES
  const hint = seller ? SELLER_DISPUTE_CATEGORIES.find((c) => c.value === category)?.hint : undefined
  const max = Number(order.customer_price)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (reason.trim().length < 10) {
      setError('Please describe what went wrong, at least a sentence.')
      return
    }
    if (!seller && amount && (Number(amount) <= 0 || Number(amount) > max)) {
      setError(`The amount must be between 0 and $${order.customer_price}, what you paid.`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      await kaluta.market.openDispute(order.id, {
        category,
        reason: reason.trim(),
        // A seller claims no money: the server defaults it to 0.
        amount_claimed: seller ? undefined : amount || undefined,
        evidence: files.map((f) => f.url),
      })
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not open the dispute')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="cloud-card space-y-4 p-4 sm:p-5">
      <div>
        <h2 className="text-base font-semibold text-text-hi">Open a dispute</h2>
        <p className="caption mt-1">
          {seller
            ? 'The money stays with the custodian while this is open, and it will not be released on its own. The buyer has a deadline to answer, and if you cannot agree Kinjy decides.'
            : 'The money stays with the custodian while this is open. The seller has a deadline to answer, and if you cannot agree Kinjy decides.'}
        </p>
      </div>

      <label className="block">
        <span className="caption">What went wrong</span>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={`${field} mt-1 min-h-11`}>
          {categories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        {hint && <span className="caption mt-1 block">{hint}</span>}
      </label>

      <label className="block">
        <span className="caption">What happened</span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={5}
          maxLength={4000}
          placeholder="Dates, tracking numbers and what you were told all help."
          className={`${field} mt-1`}
        />
        <span className="caption">{reason.trim().length < 10 ? 'At least 10 characters' : ' '}</span>
      </label>

      {!seller && (
        <label className="block">
          <span className="caption">Amount you are claiming (optional, up to ${order.customer_price})</span>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
            inputMode="decimal"
            placeholder={`${order.customer_price} (everything)`}
            className={`${field} mt-1 min-h-11`}
          />
        </label>
      )}

      <div>
        <span className="caption">Photos as evidence (optional)</span>
        <div className="mt-1">
          <DisputeEvidenceInput value={files} onChange={setFiles} onBusyChange={setUploading} />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-200">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy || uploading}
        className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 text-sm font-bold text-ink disabled:opacity-40 sm:w-auto"
      >
        {busy ? 'Opening...' : 'Open dispute'}
      </button>
    </form>
  )
}

function resolver(d: DisputeView): string {
  const note = d.resolution_note ?? ''
  if (d.outcome === 'withdrawn') return d.role === 'buyer' ? 'the buyer' : 'the seller'
  if (/^conceded by the seller/i.test(note)) return 'the seller'
  if (/^conceded by the buyer/i.test(note)) return 'the buyer'
  return 'Kinjy arbitration'
}

function OutcomePanel({ d }: { d: DisputeView }) {
  const resolvedAt = parseTs(d.resolved_at)
  return (
    <section className="cloud-card border-emerald-400/35 bg-emerald-400/[0.06] p-4">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-200">
        <Check size={14} aria-hidden="true" />
        {d.status === 'withdrawn' ? 'Withdrawn' : 'Resolved'}
        {resolvedAt !== null && ` on ${new Date(resolvedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`}
      </p>
      <p className="mt-2 text-sm font-semibold text-text-hi">
        {OUTCOME_LABEL[d.outcome ?? ''] ?? d.outcome ?? 'Closed'}
      </p>
      {Number(d.refund_amount) > 0 && (
        <p className="mono-data mt-1 text-lg text-gold-soft">
          ${d.refund_amount}
          <span className="caption ms-1.5">refunded</span>
        </p>
      )}
      {d.resolution_note && <p className="mt-2 text-sm text-text-mid">{d.resolution_note}</p>}
      <p className="caption mt-2">Decided by {resolver(d)}.</p>
    </section>
  )
}

function ThreadView({ order, dispute, terms, reload }: { order: Order; dispute: DisputeView; terms: EscrowTerms | null; reload: () => void }) {
  const { user } = useAuth()
  const userId = user?.id
  const [confirm, setConfirm] = useState<'concede' | 'withdraw' | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const closed = isClosed(dispute.status)
  const openerRole = dispute.role
  const viewer: 'buyer' | 'seller' | 'admin' =
    dispute.viewer_role ?? (userId === dispute.opened_by ? openerRole : userId === dispute.against ? (openerRole === 'buyer' ? 'seller' : 'buyer') : (order.role as 'buyer' | 'seller'))

  const isOpener = userId === dispute.opened_by
  const isRespondent = userId === dispute.against
  const canWithdraw = dispute.can_withdraw ?? (!closed && isOpener)
  const canConcede = dispute.can_concede ?? (!closed && isRespondent)
  const canReply = dispute.can_reply ?? (!closed && viewer !== 'admin')

  const messages: DisputeMessage[] =
    dispute.messages && dispute.messages.length > 0
      ? dispute.messages
      : [
          {
            author_id: dispute.opened_by,
            author_role: openerRole,
            body: dispute.reason,
            evidence: [],
            created_at: dispute.created_at,
          },
        ]

  const briefOf = (authorId: string, role: 'buyer' | 'seller') => briefFor(dispute, authorId, role)

  const title = dispute.order?.title
  const price = dispute.order?.customer_price ?? order.customer_price
  const category = categoryLabel(dispute.category, openerRole)

  // Whoever concedes ends the case the other side's way: a seller refunds the buyer,
  // a buyer releases the money.
  const concedeText =
    openerRole === 'buyer'
      ? `The buyer is refunded ${Number(dispute.amount_claimed) >= Number(price) ? 'in full' : `$${dispute.amount_claimed}`} and the dispute closes. This cannot be undone.`
      : 'The money is released to the seller and the dispute closes. This cannot be undone.'

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true)
    setError(null)
    try {
      await fn()
      setConfirm(null)
      reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'That did not go through')
    } finally {
      setBusy(false)
    }
  }

  const concedeLabel = viewer === 'seller' ? 'Accept the refund request' : 'Accept and release the money'

  return (
    <div className="mx-auto max-w-5xl lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start lg:gap-5">
      <div className="space-y-3 lg:col-start-2 lg:row-start-1 lg:sticky lg:top-4">
        <section className="cloud-card p-4">
          <p className="text-sm font-semibold text-text-hi">{title ?? `Order ${order.id.slice(0, 16)}`}</p>
          <p className="caption mt-1">
            ${price} · {category}
            {Number(dispute.amount_claimed) > 0 && ` · claiming $${dispute.amount_claimed}`}
          </p>
          <p className="mt-2 inline-flex rounded-full border border-amber-400/35 bg-amber-400/10 px-2.5 py-1 text-[0.68rem] font-semibold text-amber-200">
            {STATUS_LABEL[dispute.status] ?? dispute.status}
          </p>
          <p className="caption mt-2">You are the {viewer === 'admin' ? 'reviewer' : viewer} on this order.</p>
        </section>

        {closed ? (
          <OutcomePanel d={dispute} />
        ) : (
          <DisputeCountdown dispute={dispute} terms={terms} viewerIsRespondent={isRespondent} />
        )}

        {!closed && (canConcede || canWithdraw) && (
          <section className="cloud-card space-y-2 p-4">
            {confirm === null && canConcede && (
              <button
                type="button"
                onClick={() => setConfirm('concede')}
                className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 text-sm font-bold text-ink"
              >
                <Handshake size={15} aria-hidden="true" />
                {concedeLabel}
              </button>
            )}
            {confirm === null && canWithdraw && (
              <button
                type="button"
                onClick={() => setConfirm('withdraw')}
                className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full border border-white/12 px-4 text-sm font-semibold text-text-mid hover:border-gold/40 hover:text-gold-soft"
              >
                <Undo2 size={15} aria-hidden="true" />
                Withdraw dispute
              </button>
            )}
            {confirm !== null && (
              <div role="alertdialog" aria-label="Confirm">
                <p className="text-sm font-semibold text-text-hi">
                  {confirm === 'concede' ? `${concedeLabel}?` : 'Withdraw this dispute?'}
                </p>
                <p className="caption mt-1">
                  {confirm === 'concede'
                    ? concedeText
                    : 'The case closes and the order goes back to normal: the money is held until the buyer confirms receipt or the release date passes.'}
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      run(() =>
                        confirm === 'concede'
                          ? kaluta.market.concedeDispute(dispute.id)
                          : kaluta.market.withdrawDispute(dispute.id),
                      )
                    }
                    className="min-h-11 flex-1 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 text-sm font-bold text-ink disabled:opacity-40"
                  >
                    {busy ? 'Working...' : 'Yes, confirm'}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirm(null)}
                    className="min-h-11 rounded-full border border-white/12 px-4 text-sm font-semibold text-text-mid"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-200">
                {error}
              </p>
            )}
          </section>
        )}

        {terms && !closed && (
          <p className="caption flex items-start gap-2">
            <Gavel size={14} className="mt-0.5 shrink-0 text-gold" aria-hidden="true" />
            <span>
              Possible outcomes: {terms.outcomes.join(', ')}. The other side has {terms.dispute_response_days} days to
              answer.
            </span>
          </p>
        )}
      </div>

      <div className="mt-4 lg:col-start-1 lg:row-start-1 lg:mt-0">
        <DisputeThread messages={messages} viewerId={userId} briefOf={briefOf} />
        <div className="sticky bottom-16 z-20 mt-4 pb-2 md:bottom-0">
          <DisputeComposer
            disputeId={dispute.id}
            disabledReason={
              canReply
                ? undefined
                : closed
                  ? 'This dispute is closed, so the conversation is read-only.'
                  : 'You cannot reply on this dispute.'
            }
            onSent={reload}
          />
        </div>
      </div>
    </div>
  )
}

export default function MarketDispute() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const state = useApi<Loaded>(() => load(id), [id])
  const terms = useApi<EscrowTerms>(() => kaluta.market.escrowTerms(), [])

  const back = (
    <Link to="/market" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-text-mid hover:text-gold-soft">
      <ArrowLeft size={15} aria-hidden="true" />
      Back to orders
    </Link>
  )

  const { order, dispute } = state.data ?? { order: null, dispute: null }
  const canOpen = !!order && ['in_escrow', 'delivered'].includes(order.status)

  let body: React.ReactNode
  if (state.loading && !state.data) {
    body = <p className="text-sm text-text-low">Loading the dispute...</p>
  } else if (state.error) {
    body = (
      <p role="alert" className="text-sm text-red-200">
        {state.error}
      </p>
    )
  } else if (!order || !user) {
    body = (
      <div className="cloud-card p-5">
        <p className="text-sm font-semibold text-text-hi">We could not find that order.</p>
        <p className="caption mt-1">It may not exist, or it may not be yours.</p>
      </div>
    )
  } else if (dispute) {
    body = <ThreadView order={order} dispute={dispute} terms={terms.data} reload={state.reload} />
  } else if (canOpen) {
    body = (
      <div className="mx-auto max-w-xl">
        <OpenForm order={order} onDone={state.reload} />
      </div>
    )
  } else {
    body = (
      <div className="cloud-card mx-auto max-w-xl p-5">
        <p className="text-sm font-semibold text-text-hi">There is no dispute on this order.</p>
        <p className="caption mt-1">
          A dispute can only be opened while the money is still in escrow.
        </p>
      </div>
    )
  }

  return (
    <AppShell title="Dispute" subtitle="Talk it through with the other side. If you cannot agree, Kinjy decides.">
      {back}
      <div className="mt-2">{body}</div>
    </AppShell>
  )
}

