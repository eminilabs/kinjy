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
import { Badge, Panel } from '@/components/dashboard/primitives'
import AppShell from '@/components/app/AppShell'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'earnings', label: 'Earnings' },
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
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/12 px-3.5 py-2 text-xs font-semibold text-text-mid transition-colors hover:border-gold/40 hover:text-gold-soft"
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

  return (
    <AppShell
      title={user.display_name}
      subtitle="Your earnings, verification, devices and account lifecycle."
      action={
        <div className="flex items-center gap-2">
          {(user.role === 'admin' || user.role === 'superadmin') && (
            <Link
              to="/admin"
              className="rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-text-mid transition-colors hover:border-gold/40 hover:text-gold-soft"
            >
              Admin console
            </Link>
          )}
          <button
            type="button"
            onClick={() => void signOut()}
            className="inline-flex items-center gap-2 rounded-full border border-white/12 px-4 py-2 text-sm font-semibold text-text-mid transition-colors hover:border-gold/40 hover:text-gold-soft"
          >
            <LogOut size={14} aria-hidden="true" />
            Sign out
          </button>
        </div>
      }
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
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

      <nav className="flex flex-wrap gap-1 border-b border-white/8" aria-label="Dashboard sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
            className={cn(
              'relative px-4 py-3 text-sm font-medium transition-colors',
              tab === t.id ? 'text-gold-soft' : 'text-text-mid hover:text-text-hi',
            )}
          >
            {t.label}
            {tab === t.id && (
              <span
                aria-hidden="true"
                className="absolute inset-x-3 -bottom-px h-0.5 rounded-full"
                style={{ background: 'var(--grad-arc)' }}
              />
            )}
          </button>
        ))}
      </nav>

      <div className="mt-6">
        {tab === 'earnings' && (
          <div className="space-y-5">
            <Earnings />
            <InviteCard code={user.referral_code} />
          </div>
        )}
        {tab === 'verification' && <Verification />}
        {tab === 'privacy' && <Privacy />}
        {tab === 'experience' && <Experience />}
        {tab === 'security' && <Security />}
        {tab === 'account' && (
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Profile" subtitle="How the rest of Kinjy sees you.">
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
    </AppShell>
  )
}
