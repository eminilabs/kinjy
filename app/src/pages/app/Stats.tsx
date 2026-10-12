import { Link } from 'react-router'
import {
  BarChart3,
  Eye,
  Heart,
  MessageSquare,
  Repeat2,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import MemberAvatar from '@/components/social/MemberAvatar'
import { useAppTheme } from '@/components/appdemo/theme'
import { useApi } from '@/hooks/useApi'
import { kaluta, type MyStats, type Referral } from '@/lib/api'
import { cn } from '@/lib/utils'

/**
 * What your writing did, and who came in on your invitation.
 *
 * Both numbers existed and neither was anywhere a member could see: a post
 * carried its counters one card at a time, and a referral link could be
 * copied without ever learning whether anybody used it.
 *
 * Only your own, enforced by the server rather than by this page. A
 * leaderboard of who gets read is not something this platform hands out.
 */

const NUMBER = new Intl.NumberFormat()

function Tile({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Heart
  label: string
  value: number
  hint?: string
}) {
  const { tok } = useAppTheme()
  return (
    <div className={cn('rounded-[20px] p-4', tok.card)}>
      <span className={cn('flex items-center gap-2 text-[0.78rem]', tok.low)}>
        <Icon size={14} aria-hidden="true" />
        {label}
      </span>
      <p className={cn('mt-1.5 text-[1.7rem] font-bold leading-none tracking-[-0.03em]', tok.text)}>
        {NUMBER.format(value)}
      </p>
      {hint && <p className={cn('mt-1 text-[0.72rem]', tok.low)}>{hint}</p>}
    </div>
  )
}

function Skeleton() {
  const { tok } = useAppTheme()
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className={cn('h-[104px] animate-pulse rounded-[20px]', tok.card)} />
      ))}
    </div>
  )
}

export default function Stats() {
  const { tok } = useAppTheme()
  const stats = useApi<MyStats>(() => kaluta.stats.me(), [])
  const referrals = useApi(() => kaluta.auth.referrals(), [])

  const s = stats.data
  const people: Referral[] = referrals.data?.items ?? []

  return (
    <AppShell title="Your numbers" subtitle="Nobody else sees these.">
      {stats.loading && !s && <Skeleton />}

      {stats.error && (
        <p role="alert" className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Could not load your statistics.
        </p>
      )}

      {s && (
        <section aria-labelledby="reach-heading">
          <h2 id="reach-heading" className="sr-only">
            Reach
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Tile
              icon={BarChart3}
              label="Posts"
              value={s.posts}
              hint={`${NUMBER.format(s.posts_last_30_days)} in the last 30 days`}
            />
            <Tile icon={Heart} label="Reactions received" value={s.reactions_received} />
            <Tile icon={MessageSquare} label="Comments received" value={s.comments_received} />
            <Tile icon={Repeat2} label="Reposts" value={s.reposts_received} />
            <Tile icon={Eye} label="Views" value={s.views} />
            <Tile
              icon={MessageSquare}
              label="Comments you wrote"
              value={s.comments_written}
              hint="On other people's posts and your own"
            />
          </div>
        </section>
      )}

      {s && s.top_posts.length > 0 && (
        <section aria-labelledby="top-heading" className="mt-6">
          <h2 id="top-heading" className={cn('mb-3 text-[1.05rem] font-bold', tok.text)}>
            Your posts that travelled furthest
          </h2>
          <ul className="space-y-2">
            {s.top_posts.map((post) => (
              <li key={post.id}>
                {/* The post itself, not a dead row: a number you cannot click
                    through to is a number you cannot act on. */}
                <Link
                  to={`/p/${post.id}`}
                  className={cn('block rounded-[18px] p-4 transition-colors hover:brightness-105', tok.card)}
                >
                  <p className={cn('line-clamp-2 text-[0.95rem]', tok.text)}>
                    {post.body || 'A post with no words'}
                  </p>
                  <p className={cn('mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs', tok.low)}>
                    <span className="inline-flex items-center gap-1">
                      <Heart size={12} aria-hidden="true" />
                      {NUMBER.format(post.likes)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare size={12} aria-hidden="true" />
                      {NUMBER.format(post.comments)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Repeat2 size={12} aria-hidden="true" />
                      {NUMBER.format(post.reposts)}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Eye size={12} aria-hidden="true" />
                      {NUMBER.format(post.views)}
                    </span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="referrals-heading" className="mt-8">
        <h2 id="referrals-heading" className={cn('mb-1 text-[1.05rem] font-bold', tok.text)}>
          People you brought in
        </h2>
        <p className={cn('mb-3 text-[0.85rem]', tok.low)}>
          {/* One level, said plainly: the programme pays on these and on
              nobody below them, and a page that implies a tree would be
              promising something that does not exist. */}
          Direct invitations only — the programme pays on these.
        </p>

        {referrals.loading && !referrals.data && (
          <div className={cn('h-20 animate-pulse rounded-[20px]', tok.card)} />
        )}

        {referrals.data && (
          <>
            <div className="mb-3 grid gap-3 sm:grid-cols-2">
              <Tile icon={UserPlus} label="Joined on your link" value={referrals.data.total} />
              <Tile
                icon={ShieldCheck}
                label="Identity verified"
                value={referrals.data.verified}
                hint="Verification is what unlocks payouts"
              />
            </div>

            {people.length === 0 ? (
              <p className={cn('rounded-[18px] p-4 text-sm', tok.card, tok.low)}>
                Nobody yet. Your invitation link is on your dashboard.
              </p>
            ) : (
              <ul className={cn('divide-y divide-[var(--cloud-border)] rounded-[20px]', tok.card)}>
                {people.map((person) => (
                  <li key={person.user_id}>
                    <Link
                      to={`/u/${person.handle}`}
                      className="flex items-center gap-3 p-3 transition-colors hover:brightness-105"
                    >
                      <MemberAvatar handle={person.handle} displayName={person.display_name} size={40} />
                      <span className="min-w-0 flex-1">
                        <span className={cn('block truncate text-sm font-semibold', tok.text)}>
                          {person.display_name}
                        </span>
                        <span className={cn('block truncate text-xs', tok.low)}>
                          Joined {new Date(person.joined_at).toLocaleDateString()}
                        </span>
                      </span>
                      {person.kyc_verified && (
                        <span
                          title="Identity verified"
                          className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[0.7rem] font-semibold text-emerald-300"
                        >
                          <ShieldCheck size={11} aria-hidden="true" />
                          Verified
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>
    </AppShell>
  )
}
