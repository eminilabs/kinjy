import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, FileText, Mic, Send, Video, X } from 'lucide-react'
import Orb, { type OrbState } from './Orb'
import DemoVideoPlayer from './DemoVideoPlayer'
import { clipFromAnswer } from './clip'
import { LANG_META, type Lang } from './knowledgeBase'
import { useAuth } from '@/hooks/useAuth'
import { ApiError, api, kaluta } from '@/lib/api'
import { onChange } from '@/lib/live'
import { cn } from '@/lib/utils'
import { FLOAT_SLOT_0 } from '@/lib/floating'

interface Answer {
  session_id: string
  lang: string
  role: string
  grounded: boolean
  answer: string
  title?: string
  module?: string
  source?: string | null
  steps?: string[]
  image?: string | null
  image_alt?: string | null
  deep_link?: string | null
  deep_link_label?: string | null
  kb_version?: string
}

interface Turn {
  id: number
  from: 'user' | 'assistant'
  text: string
  answer?: Answer
}

/**
 * Where the orb sits per module (blueprint: "moves dynamically depending on the
 * user's active module"). The point is that it lands near whatever the member
 * is likely to ask about — beside the composer on the feed, next to the
 * memorial actions on the graveyard — instead of always hiding bottom-right.
 */
/**
 * What the orb offers on each module, as a hint on the button.
 *
 * The position no longer changes per page. Moving it to a different corner on
 * every module meant hunting for it, and it kept landing on top of whatever the
 * page put in that corner — the floating compose button on the feed, the
 * relationship rail on a profile. One resting place, above the mobile bar; only
 * the wording adapts.
 */
const HINTS: Array<{ match: RegExp; hint: string }> = [
  { match: /^\/hub/, hint: 'Ask about feed modes, ranking or posting' },
  { match: /^\/tree/, hint: 'Ask how relationships are derived or verified' },
  { match: /^\/graveyard/, hint: 'Ask about memorials, tributes or QR codes' },
  { match: /^\/dashboard/, hint: 'Ask about payouts, KYC or your commissions' },
  { match: /^\/market|^\/commerce/, hint: 'Ask how the 20% margin is split' },
  { match: /^\/messages/, hint: 'Ask about encryption and privacy' },
  { match: /^\/(circles|communities|forums)/, hint: 'Ask who can see what' },
  { match: /^\/u\//, hint: 'Ask about following, connecting and privacy' },
]

const DEFAULT_HINT = 'Ask me anything about Kinjy'

/** Clear of the mobile bottom bar, and of the feed's floating compose button. */
// Slot 0 of the shared floating stack — see lib/floating.ts. Anything else
// that floats must take the next slot rather than pick its own offsets.
const ORB_POSITION = FLOAT_SLOT_0

const SUGGESTIONS: Record<string, string[]> = {
  en: ['How do feed modes work?', 'How is my payout calculated?', 'How is the family tree verified?'],
  fr: ['Comment marchent les modes de fil ?', 'Comment mon paiement est-il calculé ?', "Comment l'arbre est-il vérifié ?"],
  sw: ['Njia za mlisho zinafanyaje kazi?', 'Mapato yangu yanahesabiwaje?', 'Mti wa familia unathibitishwaje?'],
  ar: ['كيف تعمل أوضاع الخلاصة؟', 'كيف تُحسب أرباحي؟', 'كيف يتم التحقق من شجرة العائلة؟'],
  zh: ['信息流模式如何运作？', '我的收益如何计算？', '家族树如何验证？'],
}

export default function LiveAssistant() {
  const { pathname } = useLocation()
  const { i18n } = useTranslation()
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'written' | 'clip'>('written')
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sessionRef = useRef<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const nextId = useRef(0)

  // Hidden by choice, in Dashboard → Privacy. Visitors always see it: there is
  // no account yet to hold the preference.
  const [visible, setVisible] = useState(true)
  const loadVisibility = useCallback(() => {
    if (!user) return setVisible(true)
    kaluta.account
      .preferences()
      .then((p) => setVisible(p.assistant_visible !== false))
      .catch(() => undefined)
  }, [user])
  useEffect(() => loadVisibility(), [loadVisibility])
  useEffect(() => onChange('profile', loadVisibility), [loadVisibility])

  const hint = useMemo(
    () => HINTS.find((a) => a.match.test(pathname))?.hint ?? DEFAULT_HINT,
    [pathname],
  )

  const uiLang = i18n.language.slice(0, 2)
  const last = [...turns].reverse().find((t) => t.from === 'assistant' && t.answer)?.answer

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [turns, open])

  const ask = useCallback(
    async (question: string) => {
      const text = question.trim()
      if (!text || busy) return
      setBusy(true)
      setError(null)
      setTurns((current) => [...current, { id: nextId.current++, from: 'user', text }])
      setDraft('')

      try {
        // No `lang` is sent: the service detects the script and answers in the
        // language the member wrote in, which is the blueprint's rule. Only the
        // UI language is offered as the fallback for ambiguous Latin text.
        const result = await api.post<Answer>(
          '/assistant/ask',
          {
            question: text,
            session_id: sessionRef.current,
            module: pathname,
            lang: /[؀-ۿ一-鿿]/.test(text) ? undefined : uiLang,
          },
          { auth: Boolean(user) },
        )
        sessionRef.current = result.session_id
        setTurns((current) => [
          ...current,
          { id: nextId.current++, from: 'assistant', text: result.answer, answer: result },
        ])
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'The assistant is unreachable right now.')
      } finally {
        setBusy(false)
      }
    },
    [busy, pathname, uiLang, user],
  )

  /** Voice input via the Web Speech API — absent in some browsers, so guarded. */
  const toggleVoice = useCallback(() => {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Recognition) {
      setError('This browser has no speech recognition. Type your question instead.')
      return
    }
    if (listening) {
      setListening(false)
      return
    }
    const recognition = new Recognition()
    recognition.lang = uiLang === 'en' ? 'en-US' : uiLang
    recognition.interimResults = false
    recognition.onresult = (event) => {
      const said = event.results[0]?.[0]?.transcript ?? ''
      setListening(false)
      if (said) void ask(said)
    }
    recognition.onerror = () => {
      setListening(false)
      setError('Could not hear that.')
    }
    recognition.onend = () => setListening(false)
    setListening(true)
    recognition.start()
  }, [ask, listening, uiLang])

  const orbState: OrbState = busy ? 'thinking' : listening ? 'listening' : 'idle'
  if (!visible && !open) return null
  const suggestions = SUGGESTIONS[uiLang] ?? SUGGESTIONS.en

  return (
    <>
      {/* The orb — repositioned per module */}
      <motion.button
        type="button"
        layout
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close Kinjy Assistant' : 'Open Kinjy Assistant'}
        aria-expanded={open}
        title={hint}
        transition={{ type: 'spring', stiffness: 210, damping: 26 }}
        className={cn('fixed z-[60]', ORB_POSITION, open && 'pointer-events-none opacity-0')}
      >
        <Orb size={56} state={orbState} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-4 end-4 z-[75] flex max-h-[min(640px,85svh)] w-[min(420px,calc(100vw-2rem))] flex-col rounded-card-lg cloud-glass bg-ink-2/95 shadow-cloud"
            role="dialog"
            aria-label="Kinjy Assistant"
          >
            <header className="flex items-center gap-3 border-b border-white/8 p-4">
              <Orb size={32} state={orbState} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-hi">Kinjy Assistant</p>
                <p className="caption truncate">
                  {user ? `Answering as ${user.role}` : 'Answering as visitor'} · {hint}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="ms-auto shrink-0 rounded-full p-1.5 text-text-mid hover:text-text-hi"
              >
                <X size={16} />
              </button>
            </header>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
              {turns.length === 0 && (
                <div>
                  <p className="text-sm text-text-mid">
                    I answer from Kinjy's knowledge base, in the language you write in, and only
                    what your access level allows. I do not invent answers.
                  </p>
                  <ul className="mt-3 space-y-1.5">
                    {suggestions.map((s) => (
                      <li key={s}>
                        <button
                          type="button"
                          onClick={() => void ask(s)}
                          className="w-full rounded-full border border-white/10 px-3 py-2 text-start text-xs text-text-mid transition-colors hover:border-gold/40 hover:text-gold-soft"
                        >
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {turns.map((turn) =>
                turn.from === 'user' ? (
                  <p
                    key={turn.id}
                    className="ms-auto w-fit max-w-[85%] rounded-card-md bg-gold/15 px-3.5 py-2 text-sm text-text-hi"
                  >
                    {turn.text}
                  </p>
                ) : (
                  <div key={turn.id} className="rounded-card-md bg-white/5 p-3.5">
                    {turn.answer?.title && (
                      <p className="caption mb-1.5">
                        {turn.answer.title}
                        {turn.answer.kb_version && <span className="text-text-low"> · {turn.answer.kb_version}</span>}
                      </p>
                    )}

                    {/* Two formats, per the blueprint: written, or a walkthrough clip. */}
                    {turn.answer?.grounded && (
                      <div className="mb-2.5 flex gap-1">
                        {(
                          [
                            ['written', FileText, 'Written'],
                            ['clip', Video, 'Demo clip'],
                          ] as const
                        ).map(([id, Icon, label]) => (
                          <button
                            key={id}
                            type="button"
                            onClick={() => setTab(id)}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold transition-colors',
                              tab === id ? 'bg-gold/15 text-gold-soft' : 'text-text-low hover:text-text-mid',
                            )}
                          >
                            <Icon size={11} aria-hidden="true" />
                            {label}
                          </button>
                        ))}
                      </div>
                    )}

                    {tab === 'clip' && turn.answer?.grounded ? (
                      <DemoVideoPlayer
                        title={turn.answer.title ?? 'Kinjy'}
                        steps={clipFromAnswer(turn.text)}
                        lang={(turn.answer.lang in LANG_META ? turn.answer.lang : 'en') as Lang}
                      />
                    ) : (
                      <>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-mid">{turn.text}</p>
                        {turn.answer?.image && (
                          <img
                            src={turn.answer.image}
                            alt={turn.answer.image_alt ?? ''}
                            loading="lazy"
                            className="mt-3 w-full rounded-card-sm object-cover"
                            style={{ maxHeight: 160 }}
                          />
                        )}
                        {turn.answer?.steps && turn.answer.steps.length > 0 && (
                          <ol className="mt-3 space-y-1.5 text-xs text-text-mid">
                            {turn.answer.steps.map((step, index) => (
                              <li key={step} className="flex gap-2">
                                <span className="mono-data shrink-0 text-gold-soft">{index + 1}.</span>
                                {step}
                              </li>
                            ))}
                          </ol>
                        )}
                      </>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {turn.answer?.deep_link && (
                        <Link
                          to={turn.answer.deep_link}
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-gold-soft hover:underline"
                        >
                          {turn.answer.deep_link_label ?? 'Open'}
                          <ArrowRight size={11} aria-hidden="true" />
                        </Link>
                      )}
                      {turn.answer?.source && (
                        <span className="caption ms-auto">Source: {turn.answer.source}</span>
                      )}
                    </div>
                  </div>
                ),
              )}

              {busy && <p className="text-xs text-text-low">Thinking…</p>}
              {error && (
                <p role="alert" className="text-xs text-amber-200">
                  {error}
                </p>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                void ask(draft)
              }}
              className="flex gap-2 border-t border-white/8 p-3"
            >
              <button
                type="button"
                onClick={toggleVoice}
                aria-label={listening ? 'Stop listening' : 'Ask by voice'}
                aria-pressed={listening}
                className={cn(
                  'shrink-0 rounded-full p-2.5 transition-colors',
                  listening ? 'bg-gold/20 text-gold-soft' : 'text-text-mid hover:text-gold-soft',
                )}
              >
                <Mic size={16} />
              </button>
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={listening ? 'Listening…' : 'Ask in any language…'}
                aria-label="Ask the Kinjy Assistant"
                className="w-full rounded-full border border-white/10 bg-ink/60 px-4 py-2.5 text-sm text-text-hi placeholder:text-text-low focus:border-gold/40 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!draft.trim() || busy}
                aria-label="Send"
                className="shrink-0 rounded-full bg-gradient-to-br from-gold-soft to-gold px-3.5 text-ink disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </form>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Screen-reader announcement of the latest grounded answer */}
      <p className="sr-only" role="status" aria-live="polite">
        {last?.answer ?? ''}
      </p>
    </>
  )
}
