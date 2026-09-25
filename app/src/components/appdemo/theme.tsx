import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

export type DisplayMode = 'cloud' | 'light' | 'dark' | 'system'
export type ResolvedMode = 'cloud' | 'light' | 'dark'
export type Ambient = 'twilight' | 'dawn' | 'savanna' | 'ocean'
export type AppLang = 'en' | 'sw' | 'fr' | 'ar' | 'zh'

export interface AppTheme {
  mode: DisplayMode
  resolved: ResolvedMode
  ambient: Ambient
  lang: AppLang
  rtl: boolean
  setMode: (m: DisplayMode) => void
  setAmbient: (a: Ambient) => void
  setLang: (l: AppLang) => void
  t: (key: ChromeKey) => string
  /** themed class fragments */
  tok: {
    text: string
    mid: string
    low: string
    card: string
    cardSolid: string
    divider: string
    hoverBg: string
    input: string
    subtleBg: string
  }
  frameStyle: React.CSSProperties
}

export const AMBIENTS: Record<Ambient, { label: string; style: React.CSSProperties; swatch: string }> = {
  twilight: {
    label: 'Twilight',
    style: { background: 'radial-gradient(ellipse at 75% 80%, rgba(217,166,72,0.06), transparent 100%), radial-gradient(ellipse at 30% 20%, #242142 0%, #0B0E1D 62%)' },
    swatch: 'linear-gradient(135deg, #242142, #0B0E1D)',
  },
  dawn: {
    label: 'Dawn',
    style: { background: 'linear-gradient(160deg, #1D2338 0%, #3A2E4E 100%)' },
    swatch: 'linear-gradient(135deg, #1D2338, #3A2E4E)',
  },
  savanna: {
    label: 'Savanna',
    style: { background: 'linear-gradient(160deg, #171208 0%, #3A2E14 100%)' },
    swatch: 'linear-gradient(135deg, #171208, #3A2E14)',
  },
  ocean: {
    label: 'Ocean',
    style: { background: 'linear-gradient(160deg, #08131F 0%, #12304A 100%)' },
    swatch: 'linear-gradient(135deg, #08131F, #12304A)',
  },
}

// The accepted values, in one place, so stored preferences can be validated
// against them instead of being trusted.
const DISPLAY_MODES = ['cloud', 'light', 'dark', 'system'] as const satisfies readonly DisplayMode[]
const AMBIENT_KEYS = ['twilight', 'dawn', 'savanna', 'ocean'] as const satisfies readonly Ambient[]
const APP_LANGS = ['en', 'sw', 'fr', 'ar', 'zh'] as const satisfies readonly AppLang[]

const TOKENS: Record<ResolvedMode, AppTheme['tok']> = {
  cloud: {
    text: 'text-text-hi',
    mid: 'text-text-mid',
    low: 'text-text-low',
    card: 'border border-[var(--cloud-border)] bg-[var(--cloud)] backdrop-blur-[18px] backdrop-saturate-[108%]',
    cardSolid: 'border border-white/10 bg-ink-2/95',
    divider: 'divide-white/10',
    hoverBg: 'hover:bg-white/10',
    input: 'border border-white/15 bg-white/5',
    subtleBg: 'bg-white/5',
  },
  light: {
    // The design tokens, not copies of them: these three drifted from the CSS
    // variables the rest of the app uses, so the demo and the real feed showed
    // different greys — and this one failed contrast on paper.
    text: 'text-text-hi',
    mid: 'text-text-mid',
    low: 'text-text-low',
    card: 'border border-black/10 bg-white/80 shadow-[0_12px_32px_-14px_rgba(36,31,22,0.3)]',
    cardSolid: 'border border-black/10 bg-paper',
    divider: 'divide-black/10',
    hoverBg: 'hover:bg-black/5',
    input: 'border border-black/15 bg-black/[0.04]',
    subtleBg: 'bg-black/[0.04]',
  },
  dark: {
    text: 'text-text-hi',
    mid: 'text-text-mid',
    low: 'text-text-low',
    card: 'border border-white/10 bg-ink-2',
    cardSolid: 'border border-white/10 bg-ink-3',
    divider: 'divide-white/10',
    hoverBg: 'hover:bg-white/5',
    input: 'border border-white/15 bg-ink-3',
    subtleBg: 'bg-ink-3',
  },
}

export const CHROME_STRINGS = {
  search: { en: 'Search people, forums, memorials, products…', sw: 'Tafuta watu, vikao, makaburi, bidhaa…', fr: 'Rechercher personnes, forums, mémoriaux, produits…', ar: 'ابحث عن أشخاص ومنتديات ونُصُب ومنتجات…', zh: '搜索用户、论坛、纪念园、商品…' },
  share: { en: 'Share with your world…', sw: 'Shiriki na ulimwengu wako…', fr: 'Partagez avec votre monde…', ar: 'شارك مع عالمك…', zh: '与你的全世界分享…' },
  pinned: { en: 'Pinned modules', sw: 'Moduli zilizobandikwa', fr: 'Modules épinglés', ar: 'الوحدات المثبتة', zh: '已固定模块' },
  trending: { en: 'Trending in Nairobi', sw: 'Vinavyovuma Nairobi', fr: 'Tendances à Nairobi', ar: 'الرائج في نيروبي', zh: '内罗毕热门' },
  suggested: { en: 'Suggested communities', sw: 'Jumuiya zinazopendekezwa', fr: 'Communautés suggérées', ar: 'مجتمعات مقترحة', zh: '推荐社区' },
  pool: { en: 'Kinjy Leaders', sw: 'Kinjy Leaders', fr: 'Kinjy Leaders', ar: 'Kinjy Leaders', zh: 'Kinjy Leaders' },
  whyTitle: { en: 'Why am I seeing this?', sw: 'Kwa nini naona hii?', fr: 'Pourquoi est-ce affiché ?', ar: 'لماذا أرى هذا؟', zh: '为什么显示此内容？' },
  home: { en: 'Home', sw: 'Nyumbani', fr: 'Accueil', ar: 'الرئيسية', zh: '首页' },
  following: { en: 'Following', sw: 'Unafuata', fr: 'Abonnements', ar: 'المتابَعون', zh: '关注' },
  forYou: { en: 'For You', sw: 'Kwako', fr: 'Pour vous', ar: 'لك', zh: '推荐' },
  public: { en: 'Public', sw: 'Hadharani', fr: 'Public', ar: 'عام', zh: '公开' },
  forums: { en: 'Forums', sw: 'Vikao', fr: 'Forums', ar: 'المنتديات', zh: '论坛' },
  circles: { en: 'Circles', sw: 'Duara', fr: 'Cercles', ar: 'الدوائر', zh: '圈子' },
  communities: { en: 'Communities', sw: 'Jumuiya', fr: 'Communautés', ar: 'المجتمعات', zh: '社区' },
  messages: { en: 'Messages', sw: 'Ujumbe', fr: 'Messages', ar: 'الرسائل', zh: '消息' },
  live: { en: 'Live', sw: 'Moja kwa Moja', fr: 'En direct', ar: 'مباشر', zh: '直播' },
  familyTree: { en: 'Family Tree', sw: 'Mti wa Familia', fr: 'Arbre familial', ar: 'شجرة العائلة', zh: '家谱' },
  graveyard: { en: 'Graveyard', sw: 'Makaburi', fr: 'Cimetière', ar: 'المقبرة', zh: '墓园' },
  explore: { en: 'Explore', sw: 'Gundua', fr: 'Explorer', ar: 'استكشاف', zh: '探索' },
  marketplace: { en: 'Marketplace', sw: 'Soko', fr: 'Marché', ar: 'السوق', zh: '市场' },
  create: { en: 'Create', sw: 'Tengeneza', fr: 'Créer', ar: 'إنشاء', zh: '创作' },
  earnings: { en: 'Earnings', sw: 'Mapato', fr: 'Revenus', ar: 'الأرباح', zh: '收益' },
  profile: { en: 'Profile', sw: 'Wasifu', fr: 'Profil', ar: 'الملف', zh: '我的' },
} as const

export type ChromeKey = keyof typeof CHROME_STRINGS

/** The 15 universal navigation modules, in blueprint order. */
export const NAV_MODULES: ChromeKey[] = [
  'home', 'following', 'forYou', 'public', 'forums', 'circles', 'communities',
  'messages', 'live', 'familyTree', 'graveyard', 'explore', 'marketplace', 'create', 'earnings',
]

const AppThemeContext = createContext<AppTheme | null>(null)

export function useAppTheme(): AppTheme {
  const ctx = useContext(AppThemeContext)
  if (!ctx) throw new Error('useAppTheme must be used inside AppThemeProvider')
  return ctx
}

function useSystemDark(): boolean {
  const [dark, setDark] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)').matches : true,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const on = (e: MediaQueryListEvent) => setDark(e.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return dark
}

/** Remember the member's display choices between visits.
 *
 * `persist` is opt-in so the marketing demo at /app can keep its own throwaway
 * state without overwriting what the member chose in the real app.
 */
function useStored<T extends string>(
  key: string,
  fallback: T,
  persist: boolean,
  allowed: readonly T[],
): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (!persist || typeof window === 'undefined') return fallback
    const stored = localStorage.getItem(key) as T | null
    // Checked against the allowed set rather than trusted. A stale or corrupt
    // value used to index straight into the token table and return undefined,
    // which threw on the first `tok.*` read and white-screened the whole app —
    // a broken localStorage entry should cost you your preference, not the page.
    return stored && allowed.includes(stored) ? stored : fallback
  })
  const set = (next: T) => {
    setValue(next)
    if (persist) localStorage.setItem(key, next)
  }
  return [value, set]
}

export function AppThemeProvider({
  children,
  persist = false,
}: {
  children: ReactNode
  persist?: boolean
}) {
  const [mode, setMode] = useStored<DisplayMode>('kaluta.display_mode', 'cloud', persist, DISPLAY_MODES)
  const [ambient, setAmbient] = useStored<Ambient>('kaluta.ambient', 'twilight', persist, AMBIENT_KEYS)
  const [lang, setLang] = useStored<AppLang>('kaluta.app_lang', 'en', persist, APP_LANGS)
  const systemDark = useSystemDark()

  const resolved: ResolvedMode = mode === 'system' ? (systemDark ? 'dark' : 'light') : mode
  const rtl = lang === 'ar'

  // Publish the resolved mode to the document so CSS can answer for itself.
  // The `tok` map below only reaches components that ask for it; everything
  // written against the design tokens — which is most of the real app — was
  // left on the dark palette, so light mode rendered near-white text on paper.
  useEffect(() => {
    document.documentElement.dataset.theme = resolved
    return () => {
      delete document.documentElement.dataset.theme
    }
  }, [resolved])

  const value = useMemo<AppTheme>(() => {
    const frameStyle: React.CSSProperties =
      resolved === 'cloud'
        ? AMBIENTS[ambient].style
        : resolved === 'light'
          ? { background: 'linear-gradient(160deg, #F6F1E7 0%, #EDE4D3 100%)' }
          : { background: '#0B0E1D' }
    return {
      mode,
      resolved,
      ambient,
      lang,
      rtl,
      setMode,
      setAmbient,
      setLang,
      t: (key) => CHROME_STRINGS[key][lang],
      tok: TOKENS[resolved],
      frameStyle,
    }
  }, [mode, resolved, ambient, lang, rtl])

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>
}

/** Avatar crops from avatars-set.jpg (4 cols × 3 rows grid). */
export function avatarStyle(index: number, size = 400): React.CSSProperties {
  const col = index % 4
  const row = Math.floor(index / 4) % 3
  return {
    backgroundImage: 'url(/avatars-set.jpg)',
    backgroundSize: `${size}% auto`,
    backgroundPosition: `${(col / 3) * 100}% ${(row / 2) * 100}%`,
  }
}
