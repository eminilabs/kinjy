const ITEMS = [
  '15 unified modules',
  '190+ languages',
  '10 feed modes',
  '15 user-owned algorithms',
  'E2E encrypted messenger',
  'Passkey security',
  'Creator 40% ad share',
  'Immutable ledger',
  'GDPR-compliant deletion',
]

function ArcGlyph() {
  return (
    <svg width="18" height="10" viewBox="0 0 18 10" aria-hidden="true" className="shrink-0">
      <path d="M1 9 Q 9 -4 17 9" fill="none" stroke="#D9A648" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

/** Section 2 — Trust ticker: seamless 28s marquee, pause on hover. */
export default function TrustTicker() {
  const row = (
    <>
      {ITEMS.map((item) => (
        <span key={item} className="flex items-center gap-6">
          <span className="mono-data whitespace-nowrap text-text-mid">{item}</span>
          <ArcGlyph />
        </span>
      ))}
    </>
  )
  return (
    <section aria-label="Platform guarantees" className="border-y border-[rgba(255,255,255,0.14)] bg-ink-2/40">
      <div className="group flex h-[72px] items-center overflow-hidden">
        <div className="flex shrink-0 items-center gap-6 pe-6 animate-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none motion-reduce:flex-wrap">
          {row}
          {row}
        </div>
      </div>
    </section>
  )
}
