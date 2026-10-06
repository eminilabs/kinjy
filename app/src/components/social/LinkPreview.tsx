import { useEffect, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { kaluta, type LinkCard } from '@/lib/api'

/**
 * The card under a post that contains a link.
 *
 * Fetched rather than guessed: the title, description and image come from the
 * page's own Open Graph tags, read by the server. It is the server that fetches
 * them, not the browser — a page may not be reachable from the member's
 * network, and more to the point, having every reader's browser fetch whatever
 * a post links to is a way of pointing a crowd at somebody else's site.
 *
 * A link with no card is not an error. Plenty of pages have no tags, some
 * refuse unknown clients, and some are simply down. The link stays clickable in
 * the body either way, so this renders nothing rather than an apology.
 */
export default function LinkPreview({ url }: { url: string }) {
  const [card, setCard] = useState<LinkCard | null>(null)

  useEffect(() => {
    let alive = true
    kaluta.posts
      .linkPreview(url)
      .then((result) => alive && setCard(result))
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [url])

  if (!card || (!card.title && !card.image)) return null

  let host = card.site_name
  try {
    host = card.site_name || new URL(card.url).hostname.replace(/^www\./, '')
  } catch {
    /* the server validated it; this is only for the label */
  }

  return (
    <a
      href={card.url}
      target="_blank"
      // noreferrer as well as noopener: without it the destination learns which
      // Kinjy page somebody came from, which for a private post is its address.
      rel="noopener noreferrer nofollow"
      className="mt-3 block overflow-hidden rounded-card-sm border border-white/10 transition hover:border-gold/35"
    >
      {card.image && (
        <img
          src={card.image}
          alt=""
          loading="lazy"
          // referrerPolicy for the same reason as rel=noreferrer: loading the
          // thumbnail should not tell the host where it is being shown.
          referrerPolicy="no-referrer"
          className="h-44 w-full bg-ink object-cover"
          onError={(event) => {
            // A dead thumbnail should leave a tidy card, not a broken icon.
            event.currentTarget.style.display = 'none'
          }}
        />
      )}
      <div className="p-3">
        <p className="caption inline-flex items-center gap-1 uppercase">
          <ExternalLink size={10} aria-hidden="true" />
          {host}
        </p>
        {card.title && (
          <p className="mt-1 line-clamp-2 text-sm font-semibold text-text-hi">{card.title}</p>
        )}
        {card.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-text-mid">
            {card.description}
          </p>
        )}
      </div>
    </a>
  )
}

/** The first http(s) link in a body, which is the one worth unfurling. */
export function firstLink(text: string): string | null {
  // Trailing punctuation is almost always the sentence's, not the URL's.
  const match = text.match(/https?:\/\/[^\s<>"']+/i)
  if (!match) return null
  return match[0].replace(/[.,;:!?)\]]+$/, '')
}
