import { useState } from 'react'
import { Navigate, Link, useSearchParams } from 'react-router'
import { Check, Copy, LogOut, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import Earnings from '@/components/dashboard/Earnings'
import Security from '@/components/dashboard/Security'
import Verification from '@/components/dashboard/Verification'
import CloseAccount from '@/components/dashboard/CloseAccount'
import Experience from '@/components/dashboard/Experience'
import Privacy from '@/components/dashboard/Privacy'
import ProfileEditor from '@/components/dashboard/ProfileEditor'
import { Badge, Panel } from '@/components/dashboard/primitives'
import WalletStrip from '@/components/dashboard/WalletStrip'
import AppShell from '@/components/app/AppShell'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'earnings', label: 'Earnings' },
  { id: 'profile', label: 'Profile' },
  { id: 'verification', label: 'Verification' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'experience', label: 'Feed & experience' },
  { id: 'security', label: 'Security' },
  { id: 'account', label: 'Account' },
] as const

type TabId = (typeof TABS)[number]['id']

function InviteCard({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  const link = `${window.location.origin}/join?ref=${code}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard is blocked in some contexts; the link stays selectable below.
      setCopied(false)
    }
  }

  return (
    <Panel title="Invite" subtitle="You earn 20% of Kinjy's revenue on everything they do here.">
      <p className="caption">Your referral code</p>
      <p className="mono-data mt-1 text-2xl tracking-[0.2em] text-gold-soft">{code}</p>

      <div className="mt-4 flex gap-2">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-card-sm border border-white/10 bg-ink-2/70 px-3 py-2 text-xs text-text-mid focus:outline-none"
          aria-label="Your invitation link"
        />
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 px-3.5 py-2 text-xs font-semibold text-text-mid hover:border-gold/40 hover:text-gold-soft"
        >
          {copied ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>

      <p className="caption mt-3">
        One level, and it is yours for good: nobody above you earns on your members, and you are
        paid out of Kinjy's own margin rather than out of what anyone pays a seller.
      </p>
    </Panel>
  )
}

/** The member's own space: earnings, verification, devices, account lifecycle. */
export default function Dashboard() {
  const { user, loading, signOut } = useAuth()
  // Seeded from the URL so a link can point at one tab — the wellbeing notice
  // sends the member straight to the setting it is about.
  const [params] = useSearchParams()
  const requested = params.get('tab')
  const [tab, setTab] = useState<TabId>(
    TABS.some((t) => t.id === requested) ? (requested as TabId) : 'earnings',
  )

  if (loading) {
    return (
      <div className="flex min-h-[60svh] items-center justify-center" role="status" aria-label="Loading">
        <div className="h-12 w-12 rounded-full animate-orb-breathe" style={{ background: 'var(--grad-orb)' }} />
      </div>
    )
  }

  // Route guard: an unauthenticated visitor is sent to sign in, not shown an
  // empty dashboard that 401s panel by panel.
  if (!user) return <Navigate to="/join?mode=signin" replace />

  const isAdmin = user.role === 'admin' || user.role === 'superadmin'
  const ghost =
    'inline-flex items-center gap-2 rounded-full border border-[var(--cloud-border)] bg-[var(--cloud)] px-4 py-2 text-sm font-semibold text-text-mid transition-colors hover:border-gold/50 hover:text-text-hi'

  return (
    <AppShell rail={false}>
      {/* Header: who this space belongs to, and the two things you do from it */}
      <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="mono-data text-[0.7rem] uppercase tracking-[0.14em] text-gold-soft">Your space</p>
          <h1 className="mt-2 truncate text-[clamp(34px,5vw,60px)] font-bold leading-[1.02] tracking-[-0.04em] text-text-hi">
            {user.display_name}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="mono-data text-sm text-text-mid">@{user.handle}</span>
            <Badge tone={user.kyc_verified ? 'good' : 'neutral'}>
              {user.kyc_verified ? (
                <>
                  <ShieldCheck size={12} className="mr-1 inline" aria-hidden="true" />
                  Verified
                </>
              ) : (
                'Unverified'
              )}
            </Badge>
            {user.role !== 'member' && <Badge tone="warn">{user.role}</Badge>}
            {user.status !== 'active' && <Badge tone="bad">{user.status}</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link to="/admin" className={ghost}>
              Admin console
            </Link>
          )}
          <button type="button" onClick={() => void signOut()} className={ghost}>
            <LogOut size={14} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </header>

      <WalletStrip />

      <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-x-12 gap-y-6 lg:grid-cols-[210px_minmax(0,1fr)]">
        {/* Sections: a numbered list beside the content on desktop, a scrolling row on phones */}
        <nav aria-label="Dashboard sections" className="min-w-0 lg:sticky lg:top-[150px] lg:self-start">
          <ol className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
            {TABS.map((t, i) => {
              const on = tab === t.id
              return (
                <li key={t.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setTab(t.id)}
                    aria-current={on ? 'page' : undefined}
                    className={cn(
                      'group relative flex w-full items-baseline gap-3 whitespace-nowrap rounded-full px-4 py-2 text-start text-sm font-semibold transition-colors',
                      'lg:rounded-none lg:border-b lg:border-[var(--cloud-border)] lg:px-0 lg:py-3.5 lg:text-[15px]',
                      on
                        ? 'max-lg:bg-[linear-gradient(135deg,#f0c878,#d9a648)] max-lg:text-[#0B0E1D] lg:text-text-hi'
                        : 'bg-text-hi/[0.05] text-text-mid hover:text-text-hi lg:bg-transparent',
                    )}
                  >
                    <span className={cn('mono-data hidden text-[0.7rem] lg:inline', on ? 'text-gold-soft' : 'text-text-low')}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {t.label}
                    {on && (
                      <span aria-hidden="true" className="absolute -left-4 top-3 hidden h-[calc(100%-24px)] w-1 rounded-full bg-gradient-to-b from-gold-soft to-gold lg:block" />
                    )}
                  </button>
                </li>
              )
            })}
          </ol>
        </nav>

        <div className="min-w-0">
      <div>
        {tab === 'earnings' && (
          <div className="space-y-5">
            <Earnings />
            <InviteCard code={user.referral_code} />
          </div>
        )}
        {tab === 'profile' && <ProfileEditor />}
        {tab === 'verification' && <Verification />}
        {tab === 'privacy' && <Privacy />}
        {tab === 'experience' && <Experience />}
        {tab === 'security' && <Security />}
        {tab === 'account' && (
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel
              title="Account details"
              subtitle={
                <>
                  Your name and language are edited in{' '}
                  <button
                    type="button"
                    onClick={() => setTab('profile')}
                    className="font-semibold text-gold-soft underline-offset-2 hover:underline"
                  >
                    Profile
                  </button>
                  .
                </>
              }
            >
              <dl className="space-y-3 text-sm">
                {[
                  ['Display name', user.display_name],
                  ['Handle', `@${user.handle}`],
                  ['Email', user.email],
                  ['Language', user.lang],
                  ['Member id', user.id],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <dt className="caption">{label}</dt>
                    <dd className="truncate text-text-hi">{value}</dd>
                  </div>
                ))}
              </dl>
            </Panel>
            <CloseAccount />
          </div>
        )}
      </div>
        </div>
      </div>
    </AppShell>
  )
}
