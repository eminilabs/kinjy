import { useState } from 'react'
import { Star } from 'lucide-react'
import ActionSheet, { fieldClass, primaryBtn } from '@/components/commerce/ActionSheet'
import { ApiError, kaluta } from '@/lib/api'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  orderId: string
  onClose: () => void
  /** Called after a review is stored, or when the server says one already exists. */
  onDone: (alreadyReviewed: boolean) => void
}

export default function ReviewForm({ open, orderId, onClose, onDone }: Props) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (rating < 1 || busy) return
    setBusy(true)
    setError(null)
    try {
      await kaluta.market.reviewOrder(orderId, { rating, comment: comment.trim() || undefined })
      onDone(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) onDone(true)
      else setError(err instanceof ApiError ? err.message : 'Could not send your review')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ActionSheet open={open} onClose={onClose} title="Rate this purchase" description="Your review is public on the listing.">
      <form onSubmit={submit} className="space-y-3">
        <div role="radiogroup" aria-label="Rating" className="flex justify-between gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={rating === value}
              aria-label={`${value} star${value > 1 ? 's' : ''}`}
              onClick={() => setRating(value)}
              className="flex min-h-[48px] min-w-[48px] flex-1 items-center justify-center"
            >
              <Star
                size={30}
                className={cn(value <= rating ? 'fill-gold text-gold' : 'text-text-low')}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="rv-comment" className="caption mb-1.5 block">Comment (optional)</label>
          <textarea
            id="rv-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={2000}
            rows={4}
            className={`${fieldClass} resize-y`}
          />
          <p className="caption mt-1 text-right">{comment.length}/2000</p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-200">
            {error}
          </p>
        )}
        <button type="submit" disabled={rating < 1 || busy} className={primaryBtn}>
          {busy ? 'Sending…' : 'Send review'}
        </button>
      </form>
    </ActionSheet>
  )
}
