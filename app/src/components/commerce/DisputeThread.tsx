import { useEffect, useRef } from 'react'
import { ShieldCheck } from 'lucide-react'
import type { DisputeMessage } from '@/lib/api'
import type { Brief } from './DisputeModel'
import { cn } from '@/lib/utils'
import EvidenceStrip from './EvidenceStrip'
import { parseTs } from './DisputeModel'

const ROLE_LABEL = { buyer: 'Buyer', seller: 'Seller', kinjy: 'Kinjy' } as const

const BUBBLE = {
  buyer: 'border-sky/35 bg-sky/10',
  seller: 'border-gold/30 bg-gold/10',
  kinjy: 'border-white/20 bg-indigo/25',
}

function stamp(iso: string): string {
  const t = parseTs(iso)
  if (t === null) return ''
  return new Date(t).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function Avatar({ brief, role }: { brief: Brief | null; role: DisputeMessage['author_role'] }) {
  if (role === 'kinjy') {
    return (
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo/40 text-gold" aria-hidden="true">
        <ShieldCheck size={15} />
      </span>
    )
  }
  if (brief?.avatar_url) {
    return <img src={brief.avatar_url} alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
  }
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-text-mid" aria-hidden="true">
      {(brief?.display_name ?? ROLE_LABEL[role]).slice(0, 1).toUpperCase()}
    </span>
  )
}

export default function DisputeThread({
  messages,
  viewerId,
  briefOf,
}: {
  messages: DisputeMessage[]
  viewerId: string | undefined
  briefOf: (authorId: string, role: 'buyer' | 'seller') => Brief | null
}) {
  const end = useRef<HTMLDivElement>(null)
  const seen = useRef(0)

  // The first paint lands at the top of the case; only later arrivals pull the view down.
  useEffect(() => {
    if (seen.current > 0 && messages.length > seen.current) {
      end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
    seen.current = messages.length
  }, [messages.length])

  return (
    <ol className="space-y-3" aria-label="Conversation">
      {messages.map((m, i) => {
        const own = m.author_id === viewerId
        const brief = m.author_role === 'kinjy' ? null : (m.author ?? briefOf(m.author_id, m.author_role))
        const name = own ? 'You' : (brief?.display_name ?? ROLE_LABEL[m.author_role])
        return (
          <li key={`${m.created_at}-${i}`} className={cn('flex gap-2', own && 'flex-row-reverse')}>
            <Avatar brief={brief} role={m.author_role} />
            <div className={cn('max-w-[85%] rounded-card-sm border px-3.5 py-2.5', BUBBLE[m.author_role])}>
              <p className="flex flex-wrap items-center gap-x-2 text-[0.7rem] font-semibold text-text-mid">
                <span>{name}</span>
                <span className="font-normal text-text-low">
                  {ROLE_LABEL[m.author_role]}
                  {i === 0 && ' · opened the case'}
                </span>
              </p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-text-hi">{m.body}</p>
              <EvidenceStrip urls={m.evidence ?? []} />
              <p className="caption mt-1.5 text-end">{stamp(m.created_at)}</p>
            </div>
          </li>
        )
      })}
      <div ref={end} />
    </ol>
  )
}

