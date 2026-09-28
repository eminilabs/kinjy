/**
 * The choices and limits behind the profile editor.
 *
 * Country and language names are not stored here: `Intl.DisplayNames` gives
 * them in the member's own interface language, so a Swahili speaker reads
 * "Ufaransa" rather than "France" without a translation table to maintain.
 */

/**
 * ISO 3166-1 alpha-2, the same list user-service accepts
 * (`backend/common/countries.py`), Kosovo (XK) included.
 */
export const COUNTRY_CODES: readonly string[] = `
AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ
BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ
DE DJ DK DM DO DZ
EC EE EG EH ER ES ET
FI FJ FK FM FO FR
GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY
HK HM HN HR HT HU
ID IE IL IM IN IO IQ IR IS IT
JE JM JO JP
KE KG KH KI KM KN KP KR KW KY KZ
LA LB LC LI LK LR LS LT LU LV LY
MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ
NA NC NE NF NG NI NL NO NP NR NU NZ
OM
PA PE PF PG PH PK PL PM PN PR PS PT PW PY
QA
RE RO RS RU RW
SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ
TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ
UA UG UM US UY UZ
VA VC VE VG VI VN VU
WF WS
XK
YE YT
ZA ZM ZW
`
  .trim()
  .split(/\s+/)

/**
 * Languages offered as suggestions. The server accepts any ISO 639 code; this
 * is the short list worth one click, weighted towards the languages Kinjy's
 * members actually speak. A code outside it still shows and can be removed.
 */
export const SUGGESTED_LANGUAGES: readonly string[] = [
  'en', 'fr', 'sw', 'ar', 'zh', 'pt', 'es',
  'ln', 'kg', 'lu', 'rw', 'rn', 'lg', 'am', 'om', 'ti', 'so',
  'yo', 'ig', 'ha', 'ff', 'wo', 'ak', 'ee', 'bm',
  'zu', 'xh', 'af', 'st', 'tn', 'sn', 'ny', 'mg',
  'de', 'it', 'nl', 'ru', 'tr', 'hi', 'ur', 'bn', 'ja', 'ko',
]

/** Mirrors user-service (`profilefields.py`) so a mistake shows before saving. */
export const PROFILE_LIMITS = {
  displayName: { min: 2, max: 120 },
  bio: 2000,
  state: 80,
  city: 120,
  neighborhood: 120,
  languages: 8,
} as const

// One formatter per locale and kind: the language picker names ~40 languages
// on every render, and building a formatter is the expensive part.
const formatters = new Map<string, Intl.DisplayNames | null>()

function displayNames(locale: string, type: 'region' | 'language'): Intl.DisplayNames | null {
  const key = `${locale}:${type}`
  if (!formatters.has(key)) {
    let formatter: Intl.DisplayNames | null = null
    try {
      formatter = new Intl.DisplayNames([locale, 'en'], { type, fallback: 'code' })
    } catch {
      // Older engines, or a locale the runtime has no data for: codes still work.
    }
    formatters.set(key, formatter)
  }
  return formatters.get(key) ?? null
}

/** "CD" -> "Congo - Kinshasa" (in the given locale), or the code itself. */
export function countryName(code: string, locale: string): string {
  return displayNames(locale, 'region')?.of(code) ?? code
}

/** "ln" -> "Lingala" (in the given locale), or the code itself. */
export function languageName(code: string, locale: string): string {
  return displayNames(locale, 'language')?.of(code) ?? code
}

/** Every country, sorted by its name in the given locale. */
export function countryOptions(locale: string): { code: string; name: string }[] {
  const names = displayNames(locale, 'region')
  const collator = new Intl.Collator(locale)
  return COUNTRY_CODES.map((code) => ({ code, name: names?.of(code) ?? code })).sort((a, b) =>
    collator.compare(a.name, b.name),
  )
}

/** "fr,ln" -> ["fr", "ln"]. */
export function splitLanguages(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((code) => code.trim())
    .filter(Boolean)
}
