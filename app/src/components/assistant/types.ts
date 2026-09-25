/** Shared chat types for the Kinjy Assistant. */
import type { KBEntry, Lang } from './knowledgeBase'

export type MessageKind = 'answer' | 'fallback' | 'refusal' | 'welcome'

export interface ChatMessage {
  id: string
  author: 'user' | 'assistant'
  /** Input modality for user messages. */
  via?: 'text' | 'voice'
  /** Language the message was written in / answered in. */
  lang: Lang
  text: string
  kind?: MessageKind
  /** Grounding entry for answers (drives citations, tabs, images, video). */
  entry?: KBEntry
}

/** Global custom events the marketing page dispatches to drive the orb. */
export const ASSISTANT_OPEN_EVENT = 'kaluta:assistant-open'
export const ASSISTANT_OPEN_WATCH_EVENT = 'kaluta:assistant-open-watch'

export function openAssistant() {
  window.dispatchEvent(new CustomEvent(ASSISTANT_OPEN_EVENT))
}
export function openAssistantWatch() {
  window.dispatchEvent(new CustomEvent(ASSISTANT_OPEN_WATCH_EVENT))
}
