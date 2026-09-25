import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUpRight, Image as ImageIcon, Mic, Play, Send, Sparkles, Volume2, VolumeX, X, Zap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { ProvenanceTag } from '@/components/ui-kit'
import Orb from './Orb'
import SelfUpdate from './SelfUpdate'
import AIWatch from './AIWatch'
import { WATCH_ADVISORIES } from './watchData'
import DemoVideoPlayer from './DemoVideoPlayer'
import { clipFromAnswer } from './clip'
import { useRole } from './roleStore'
import type { ChatMessage } from './types'
import type { KBEntry, Lang, Role } from './knowledgeBase'
import {
  LANG_META,
  DEFAULT_SUGGESTIONS,
  KB_BY_ID,
  contextForPath,
  detectLanguage,
  fmt,
  matchEntry,
  UI_STRINGS,
} from './knowledgeBase'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]
const BCP47: Record<Lang, string> = { en: 'en-US', sw: 'sw-KE', fr: 'fr-FR', ar: 'ar-SA', zh: 'zh-CN' }

const WELCOME: Record<Lang, string> = {
  en: "Hi — I'm the Kinjy Assistant. I read the codebase, so I can answer anything about how Kinjy works — in writing with illustrations, or as a demo clip. {context}",
  sw: 'Habari — mimi ni Kinjy Assistant. Ninasoma msimbo wa tovuti, kwa hiyo ninaweza kujibu chochote kuhusu jinsi Kinjy inavyofanya kazi — kwa maandishi na picha, au kwa video ya demo. {context}',
  fr: 'Bonjour — je suis le Kinjy Assistant. Je lis le code, donc je peux répondre à toute question sur le fonctionnement de Kinjy — par écrit avec illustrations, ou en clip de démonstration. {context}',
  ar: 'مرحبًا — أنا مساعد كالوتا. أقرأ قاعدة الكود، لذا أستطيع الإجابة عن أي سؤال حول طريقة عمل كالوتا — كتابةً مع صور توضيحية أو كمقطع فيديو توضيحي. {context}',
  zh: '你好——我是 Kinjy 助手。我直接阅读代码库，因此可以回答关于 Kinjy 任何功能的问题——以图文形式，或演示视频形式。{context}',
}

const WELCOME_CONTEXT: Record<Lang, string> = {
  en: "You're in {module} — popular here: {topics}.",
  sw: 'Upo kwenye {module} — maarufu hapa: {topics}.',
  fr: 'Vous êtes dans {module} — populaire ici : {topics}.',
  ar: 'أنت في {module} — الأسئلة الشائعة هنا: {topics}.',
  zh: '您当前在{module}——此处热门：{topics}。',
}

let idCounter = 0
const nextId = () => `m${++idCounter}`

/* ------------------------------------------------------------------ */
/* Waveform — live 8-bar indicator while listening                     */
/* ------------------------------------------------------------------ */
export function Waveform({ bars = 8, className }: { bars?: number; className?: string }) {
  return (
    <span className={cn('flex items-end gap-[3px]', className)} aria-hidden="true">
      {Array.from({ length: bars }).map((_, i) => (
        <span
          key={i}
          className="w-[3px] origin-bottom rounded-full bg-gold-soft animate-wave-bar"
          style={{ height: 14, animationDelay: `${i * 0.09}s` }}
        />
      ))}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Answer card — dual response format tabs                             */
/* ------------------------------------------------------------------ */
function AnswerCard({ entry, lang, text }: { entry: KBEntry; lang: Lang; text: string }) {
  const [tab, setTab] = useState<'written' | 'video'>('written')
  const s = UI_STRINGS[lang]
  const clip = useMemo(() => clipFromAnswer(text), [text])

  return (
    <div className="mt-2.5">
      {/* Format tabs */}
      <div className="flex gap-1 rounded-full border border-white/10 bg-ink/50 p-1" role="tablist" aria-label="Response format">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'written'}
          onClick={() => setTab('written')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[0.68rem] font-bold transition-colors',
            tab === 'written' ? 'bg-gold/90 text-ink' : 'text-text-mid hover:text-text-hi',
          )}
        >
          <ImageIcon size={11} aria-hidden="true" /> {s.tabWritten}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'video'}
          onClick={() => setTab('video')}
          className={cn(
            'flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[0.68rem] font-bold transition-colors',
            tab === 'video' ? 'bg-gold/90 text-ink' : 'text-text-mid hover:text-text-hi',
          )}
        >
          <Play size={11} aria-hidden="true" /> {s.tabVideo}
        </button>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {tab === 'written' ? (
          <motion.div
            key="written"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pt-3"
          >
            {entry.steps && (
              <ol className="mb-3 space-y-2">
                {entry.steps.map((step, i) => (
                  <li key={step} className="flex items-start gap-2.5 text-[0.78rem] leading-relaxed text-text-mid">
                    <span className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-soft to-gold font-mono text-[0.58rem] font-bold text-ink">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            )}
            {entry.image && (
              <figure className="mb-3">
                <img
                  src={entry.image}
                  alt={entry.imageAlt ?? ''}
                  loading="lazy"
                  className="w-full rounded-card-sm border border-white/10 object-cover"
                />
                {entry.imageAlt && <figcaption className="caption mt-1.5 text-[0.66rem]">{entry.imageAlt}</figcaption>}
              </figure>
            )}
            {entry.deepLink && (
              <Link
                to={entry.deepLink.to}
                className="inline-flex items-center gap-1.5 rounded-full border border-sky/30 bg-sky/10 px-3 py-1.5 text-[0.68rem] font-bold text-sky transition-colors hover:border-sky/60"
              >
                {s.deepLinkLabel}: {entry.deepLink.label}
                <ArrowUpRight size={11} aria-hidden="true" />
              </Link>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="video"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="pt-3"
          >
            <DemoVideoPlayer title={`${s.videoTitle} · ${entry.title[lang]}`} steps={clip} lang={lang} />
            <p className="caption mt-1.5 text-[0.64rem]">{s.captionsNote}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Message bubble                                                      */
/* ------------------------------------------------------------------ */
function MessageBubble({ msg }: { msg: ChatMessage }) {
  const s = UI_STRINGS[msg.lang]
  if (msg.author === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: EASE }}
        className="flex justify-end"
      >
        <div className="max-w-[85%] rounded-card-md rounded-ee-sm bg-indigo/45 px-3.5 py-2.5 text-[0.82rem] leading-relaxed">
          {msg.via === 'voice' && (
            <span className="mb-1 flex items-center gap-1.5 text-[0.6rem] font-bold uppercase tracking-widest text-sky">
              <Mic size={9} aria-hidden="true" /> Voice · {LANG_META[msg.lang].label}
            </span>
          )}
          {msg.text}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="flex justify-start"
    >
      <div className="max-w-[92%] rounded-card-md rounded-es-sm border border-white/10 border-s-2 border-s-gold bg-white/[0.05] px-3.5 py-2.5 backdrop-blur">
        <p className="text-[0.82rem] leading-relaxed">{msg.text}</p>

        {msg.kind === 'refusal' && (
          <p className="mt-2 flex items-center gap-1.5 rounded-card-sm border border-warning/25 bg-warning/10 px-2.5 py-1.5 text-[0.68rem] text-warning">
            <Zap size={10} aria-hidden="true" /> {s.escalateNote}
          </p>
        )}

        {msg.entry && msg.kind === 'answer' && <AnswerCard entry={msg.entry} lang={msg.lang} text={msg.text} />}

        {/* Provenance + grounding citation */}
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <ProvenanceTag kind="ai-generated" />
          {msg.entry && (
            <span className="font-mono text-[0.6rem] text-text-low">
              {s.fromSource}: {msg.entry.module} · {s.updated} {msg.entry.version}
            </span>
          )}
          {msg.lang !== 'en' && (
            <span className="rounded-full border border-sky/25 bg-sky/10 px-2 py-0.5 text-[0.58rem] font-bold text-sky">
              {fmt(s.langChip, { lang: LANG_META[msg.lang].label })}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */
/* Chat Panel                                                          */
/* ------------------------------------------------------------------ */
export interface ChatPanelProps {
  onClose: () => void
  /** Open directly on the AI Watch tab (admin notification deep-link). */
  initialTab?: 'chat' | 'watch'
  /** Report orb state upward (idle / listening / thinking / notifying). */
  onOrbState?: (state: 'idle' | 'listening' | 'thinking' | 'notifying') => void
}

export default function ChatPanel({ onClose, initialTab = 'chat', onOrbState }: ChatPanelProps) {
  const { i18n } = useTranslation()
  const { role, setRole, canSeeAdmin } = useRole()
  const location = useLocation()

  const uiLang = (['en', 'sw', 'fr', 'ar', 'zh'].includes(i18n.language) ? i18n.language : 'en') as Lang
  const [chatLang, setChatLang] = useState<Lang>(uiLang)
  const s = UI_STRINGS[chatLang]

  const [tab, setTab] = useState<'chat' | 'watch'>(initialTab)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [listening, setListening] = useState(false)
  const [spoken, setSpoken] = useState(false)

  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const recRef = useRef<SpeechRecognitionInstance | null>(null)
  const thinkingTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const speechSupported = typeof window !== 'undefined' && Boolean(window.SpeechRecognition ?? window.webkitSpeechRecognition)
  const context = contextForPath(location.pathname)
  const dir = LANG_META[chatLang].dir

  /* Welcome message (module-aware) on first open */
  useEffect(() => {
    if (messages.length > 0) return
    const ctx = contextForPath(location.pathname)
    const topics = (ctx?.suggestionIds ?? DEFAULT_SUGGESTIONS)
      .slice(0, 3)
      .map((id) => KB_BY_ID[id]?.title[uiLang] ?? id)
      .join(' · ')
    const contextLine = ctx
      ? fmt(WELCOME_CONTEXT[uiLang], { module: ctx.moduleName, topics })
      : ''
    setMessages([
      { id: nextId(), author: 'assistant', lang: uiLang, text: fmt(WELCOME[uiLang], { context: contextLine }), kind: 'welcome' },
    ])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* Focus composer on open; Esc closes */
  useEffect(() => {
    inputRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  /* Auto-scroll to latest message */
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, thinking, tab])

  useEffect(() => () => {
    if (thinkingTimer.current) clearTimeout(thinkingTimer.current)
    recRef.current?.abort()
    window.speechSynthesis?.cancel()
  }, [])

  const setOrb = useCallback(
    (st: 'idle' | 'listening' | 'thinking' | 'notifying') => onOrbState?.(st),
    [onOrbState],
  )

  const speak = useCallback((text: string, lang: Lang) => {
    if (!window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = BCP47[lang]
    u.rate = 1.02
    window.speechSynthesis.speak(u)
  }, [])

  const respond = useCallback(
    (raw: string, via: 'text' | 'voice') => {
      const query = raw.trim()
      if (!query || thinking) return
      const lang = detectLanguage(query, uiLang)
      setChatLang(lang)
      setInput('')
      setMessages((m) => [...m, { id: nextId(), author: 'user', via, lang, text: query }])
      setThinking(true)
      setOrb('thinking')

      thinkingTimer.current = setTimeout(() => {
        const ls = UI_STRINGS[lang]
        const { entry } = matchEntry(query)
        let reply: ChatMessage
        if (!entry) {
          reply = { id: nextId(), author: 'assistant', lang, text: ls.noInfo, kind: 'fallback' }
        } else if (entry.adminOnly && role !== 'admin') {
          reply = {
            id: nextId(),
            author: 'assistant',
            lang,
            text: fmt(ls.adminRefusal, { role: ls[role as 'visitor' | 'member' | 'admin'] }),
            kind: 'refusal',
            entry,
          }
        } else {
          reply = { id: nextId(), author: 'assistant', lang, text: entry.answer[lang], kind: 'answer', entry }
        }
        setMessages((m) => [...m, reply])
        setThinking(false)
        setOrb('idle')
        if (spoken) speak(reply.text, lang)
      }, 850)
    },
    [thinking, uiLang, role, spoken, speak, setOrb],
  )

  /* Voice input (Web Speech API) */
  const toggleListening = useCallback(() => {
    if (!speechSupported) return
    if (listening) {
      recRef.current?.stop()
      return
    }
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition
    if (!Ctor) return
    const rec = new Ctor()
    rec.lang = BCP47[chatLang]
    rec.interimResults = true
    rec.continuous = false
    rec.onresult = (e) => {
      let transcript = ''
      for (let i = 0; i < e.results.length; i++) transcript += e.results[i][0].transcript
      setInput(transcript)
    }
    rec.onend = () => {
      setListening(false)
      setOrb('idle')
    }
    rec.onerror = () => {
      setListening(false)
      setOrb('idle')
    }
    recRef.current = rec
    rec.start()
    setListening(true)
    setOrb('listening')
  }, [speechSupported, listening, chatLang, setOrb])

  const suggestions = useMemo(() => {
    const ids = context?.suggestionIds ?? DEFAULT_SUGGESTIONS
    return ids
      .map((id) => KB_BY_ID[id])
      .filter((e): e is KBEntry => Boolean(e) && (!e.adminOnly || canSeeAdmin))
      .slice(0, 3)
  }, [context, canSeeAdmin])

  const roleBadge: Record<Role, string> = {
    visitor: 'border-white/20 bg-white/5 text-text-mid',
    member: 'border-sky/30 bg-sky/10 text-sky',
    admin: 'border-gold/40 bg-gold/15 text-gold-soft',
  }

  return (
    <div dir={dir} className="flex h-full flex-col overflow-hidden rounded-card-xl border border-white/15 bg-ink-2/70 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl" role="dialog" aria-label="Kinjy Assistant chat">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-3">
        <Orb size={34} state={listening ? 'listening' : thinking ? 'thinking' : 'idle'} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">Kinjy Assistant</p>
          <p className="caption text-[0.62rem]">knows every feature · answers at your level</p>
        </div>
        <span className={cn('rounded-full border px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider', roleBadge[role])}>
          {s[role]}
        </span>
        <span className="hidden rounded-full border border-white/15 bg-white/5 px-2 py-0.5 text-[0.58rem] font-semibold text-text-mid sm:block">
          {LANG_META[chatLang].label}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close assistant"
          className="ms-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full cloud-glass text-text-mid transition-colors hover:text-text-hi"
        >
          <X size={15} />
        </button>
      </div>

      {/* Role demo selector + knowledge sync */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-4 py-2">
        <span className="text-[0.6rem] font-bold uppercase tracking-widest text-text-low">{s.roleLabel}:</span>
        <div className="flex rounded-full border border-white/10 bg-ink/50 p-0.5" role="group" aria-label="Demo role selector">
          {(['visitor', 'member', 'admin'] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              aria-pressed={role === r}
              className={cn(
                'rounded-full px-2.5 py-1 text-[0.62rem] font-bold transition-colors',
                role === r ? 'bg-gold/90 text-ink' : 'text-text-mid hover:text-text-hi',
              )}
            >
              {s[r]}
            </button>
          ))}
        </div>
        <span className="ms-auto">
          <SelfUpdate />
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-white/10 px-4 py-2" role="tablist" aria-label="Assistant sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'chat'}
          onClick={() => setTab('chat')}
          className={cn(
            'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[0.7rem] font-bold transition-colors',
            tab === 'chat' ? 'bg-white/10 text-text-hi' : 'text-text-mid hover:text-text-hi',
          )}
        >
          <Sparkles size={11} aria-hidden="true" /> Chat
        </button>
        {canSeeAdmin && (
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'watch'}
            onClick={() => setTab('watch')}
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[0.7rem] font-bold transition-colors',
              tab === 'watch' ? 'bg-gold/20 text-gold-soft' : 'text-text-mid hover:text-text-hi',
            )}
          >
            <Zap size={11} aria-hidden="true" /> {s.watchTab}
            <span className="rounded-full bg-gold px-1.5 py-0.5 text-[0.55rem] font-bold text-ink">{WATCH_ADVISORIES.length}</span>
          </button>
        )}
      </div>

      {/* Body */}
      {tab === 'watch' ? (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <AIWatch />
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3.5 overflow-y-auto px-4 py-4">
            {messages.map((m) => (
              <MessageBubble key={m.id} msg={m} />
            ))}
            {thinking && (
              <div className="flex items-center gap-2 text-[0.72rem] text-text-mid">
                <span className="flex gap-1" aria-hidden="true">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-gold-soft"
                      animate={{ opacity: [0.25, 1, 0.25] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
                    />
                  ))}
                </span>
                {s.typing}
              </div>
            )}

            {/* Module-aware suggestion chips */}
            {!thinking && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {suggestions.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => respond(e.title[chatLang], 'text')}
                    className="rounded-full border border-white/15 bg-white/[0.04] px-3 py-1.5 text-[0.66rem] font-semibold text-text-mid transition-colors hover:border-gold/40 hover:text-gold-soft"
                  >
                    {e.title[chatLang]}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-white/10 p-3">
            {listening && (
              <div className="mb-2 flex items-center gap-2.5 rounded-card-sm border border-gold/25 bg-gold/10 px-3 py-2">
                <Waveform />
                <span className="text-[0.68rem] font-semibold text-gold-soft">{s.listening}</span>
              </div>
            )}
            {!speechSupported && (
              <p className="caption mb-2 text-[0.62rem]">{s.voiceUnsupported}</p>
            )}
            <form
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                respond(input, 'text')
              }}
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={s.placeholder}
                aria-label={s.placeholder}
                className="min-w-0 flex-1 rounded-full border border-white/15 bg-ink/60 px-4 py-2.5 text-[0.82rem] text-text-hi placeholder:text-text-low focus:border-gold/50 focus:outline-none"
              />
              <button
                type="button"
                onClick={spoken ? () => { setSpoken(false); window.speechSynthesis?.cancel() } : () => setSpoken(true)}
                aria-pressed={spoken}
                aria-label={s.spokenReplies}
                title={s.spokenReplies}
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors',
                  spoken ? 'border-gold/50 bg-gold/15 text-gold-soft' : 'border-white/15 bg-white/[0.04] text-text-mid hover:text-text-hi',
                )}
              >
                {spoken ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </button>
              <button
                type="button"
                onClick={toggleListening}
                disabled={!speechSupported}
                aria-pressed={listening}
                aria-label={listening ? 'Stop voice input' : 'Start voice input'}
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-colors',
                  listening
                    ? 'border-gold/60 bg-gold/20 text-gold-soft'
                    : 'border-white/15 bg-white/[0.04] text-text-mid hover:text-text-hi',
                  !speechSupported && 'cursor-not-allowed opacity-35',
                )}
              >
                <Mic size={15} />
              </button>
              <button
                type="submit"
                aria-label={s.send}
                disabled={!input.trim() || thinking}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-soft to-gold text-ink transition hover:brightness-110 disabled:opacity-40"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  )
}
