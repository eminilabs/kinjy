import { useState } from 'react'
import { Check, Copy, Languages, Loader2, Mail, MessageCircle, Repeat2, Send, Share2, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Segmented, Switch } from '@/components/dashboard/primitives'
import type { Post } from '@/lib/api'
import { cn } from '@/lib/utils'
import Comments from './Comments'
import MemberAvatar from './MemberAvatar'

/** The look shared by every post dialog: a card on the page's own surface. */
const SURFACE =
  'gap-0 overflow-hidden rounded-[24px] border-[var(--cloud-border)] bg-ink-2 p-0 text-text-hi shadow-[0_40px_80px_-30px_rgba(0,0,0,.45)]'
const PAD = 'px-6'
const pillGold =
  'inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-br from-gold-soft to-gold px-6 py-3 text-sm font-bold text-ink shadow-[0_12px_24px_-12px_rgba(169,118,28,.6)] disabled:opacity-50'
const pillQuiet =
  'inline-flex items-center justify-center gap-2 rounded-full border border-[var(--cloud-border)] px-6 py-3 text-sm font-semibold text-text-mid transition-colors hover:border-gold/50 hover:text-text-hi disabled:opacity-50'

function plain(text: string): string {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** Who wrote it and the first lines of it, so a dialog never loses the post it is about. */
function PostPreview({ post }: { post: Post }) {
  const snippet = plain(post.body)
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-text-hi/[0.05] p-4">
      <MemberAvatar
        handle={post.author?.handle}
        displayName={post.author?.display_name}
        avatarUrl={post.author?.avatar_url}
        size={40}
      />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-text-hi">{post.author?.display_name ?? 'Someone'}</p>
        {post.author?.handle && <p className="truncate text-xs text-text-low">@{post.author.handle}</p>}
        <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-text-mid">
          {snippet || (post.media.length > 0 ? `${post.media.length} attachment${post.media.length > 1 ? 's' : ''}` : '')}
        </p>
      </div>
    </div>
  )
}

function Header({ icon: Icon, tone, title, description }: { icon: typeof Repeat2; tone: string; title: string; description: string }) {
  return (
    <DialogHeader className={cn(PAD, 'pb-5 pt-6 text-start')}>
      <div className="flex items-center gap-3 pe-8">
        <span aria-hidden="true" className={cn('grid h-11 w-11 shrink-0 place-items-center rounded-2xl', tone)}>
          <Icon size={20} />
        </span>
        <div className="min-w-0">
          <DialogTitle className="text-[1.25rem] font-bold tracking-[-0.025em]">{title}</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-text-low">{description}</DialogDescription>
        </div>
      </div>
    </DialogHeader>
  )
}

/* ── Repost ─────────────────────────────────────────────────────────────── */

export function RepostDialog({
  open,
  onOpenChange,
  post,
  reposted,
  onRepost,
  onUndo,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  post: Post
  reposted: boolean
  /** Resolves when it worked; throws with a message when it did not. */
  onRepost: (thoughts: string) => Promise<void>
  onUndo: () => Promise<void>
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(SURFACE, 'sm:max-w-md')}>
        <RepostBody post={post} reposted={reposted} onRepost={onRepost} onUndo={onUndo} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}

/** Mounted only while the dialog is open, so its fields start empty every time. */
function RepostBody({
  post,
  reposted,
  onRepost,
  onUndo,
  onClose,
}: {
  post: Post
  reposted: boolean
  onRepost: (thoughts: string) => Promise<void>
  onUndo: () => Promise<void>
  onClose: () => void
}) {
  const [thoughts, setThoughts] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not go through')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Header
        icon={Repeat2}
        tone="bg-emerald-400/20 text-emerald-300"
        title={reposted ? 'You reposted this' : 'Repost'}
        description={reposted ? 'It is on your profile and in your followers’ feeds.' : 'Put this in front of your followers.'}
      />
      <div className={cn(PAD, 'space-y-4 pb-6')}>
        <PostPreview post={post} />
        {!reposted && (
          <label className="block">
            <span className="sr-only">Add your thoughts</span>
            <textarea
              value={thoughts}
              onChange={(event) => setThoughts(event.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="Add your thoughts (optional)"
              className="w-full resize-none rounded-2xl border border-transparent bg-text-hi/[0.07] px-4 py-3 text-[0.95rem] text-text-hi placeholder:text-text-low focus:border-gold/50 focus:bg-transparent focus:outline-none"
            />
            <span className="mt-1 block text-end text-xs text-text-low">
              {thoughts.length ? `${thoughts.length} / 2000` : 'Leave it empty for a plain repost'}
            </span>
          </label>
        )}
        {error && (
          <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" onClick={onClose} className={pillQuiet}>
            Cancel
          </button>
          {reposted ? (
            <button type="button" disabled={busy} onClick={() => void run(onUndo)} className={pillGold}>
              {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <X size={15} aria-hidden="true" />}
              Undo repost
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={() => void run(() => onRepost(thoughts.trim()))} className={pillGold}>
              {busy ? <Loader2 size={15} className="animate-spin" aria-hidden="true" /> : <Repeat2 size={15} aria-hidden="true" />}
              Repost
            </button>
          )}
        </div>
      </div>
    </>
  )
}

/* ── Share ──────────────────────────────────────────────────────────────── */

export function ShareDialog({
  open,
  onOpenChange,
  post,
  baseUrl,
  buildUrl,
  referralCode,
  nativeShare,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  post: Post
  baseUrl: string
  /** The link with or without the member's invitation code. */
  buildUrl: (withRef: boolean) => string
  referralCode: string | null
  /** The device's own share sheet, or the clipboard where there is none. */
  nativeShare: (url: string) => Promise<'shared' | 'copied' | 'cancelled' | 'failed'>
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(SURFACE, 'sm:max-w-md')}>
        <ShareBody post={post} baseUrl={baseUrl} buildUrl={buildUrl} referralCode={referralCode} nativeShare={nativeShare} />
      </DialogContent>
    </Dialog>
  )
}

/** Mounted only while the dialog is open, so it always opens on a fresh state. */
function ShareBody({
  post,
  baseUrl,
  buildUrl,
  referralCode,
  nativeShare,
}: {
  post: Post
  baseUrl: string
  buildUrl: (withRef: boolean) => string
  referralCode: string | null
  nativeShare: (url: string) => Promise<'shared' | 'copied' | 'cancelled' | 'failed'>
}) {
  const [withRef, setWithRef] = useState(true)
  const [copied, setCopied] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const url = referralCode ? buildUrl(withRef) : baseUrl
  const who = post.author?.display_name
  const text = who ? `${who} on Kinjy` : 'A post on Kinjy'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setNote(null)
      setTimeout(() => setCopied(false), 2200)
    } catch {
      setNote('Could not copy — select the link and copy it by hand.')
    }
  }

  const enc = encodeURIComponent
  const targets = [
    { label: 'WhatsApp', href: `https://wa.me/?text=${enc(`${text} ${url}`)}`, icon: MessageCircle, tone: 'bg-emerald-400/20 text-emerald-300' },
    { label: 'Telegram', href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`, icon: Send, tone: 'bg-sky/20 text-sky' },
    { label: 'X', href: `https://twitter.com/intent/tweet?url=${enc(url)}&text=${enc(text)}`, icon: X, tone: 'bg-text-hi/10 text-text-hi' },
    { label: 'Email', href: `mailto:?subject=${enc(text)}&body=${enc(url)}`, icon: Mail, tone: 'bg-coral/20 text-coral' },
  ]

  return (
    <>
      <Header
          icon={Share2}
          tone="bg-sky/20 text-sky"
          title="Share this post"
          description="Anyone with the link can read it — no account needed."
        />
        <div className={cn(PAD, 'space-y-5 pb-6')}>
          <PostPreview post={post} />

          <div>
            <div className="grid grid-cols-4 gap-2">
              {targets.map((target) => (
                <a
                  key={target.label}
                  href={target.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 rounded-2xl bg-text-hi/[0.05] px-2 py-3 text-xs font-semibold text-text-mid transition-colors hover:bg-text-hi/[0.09] hover:text-text-hi"
                >
                  <span aria-hidden="true" className={cn('grid h-10 w-10 place-items-center rounded-xl', target.tone)}>
                    <target.icon size={18} />
                  </span>
                  {target.label}
                </a>
              ))}
            </div>
          </div>

          {/* The link is shown, not only copied: somebody about to put their
              name on something in a group chat should read what they are
              sending, including the code on the end. */}
          <div>
            <p className="mb-2 text-sm font-semibold text-text-mid">Link</p>
            <div className="flex gap-2">
              <input
                readOnly
                value={url}
                onFocus={(event) => event.currentTarget.select()}
                aria-label="Link to this post"
                className="w-full min-w-0 rounded-full border border-transparent bg-text-hi/[0.07] px-4 py-3 text-sm text-text-mid focus:border-gold/50 focus:outline-none"
              />
              <button type="button" onClick={() => void copy()} className={cn(pillGold, 'shrink-0 px-5')}>
                {copied ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            {note && (
              <p role="status" className="mt-2 text-sm text-text-mid">
                {note}
              </p>
            )}
          </div>

          {referralCode && (
            <div className="flex items-start justify-between gap-4 rounded-2xl bg-text-hi/[0.05] p-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-hi">
                  Include my invitation code <span className="ms-1 font-mono text-text-low">{referralCode}</span>
                </p>
                <p className="mt-1 text-sm text-text-low">Anyone who joins from this link is credited to you.</p>
              </div>
              <Switch label="Include my invitation code" checked={withRef} onChange={setWithRef} />
            </div>
          )}

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              type="button"
              onClick={async () => {
                const result = await nativeShare(url)
                setNote(result === 'copied' ? 'Link copied.' : result === 'failed' ? 'Could not share — copy the link by hand.' : null)
              }}
              className={cn(pillQuiet, 'w-full')}
            >
              <Share2 size={15} aria-hidden="true" />
              More options…
            </button>
          )}
        </div>
    </>
  )
}

/* ── Comments ───────────────────────────────────────────────────────────── */

export function CommentsDialog({
  open,
  onOpenChange,
  post,
  currentUserId,
  count,
  onCountChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  post: Post
  currentUserId: string
  count: number
  onCountChange: (delta: number) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(SURFACE, 'flex max-h-[88vh] flex-col sm:max-w-xl')}>
        <Header
          icon={MessageCircle}
          tone="bg-gold/20 text-gold-soft"
          title={count === 1 ? '1 comment' : `${count} comments`}
          description="Join the conversation."
        />
        <div className={cn(PAD, 'pb-4')}>
          <PostPreview post={post} />
        </div>
        <div className={cn(PAD, 'min-h-0 flex-1 overflow-y-auto pb-6')}>
          <Comments postId={post.id} currentUserId={currentUserId} onCountChange={onCountChange} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Translation ────────────────────────────────────────────────────────── */

function languageName(code: string): string {
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(code) ?? code.toUpperCase()
  } catch {
    return code.toUpperCase()
  }
}

export type TranslationView = 'translated' | 'both'

/**
 * A translation, shown under the post rather than instead of it.
 *
 * The original stays where it was, so nobody has to toggle back to check what
 * the author actually wrote. The panel names both languages, says who did the
 * translating, and offers the original next to it for the cases where a
 * machine translation needs a second pair of eyes.
 */
export function TranslationPanel({
  from,
  to,
  original,
  translation,
  loading,
  view,
  onView,
  onHide,
}: {
  from: string
  to: string
  original: string
  translation: { text: string; provider?: string; mock?: boolean } | null
  loading: boolean
  view: TranslationView
  onView: (view: TranslationView) => void
  onHide: () => void
}) {
  return (
    <section aria-label="Translation" className="mt-3 overflow-hidden rounded-2xl border border-sky/30 bg-sky/[0.07]">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-sky/20 px-4 py-3">
        <span aria-hidden="true" className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-sky/20 text-sky">
          <Languages size={16} />
        </span>
        <p className="min-w-0 text-sm font-semibold text-text-hi">
          {languageName(from)} <span className="text-text-low">→</span> {languageName(to)}
        </p>
        <div className="ms-auto flex items-center gap-2">
          {translation && (
            <Segmented
              value={view}
              onChange={onView}
              options={[
                { id: 'translated', label: 'Translation' },
                { id: 'both', label: 'With original' },
              ]}
            />
          )}
          <button
            type="button"
            onClick={onHide}
            aria-label="Hide translation"
            className="grid h-8 w-8 place-items-center rounded-full text-text-low hover:bg-text-hi/10 hover:text-text-hi"
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="px-4 py-4">
        {loading && !translation ? (
          <div className="space-y-2" role="status" aria-label="Translating">
            <div className="h-3 w-11/12 animate-pulse rounded-full bg-text-hi/10" />
            <div className="h-3 w-9/12 animate-pulse rounded-full bg-text-hi/10" />
            <div className="h-3 w-6/12 animate-pulse rounded-full bg-text-hi/10" />
          </div>
        ) : translation ? (
          view === 'both' ? (
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-text-low">{languageName(from)} · original</p>
                <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-text-mid">{original}</p>
              </div>
              <div className="sm:border-s sm:border-sky/20 sm:ps-4">
                <p className="mb-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-sky">{languageName(to)} · translated</p>
                <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-text-hi">{translation.text}</p>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-text-hi">{translation.text}</p>
          )
        ) : null}
      </div>

      {translation && (
        <p className="border-t border-sky/20 px-4 py-2 text-xs text-text-low">
          Translated by {translation.provider ?? 'the language gateway'}
          {translation.mock && ' · sample translation — no model key is configured'}
        </p>
      )}
    </section>
  )
}
