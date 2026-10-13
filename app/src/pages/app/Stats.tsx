import { Link } from 'react-router'
import { Eye, Heart, MessageSquare, Repeat2, ShieldCheck, UserPlus } from 'lucide-react'
import AppShell from '@/components/app/AppShell'
import { ActivityChart, EngagementChart, VerifiedRing } from '@/components/app/StatsCharts'
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
    <>
      <div className={cn('h-[184px] animate-pulse rounded-[20px]', tok.card)} />
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={cn('h-[104px] animate-pulse rounded-[20px]', tok.card)} />
        ))}
      </div>
    </>
  )
}

export default function Stats() {
  const { tok } = useAppTheme()
  const stats = useApi<MyStats>(() => kaluta.stats.me(), [])
  const referrals = useApi(() => kaluta.auth.referrals(), [])

  const s = stats.data
  const people: Referral[] = referrals.data?.items ?? []

  return (
    <AppShell title="Statistics" subtitle="Yours alone — nobody else sees these.">
      {stats.loading && !s && <Skeleton />}

      {stats.error && (
        <p role="alert" className="rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Could not load your statistics.
        </p>
      )}

      {s && (
        <>
          {/* The shape of the month first: a column of totals answers "how
              many", and the question people actually arrive with is "is this
              going anywhere". */}
          <ActivityChart daily={s.daily} />

          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Tile
              icon={MessageSquare}
              label="Posts"
              value={s.posts}
              hint={`${NUMBER.format(s.posts_last_30_days)} in the last 30 days`}
            />
            <Tile icon={Heart} label="Reactions" value={s.reactions_received} />
            <Tile icon={Eye} label="Views" value={s.views} />
            <Tile
              icon={MessageSquare}
              label="Comments you wrote"
              value={s.comments_written}
              hint="On other people's posts and your own"
            />
          </div>

          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <EngagementChart
              parts={[
                { label: 'Reactions', value: s.reactions_received, className: 'bg-gold' },
                { label: 'Comments', value: s.comments_received, className: 'bg-sky' },
                { label: 'Reposts', value: s.reposts_received, className: 'bg-emerald-400' },
              ]}
            />

            {s.top_posts.length > 0 && (
              <section aria-labelledby="top-heading" className={cn('rounded-[20px] p-4', tok.card)}>
                <h2 id="top-heading" className={cn('mb-3 text-[0.95rem] font-semibold', tok.text)}>
                  Posts that travelled furthest
                </h2>
                <ul className="space-y-1">
                  {s.top_posts.map((post) => (
                    <li key={post.id}>
                      {/* The post itself, not a dead row: a number you cannot
                          click through to is a number you cannot act on. */}
                      <Link
                        to={`/p/${post.id}`}
                        className="flex items-start gap-3 rounded-xl p-2 transition-colors hover:bg-text-hi/[0.05]"
                      >
                        <span className={cn('line-clamp-2 min-w-0 flex-1 text-[0.85rem]', tok.text)}>
                          {post.body || 'A post with no words'}
                        </span>
                        <span className={cn('flex shrink-0 items-center gap-2 text-[0.72rem]', tok.low)}>
                          <span className="inline-flex items-center gap-1">
                            <Heart size={11} aria-hidden="true" />
                            {NUMBER.format(post.likes)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare size={11} aria-hidden="true" />
                            {NUMBER.format(post.comments)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Repeat2 size={11} aria-hidden="true" />
                            {NUMBER.format(post.reposts)}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </>
      )}

      <section aria-labelledby="referrals-heading" className="mt-8">
        <h2 id="referrals-heading" className={cn('mb-1 text-[1.15rem] font-bold', tok.text)}>
          People you brought in
        </h2>
        <p className={cn('mb-3 text-[0.85rem]', tok.low)}>
          {/* One level, said plainly: the programme pays on these and on
              nobody below them, and a page that implied a tree would be
              promising something that does not exist. */}
          Direct invitations only — the programme pays on these.
        </p>

        {referrals.loading && !referrals.data && (
          <div className={cn('h-28 animate-pulse rounded-[20px]', tok.card)} />
        )}

        {referrals.data && (
          <>
            <div className="mb-3 grid gap-3 lg:grid-cols-2">
              <VerifiedRing total={referrals.data.total} verified={referrals.data.verified} />
              <Tile
                icon={UserPlus}
                label="Joined on your link"
                value={referrals.data.total}
                hint={
                  referrals.data.total === 0
                    ? 'Your invitation link is on your dashboard'
                    : 'Newest first below'
                }
              />
            </div>

            {people.length === 0 ? (
              <p className={cn('rounded-[20px] p-5 text-sm', tok.card, tok.low)}>
                Nobody yet. Your invitation link is on your dashboard — anyone who signs up with
                it appears here.
              </p>
            ) : (
              <ul className={cn('divide-y divide-[var(--cloud-border)] overflow-hidden rounded-[20px]', tok.card)}>
                {people.map((person) => (
                  <li key={person.user_id}>
                    <Link
                      to={`/u/${person.handle}`}
                      className="flex items-center gap-3 p-3 transition-colors hover:bg-text-hi/[0.04]"
                    >
                      <MemberAvatar
                        handle={person.handle}
                        displayName={person.display_name}
                        size={44}
                      />
                      <span className="min-w-0 flex-1">
                        <span className={cn('block truncate text-[0.95rem] font-semibold', tok.text)}>
                          {person.display_name}
                        </span>
                        <span className={cn('block truncate text-xs', tok.low)}>
                          Joined{' '}
                          {new Date(person.joined_at).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                      </span>
                      {person.kyc_verified ? (
                        <span
                          title="Identity verified"
                          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[0.7rem] font-semibold text-emerald-300"
                        >
                          <ShieldCheck size={12} aria-hidden="true" />
                          Verified
                        </span>
                      ) : (
                        // Said, not left blank: a row with nothing on the right
                        // reads as a loading state rather than as a fact.
                        <span className={cn('shrink-0 text-[0.7rem]', tok.low)}>Not verified yet</span>
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
