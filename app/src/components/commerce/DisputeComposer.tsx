import { useState } from 'react'
import { Send } from 'lucide-react'
import { ApiError, kaluta } from '@/lib/api'
import DisputeEvidenceInput from './DisputeEvidenceInput'
import type { EvidenceFile } from './DisputeModel'

export default function DisputeComposer({
  disputeId,
  disabledReason,
  onSent,
}: {
  disputeId: string
  /** When set the composer is shown but locked, with this as the reason. */
  disabledReason?: string
  onSent: () => void
}) {
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<EvidenceFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const locked = !!disabledReason
  const canSend = !locked && !busy && !uploading && body.trim().length > 0

  const send = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!canSend) return
    setBusy(true)
    setError(null)
    try {
      await kaluta.market.replyToDispute(disputeId, { body: body.trim(), evidence: files.map((f) => f.url) })
      setBody('')
      setFiles([])
      onSent()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Your message was not sent')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={send}
      className="cloud-card border-white/15 bg-ink/95 p-3 backdrop-blur"
    >
      {locked ? (
        <p className="caption py-2 text-center">{disabledReason}</p>
      ) : (
        <>
          {error && (
            <p role="alert" className="mb-2 text-xs text-red-200">
              {error}
            </p>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <DisputeEvidenceInput value={files} onChange={setFiles} onBusyChange={setUploading} compact />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={1}
              maxLength={4000}
              placeholder="Write a message"
              aria-label="Message"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-card-sm border border-white/12 bg-ink-2/70 px-3 py-2.5 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!canSend}
              aria-label="Send"
              className="inline-flex h-11 min-w-11 items-center justify-center rounded-full bg-gradient-to-br from-gold-soft to-gold px-3 text-ink disabled:opacity-40"
            >
              <Send size={16} aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </form>
  )
}

