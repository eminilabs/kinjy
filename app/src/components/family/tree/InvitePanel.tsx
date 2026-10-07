import { useState } from 'react'
import { Copy, Send } from 'lucide-react'
import { useAppTheme } from '@/components/appdemo/theme'
import { useApi } from '@/hooks/useApi'
import { ApiError, kaluta } from '@/lib/api'
import { cn } from '@/lib/utils'

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

/**
 * Offer a person's place in the tree to the person themselves, with a link you pass on yourself.
 * Kinjy sends nothing. The link works once, expires, and can be withdrawn; it opens no tree.
 * Shown only when the server says this node can be invited.
 */
export default function InvitePanel({ personId, name }: { personId: string; name: string }) {
  const { tok } = useAppTheme()
  const list = useApi(() => kaluta.family.invitations(personId), [personId])
  const [link, setLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const active = list.data?.items.find((i) => i.status === 'active')

  const make = async () => {
    setBusy(true)
    setError(null)
    try {
      const made = await kaluta.family.invite(personId)
      setLink(`${window.location.origin}${made.path}`)
      setCopied(false)
      list.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not make the link.')
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (id: string) => {
    setBusy(true)
    setError(null)
    try {
      await kaluta.family.revokeInvitation(id)
      setLink(null)
      list.reload()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not withdraw the invitation.')
    } finally {
      setBusy(false)
    }
  }

  const copy = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section className="mt-5 border-t border-white/10 pt-4" aria-labelledby="invite-title">
      <h3 id="invite-title" className={cn('mb-2 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide', tok.mid)}>
        <Send size={13} aria-hidden="true" /> Invite {name} to Kinjy
      </h3>
      <p className={cn('mb-2 text-xs', tok.low)}>
        Make a link and send it to {name} yourself. It works once, for 7 days. The link shows nothing of the tree: {name} signs in, sees whose place it is and what they would see, and chooses to accept or decline. If they accept, they join this family tree and can see the people connected to {name}.
      </p>
      {link && (
        <div className="mb-2 space-y-2">
          <input readOnly value={link} aria-label="Invitation link" onFocus={(e) => e.currentTarget.select()} className={cn('w-full rounded-card-sm px-3 py-2 text-xs', tok.input, tok.text)} />
          <p className={cn('text-xs', tok.low)}>This is the only time the link is shown. If you lose it, make a new one: that withdraws this one.</p>
          <button type="button" onClick={copy} className={cn('inline-flex min-h-9 items-center gap-1.5 rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold', tok.text, tok.hoverBg)}>
            <Copy size={13} aria-hidden="true" /> {copied ? 'Copied' : 'Copy link'}
          </button>
        </div>
      )}
      {active && (
        <p className={cn('mb-2 text-xs', tok.mid)}>
          An invitation is open until {when(active.expires_at)}.{' '}
          <button type="button" disabled={busy} onClick={() => revoke(active.id)} className="underline underline-offset-2">
            Withdraw it
          </button>
        </p>
      )}
      {error && <p className="mb-2 text-xs text-red-300" role="alert">{error}</p>}
      <button type="button" disabled={busy} onClick={make} className={cn('inline-flex min-h-9 items-center rounded-full border border-white/15 px-3.5 py-1.5 text-xs font-semibold disabled:opacity-60', tok.text, tok.hoverBg)}>
        {active ? 'Make a new link' : 'Make an invitation link'}
      </button>
    </section>
  )
}
