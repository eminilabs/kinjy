import { useEffect } from 'react'
import { Link, useParams, useSearchParams } from 'react-router'
import { ArrowRight } from 'lucide-react'
import PostCard from '@/components/social/PostCard'
import { useApi } from '@/hooks/useApi'
import { useAuth } from '@/hooks/useAuth'
import { kaluta, type Post } from '@/lib/api'
import { rememberRef } from '@/lib/share'

/**
 * One post, on its own page, for somebody who may have no account.
 *
 * This is where a link shared outside Kinjy lands. It is the whole first
 * impression: if it demands a sign-in before showing anything, the share was
 * pointless, because nobody forwards a login wall.
 *
 * What a visitor may see is decided by the server, not here. A post that is
 * followers-only, in a circle or in a community answers 404 to someone who is
 * not in that audience, and the age gate runs on this route exactly as it does
 * in a feed — a direct link is the obvious way around a rating, so it is not
 * one. An unsigned visitor counts as UNKNOWN, which the policy engine treats
 * as a minor.
 */
export default function PostPage() {
  const { postId = '' } = useParams()
  const [params] = useSearchParams()
  const { user } = useAuth()
  const post = useApi<Post>(() => kaluta.posts.get(postId), [postId])

  // The invitation that came with the link, kept so it survives the visitor
  // reading another page or two before they decide to join.
  const ref = params.get('ref')
  useEffect(() => rememberRef(ref), [ref])

  const joinHref = ref ? `/join?mode=signup&ref=${encodeURIComponent(ref)}` : '/join?mode=signup'

  return (
    <section className="mx-auto w-full max-w-2xl px-6 py-12">
      {post.loading && <p className="caption">Loading…</p>}

      {post.error && (
        <div className="cloud-card p-6">
          <h1 className="h3">This post is not available</h1>
          <p className="mt-2 text-sm leading-relaxed text-text-mid">
            {/* The server says 404 for "does not exist", "not for you" and
                "not for your age" alike, on purpose — telling them apart would
                say which links are worth passing on. So the page cannot be
                more specific than this without guessing. */}
            It may have been deleted, or it may not be public. If somebody sent you this link, ask
            them to share it again.
          </p>
          <Link to="/" className="mt-5 inline-block text-sm font-semibold text-gold hover:underline">
            Go to Kinjy
          </Link>
        </div>
      )}

      {post.data && (
        <>
          <PostCard
            post={post.data}
            algorithmId="chronological"
            mode="new"
            isOwn={post.data.author_id === user?.id}
            currentUserId={user?.id ?? ''}
            onHidden={() => post.reload()}
            onChangeAlgorithm={() => {}}
          />

          {!user && (
            <div className="cloud-card mt-6 p-6">
              <h2 className="text-base font-semibold text-text-hi">
                This is one post on Kinjy
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-text-mid">
                Thirteen modules, one account: feeds, communities, messages, a family tree and
                memorials.
                {ref && ' You were invited by a member.'}
              </p>
              <Link
                to={joinHref}
                className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-gold-soft to-gold px-5 py-2.5 text-sm font-bold text-ink"
              >
                Create your account
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
              <p className="mt-3 text-xs text-text-low">
                Already a member?{' '}
                <Link to="/join?mode=signin" className="text-gold hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </>
      )}
    </section>
  )
}
