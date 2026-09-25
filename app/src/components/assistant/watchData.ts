/** AI Industry Watch advisory data (simulated frontier-watch inbox). */

export type WatchStatus = 'new' | 'queued' | 'executing' | 'pr-opened' | 'dismissed'

export interface WatchAdvisory {
  id: string
  title: string
  what: string
  whyAdopt: string
  whyCode: string
  branch: string
  diff: { file: string; add: number; del: number; note?: string }[]
  tests: string
}

export const WATCH_ADVISORIES: WatchAdvisory[] = [
  {
    id: 'voice-consent',
    title: 'Voice-cloning safeguards matured — voice-consent verification APIs',
    what: 'Consent-verified voice-cloning APIs have reached production maturity across major speech-model providers.',
    whyAdopt:
      'Voice-preserving dubbing is core to our translation engine; consent-verified cloning would strengthen trust and unlock Premium dubbing for licensed creators.',
    whyCode:
      'The translation pipeline requires a consent-verification step before voice model creation; this touches the dubbing service, consent ledger, and Premium entitlement checks.',
    branch: 'feat/voice-consent-gate',
    diff: [
      { file: 'dubbing/service.ts', add: 42, del: 6 },
      { file: 'consent/ledger.ts', add: 28, del: 0, note: 'new' },
      { file: 'entitlements/premium.ts', add: 12, del: 4 },
      { file: 'db/migrations/20251114_voice_consent.sql', add: 19, del: 0, note: 'migration' },
    ],
    tests: '41 sandbox tests passing · no voice data retained',
  },
  {
    id: 'ondevice-translation',
    title: 'New on-device translation models cut dubbing cost ~40%',
    what: 'A new generation of quantized on-device speech-translation models now matches cloud quality for our top 12 language pairs.',
    whyAdopt:
      'Routing eligible dubbing jobs on-device would cut Language Gateway inference cost by roughly 40% and keep user voice data off servers entirely — a direct privacy win for our translation promise.',
    whyCode:
      'The Language Gateway router needs an on-device capability tier: model bundling, per-language quality gating, cost/latency scoring updates, and fallbacks to cloud for long-tail languages.',
    branch: 'feat/ondevice-dub-router',
    diff: [
      { file: 'gateway/router.ts', add: 64, del: 11 },
      { file: 'gateway/scoring.ts', add: 23, del: 8 },
      { file: 'dubbing/device-cache.ts', add: 51, del: 0, note: 'new' },
      { file: 'i18n/pairs.json', add: 12, del: 0 },
    ],
    tests: '58 sandbox tests passing · cost model re-calibrated',
  },
  {
    id: 'passkey-sync',
    title: 'Passkey cross-device sync standard reaches stable',
    what: 'The FIDO passkey sync specification (cross-device credential portability) is now stable across the major platform authenticators.',
    whyAdopt:
      'Passkeys are our primary login; sync support removes the biggest account-recovery friction for members replacing devices, without introducing any central biometric store.',
    whyCode:
      'Security settings and the recovery flow need a synced-credential path: device registration UX, recovery copy, and login-alert heuristics for newly synced devices.',
    branch: 'feat/passkey-sync',
    diff: [
      { file: 'auth/passkeys.ts', add: 37, del: 9 },
      { file: 'settings/security.tsx', add: 45, del: 12 },
      { file: 'auth/login-alerts.ts', add: 16, del: 3 },
    ],
    tests: '33 sandbox tests passing · threat model reviewed',
  },
]
