import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import ar from './locales/ar.json'
import en from './locales/en.json'
import fr from './locales/fr.json'
import sw from './locales/sw.json'
import zh from './locales/zh.json'

/**
 * The site's languages, and where their words live.
 *
 * The copy used to sit inline in this file, which was fine while it was
 * sixteen navigation labels and stopped being fine the moment the landing page
 * joined it. Each language is now its own JSON file: a translator can open one
 * and see only the thing they are translating, and `npm run i18n:check`
 * compares the key sets so a language cannot quietly fall behind.
 *
 * `dir` is carried here rather than inferred, because it is a property of the
 * language and the places that need it (the document element, the app shell)
 * should not each keep their own list of which languages are right-to-left.
 */
export const LANGUAGES = [
  { code: 'en', label: 'English', dir: 'ltr' as const },
  { code: 'fr', label: 'Français', dir: 'ltr' as const },
  { code: 'sw', label: 'Kiswahili', dir: 'ltr' as const },
  { code: 'ar', label: 'العربية', dir: 'rtl' as const },
  { code: 'zh', label: '中文', dir: 'ltr' as const },
]

export type LanguageCode = (typeof LANGUAGES)[number]['code']

const STORAGE_KEY = 'kinjy.lang'

/**
 * The language to open with: what they chose last, else English.
 *
 * The browser's preferred language is deliberately not consulted. The site is
 * English first, and a visitor whose browser asks for French used to get a
 * French header over English pages. Anybody who wants another language picks it
 * from the language menu, and that choice is remembered.
 */
function initialLanguage(): string {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && LANGUAGES.some((l) => l.code === saved)) return saved
  } catch {
    /* private window, blocked storage: fall back to English */
  }
  return 'en'
}

/**
 * Apply a language to the document itself.
 *
 * `lang` was hard-coded to "en" on a page rendering French, which tells a
 * screen reader to pronounce French with English phonetics and tells a
 * translation tool there is nothing to do. `dir` was never set at all, so
 * Arabic laid out left to right.
 */
export function applyDocumentLanguage(code: string): void {
  const lang = LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0]
  document.documentElement.lang = lang.code
  document.documentElement.dir = lang.dir
}

export function setLanguage(code: string): void {
  void i18n.changeLanguage(code)
  applyDocumentLanguage(code)
  try {
    localStorage.setItem(STORAGE_KEY, code)
  } catch {
    /* the choice still applies to this visit */
  }
}

const startingLanguage = initialLanguage()

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    sw: { translation: sw },
    ar: { translation: ar },
    zh: { translation: zh },
  },
  lng: startingLanguage,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

if (typeof document !== 'undefined') applyDocumentLanguage(startingLanguage)

export default i18n
