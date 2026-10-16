import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Link } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { useApi } from '@/hooks/useApi'
import { kaluta, type CreatorFormats } from '@/lib/api'
import { cn } from '@/lib/utils'
import ErrorLine from './ErrorLine'

const field =
  'w-full rounded-card-sm border border-text-low/40 bg-text-low/5 px-3 py-2 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none'
const chip = (on: boolean) =>
  cn(
    'rounded-full border px-3.5 py-1.5 text-xs font-semibold',
    on ? 'border-gold/50 bg-gold/10 text-text-hi' : 'border-text-low/40 text-text-mid hover:text-text-hi',
  )

export interface CreateInput {
  source_text: string
  source_lang: string
  targets: string[]
  target_langs: string[]
}

/**
 * Where one piece of writing goes in, and which of the engine's formats and
 * languages it should come out as.
 *
 * Only what the engine can really make is offered as a choice, each with what
 * to expect from it. Anything this server cannot make is listed below with the
 * reason, so nobody ticks "video" and waits for something that is not coming.
 */
export default function StudioCompose({
  formats,
  busy,
  error,
  refresh,
  onCreate,
}: {
  formats: CreatorFormats | null
  busy: boolean
  error: string | null
  refresh: number
  onCreate: (input: CreateInput) => void
}) {
  const { user } = useAuth()
  const known = formats?.languages.map((l) => l.code) ?? []
  const [text, setText] = useState('')
  const [sourceLang, setSourceLang] = useState(user?.lang && known.includes(user.lang) ? user.lang : 'en')
  const [picked, setPicked] = useState<Set<string>>(new Set(['article']))
  const [langs, setLangs] = useState<Set<string>>(new Set([sourceLang]))

  // Offer translation only once the server has confirmed it is available for this account.
  const canTranslate = formats?.translation?.available ?? false
  // Only asked of an account that can translate: a minor has nothing to spend.
  const credits = useApi(() => (canTranslate ? kaluta.ai.credits() : Promise.resolve(null)), [canTranslate, refresh])
  const available = formats?.formats.filter((f) => f.available) ?? []
  const later = formats?.formats.filter((f) => !f.available) ?? []
  const max = formats?.max_source_chars ?? 20000

  const toggle = (set: Set<string>, value: string) => {
    const next = new Set(set)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    return next
  }

  const changeSource = (code: string) => {
    // The text's own language stays the one ticked; picking another replaces it.
    setLangs((current) => {
      const next = new Set(current)
      const had = next.delete(sourceLang)
      if (had) next.add(code)
      return next
    })
    setSourceLang(code)
  }

  // "Translate it into the language it is written in" makes nothing, and the
  // server says so; counting it here would promise an output that never comes.
  const made = [...picked].reduce(
    (n, target) => n + [...langs].filter((l) => !(target === 'translation' && l === sourceLang)).length,
    0,
  )
  const length = text.trim().length
  const ready = formats !== null && length > 0 && length <= max && made > 0 && !busy

  const hint =
    length === 0
      ? 'Write or paste something to start.'
      : picked.size === 0
        ? 'Choose at least one format.'
        : langs.size === 0
          ? 'Choose at least one language.'
          : made === 0
            ? 'A translation needs a language other than the one the text is written in.'
            : null

  return (
    <form
      className="cloud-card space-y-4 p-5"
      aria-label="Create"
      onSubmit={(e) => {
        e.preventDefault()
        if (!ready) return
        onCreate({ source_text: text.trim(), source_lang: sourceLang, targets: [...picked], target_langs: [...langs] })
      }}
    >
      <div>
        <label htmlFor="studio-source" className="text-sm font-semibold text-text-hi">
          Your idea, your draft
        </label>
        <p className="mt-0.5 text-xs text-text-mid">
          The first line becomes the headline. The engine rearranges and translates your words; it does not write new ones.
        </p>
        <textarea
          id="studio-source"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          maxLength={max}
          placeholder="Turn my market vlog into something people can read…"
          className={cn(field, 'mt-2 resize-y')}
        />
        <p className={cn('mt-1 text-end text-xs', length > max * 0.95 ? 'font-semibold text-text-hi' : 'text-text-mid')}>
          {length.toLocaleString('en-GB')} / {max.toLocaleString('en-GB')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs text-text-mid">
          It is written in
          <select
            value={sourceLang}
            onChange={(e) => changeSource(e.target.value)}
            className={cn(field, 'mt-1')}
            aria-label="Language the text is written in"
          >
            {(formats?.languages ?? [{ code: 'en', name: 'English', native: 'English' }]).map((l) => (
              <option key={l.code} value={l.code}>
                {l.name === l.native ? l.name : `${l.name} · ${l.native}`}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset>
        <legend className="text-xs font-semibold text-text-hi">Make</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {available.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={picked.has(f.id)}
              onClick={() => setPicked((s) => toggle(s, f.id))}
              className={chip(picked.has(f.id))}
            >
              {f.label}
            </button>
          ))}
        </div>
      </fieldset>

      {available.some((f) => picked.has(f.id) && f.note) && (
        <ul className="-mt-2 space-y-0.5 text-xs text-text-mid" aria-label="About the formats you chose">
          {available
            .filter((f) => picked.has(f.id) && f.note)
            .map((f) => (
              <li key={f.id}>
                <span className="font-semibold text-text-hi">{f.label}:</span> {f.note}
              </li>
            ))}
        </ul>
      )}

      <fieldset>
        <legend className="text-xs font-semibold text-text-hi">In</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {(formats?.languages ?? []).map((l) => {
            // For an account whose writing may not be translated, only the language it is written in.
            const locked = !canTranslate && l.code !== sourceLang
            return (
              <button
                key={l.code}
                type="button"
                aria-pressed={langs.has(l.code)}
                disabled={locked}
                onClick={() => !locked && setLangs((s) => toggle(s, l.code))}
                className={cn(chip(langs.has(l.code)), locked && 'cursor-not-allowed opacity-50')}
              >
                {l.name}
                {l.code === sourceLang && <span className="font-normal text-text-mid"> · original</span>}
              </button>
            )
          })}
        </div>
      </fieldset>

      {!canTranslate && formats?.translation?.reason && (
        <p className="-mt-2 text-xs text-text-mid">{formats.translation.reason}</p>
      )}
      {canTranslate && formats?.translation?.notice && (
        <p className="-mt-2 text-xs text-text-mid">{formats.translation.notice} <Link to="/studio/privacy" className="font-semibold text-text-hi underline">How your content is used</Link></p>
      )}
      <Link to="/studio/privacy" className="inline-block text-xs text-text-mid underline">Content and newsletter privacy</Link>
      {canTranslate && credits.data?.spendable && (
        <p className="-mt-2 text-xs text-text-mid">
          AI credits left this month: <span className="font-semibold text-text-hi">{credits.data.left}</span> of {credits.data.credits} (
          {credits.data.credit_characters.toLocaleString('en-GB')} characters each). They renew on {credits.data.renews_on}.
        </p>
      )}
      {canTranslate && credits.data?.spendable && !credits.data.plan_counted && (
        <p className="text-xs text-text-mid">The Free allowance applies until paid subscriptions are available.</p>
      )}
      {canTranslate && credits.error && <ErrorLine text={credits.error} />}

      {formats?.ai.simulated && (
        <p className="rounded-card-sm border border-warning/60 bg-warning/10 px-3 py-2 text-xs text-text-hi">
          The AI behind translation is a stand-in for now: it marks the text with the language instead of translating it, and
          every such result is labelled <strong>Simulated</strong>. A carousel, audio or video in another language is not made at
          all, because it would repeat the mark. Everything in your own language is real.
        </p>
      )}

      {later.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-text-hi">Not available yet</p>
          <ul className="mt-1 space-y-0.5 text-xs text-text-mid">
            {later.map((f) => (
              <li key={f.id}>
                {f.label} — {f.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!ready}
          className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-5 py-2 text-sm font-bold text-ink disabled:opacity-40"
        >
          <Sparkles size={14} aria-hidden="true" /> {busy ? 'Creating…' : made > 0 ? `Create ${made} ${made === 1 ? 'piece' : 'pieces'}` : 'Create'}
        </button>
        {hint && <span className="text-xs text-text-mid">{hint}</span>}
      </div>
      {error && <ErrorLine text={error} />}
    </form>
  )
}
