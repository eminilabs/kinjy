import { useState } from 'react'
import { Copy, Link2 } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta } from '@/lib/api'

const DAY_MS = 86_400_000

/**
 * Stewards of a secret community mint and cancel invite links here.
 * The server keeps only a hash of the token, so the full URL exists on screen
 * exactly once, right after creation — hence the warning beside it.
 */
export default function InviteLinks({ communityId }: { communityId: string }) {
  const links = useApi(() => kaluta.communities.links(communityId), [communityId])
  const [maxUses, setMaxUses] = useState('')
  const [days, setDays] = useState('')
  const [busy, setBusy] = useState(false)
  const [fresh, setFresh] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setCopied(false)
    try {
      const uses = Number(maxUses)
      const expiry = Number(days)
      const link = await kaluta.communities.createLink(communityId, {
        ...(uses > 0 ? { max_uses: Math.floor(uses) } : {}),
        ...(expiry > 0 ? { expires_at: new Date(Date.now() + expiry * DAY_MS).toISOString() } : {}),
      })
      setFresh(`${window.location.origin}/communities/join/${link.token}`)
      setMaxUses('')
      setDays('')
      links.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create the link')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!fresh) return
    try {
      await navigator.clipboard.writeText(fresh)
      setCopied(true)
    } catch {
      setError('Copy failed — select the link and copy it by hand.')
    }
  }

  const revoke = async (linkId: string) => {
    setError(null)
    try {
      await kaluta.communities.revokeLink(communityId, linkId)
      links.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not revoke the link')
    }
  }

  const items = links.data?.items ?? []

  return (
    <div className="rounded-card-sm border border-white/10 p-4">
      <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-text-hi">
        <Link2 size={14} aria-hidden="true" />
        Invite links
      </h3>

      <form onSubmit={create} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="number"
          min="1"
          step="1"
          value={maxUses}
          onChange={(e) => setMaxUses(e.target.value)}
          placeholder="Max uses (optional)"
          aria-label="Maximum uses"
          className="w-full rounded-full border border-white/10 bg-ink-2/60 px-4 py-2.5 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none"
        />
        <input
          type="number"
          min="1"
          step="1"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          placeholder="Expires in days (optional)"
          aria-label="Days until the link expires"
          className="w-full rounded-full border border-white/10 bg-ink-2/60 px-4 py-2.5 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="shrink-0 rounded-full bg-gradient-to-br from-gold-soft to-gold px-4 py-2.5 text-xs font-bold text-ink disabled:opacity-40"
        >
          Create link
        </button>
      </form>

      {fresh && (
        <div className="mt-3 rounded-card-sm border border-gold/30 bg-gold/5 p-3">
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={fresh}
              aria-label="New invite link"
              onFocus={(e) => e.currentTarget.select()}
              className="w-full min-w-0 bg-transparent text-xs text-text-hi focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void copy()}
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/12 px-3 py-1.5 text-xs font-semibold text-text-mid hover:border-gold/40 hover:text-gold-soft"
            >
              <Copy size={12} aria-hidden="true" />
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
          <p className="caption mt-2 text-amber-200">
            Copy it now — this link will not be shown again. Anyone who has it can join.
          </p>
        </div>
      )}

      {items.length > 0 && (
        <ul className="mt-3 divide-y divide-white/10">
          {items.map((link) => {
            const expired = !!link.expires_at && new Date(link.expires_at).getTime() < Date.now()
            return (
              <li key={link.id} className="flex items-center gap-2 py-2">
                <span className="min-w-0 flex-1 text-xs text-text-mid">
                  {link.uses}
                  {link.max_uses ? ` / ${link.max_uses}` : ''} uses
                  {link.expires_at && ` · ${expired ? 'expired' : 'expires'} ${new Date(link.expires_at).toLocaleDateString()}`}
                  {link.revoked && ' · revoked'}
                </span>
                {!link.revoked && (
                  <button
                    type="button"
                    onClick={() => void revoke(link.id)}
                    className="shrink-0 rounded-full border border-white/12 px-3 py-1 text-xs font-semibold text-text-mid hover:border-amber-200/40 hover:text-amber-200"
                  >
                    Revoke
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {links.error && <p className="mt-2 text-xs text-amber-200">{links.error}</p>}
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-200">
          {error}
        </p>
      )}
    </div>
  )
}
