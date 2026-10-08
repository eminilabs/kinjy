import PostCard from './PostCard'
import { DialogHeading, DialogSubheading, ResponsiveDialog } from './ResponsiveDialog'
import type { Post } from '@/lib/api'

/**
 * One post, opened: the post itself and its comments in a window over the feed.
 *
 * Opening a post used to mean leaving the feed, which costs the member their
 * scroll position and everything they had not read yet. A dialog keeps the
 * feed where it was.
 *
 * The card inside is the same PostCard as in the feed rather than a second
 * rendering of a post. Two of those would drift: media handling, the age
 * notice, reporting, reactions and the share and repost windows all live in the
 * card, and a "detail view" that reimplements them is a second place for each
 * to be wrong.
 */
export default function PostDialog({
  post,
  currentUserId,
  onClose,
  onHidden,
}: {
  post: Post
  currentUserId: string
  onClose: () => void
  onHidden: (postId: string) => void
}) {
  return (
    <ResponsiveDialog open onOpenChange={(open) => !open && onClose()} layout="scroll" width="2xl">
      <DialogHeading className="sr-only">Post and comments</DialogHeading>
      <DialogSubheading className="sr-only">A post, with its comments underneath.</DialogSubheading>
      <div className="p-3 sm:p-4">
        <PostCard
          post={post}
          algorithmId="chronological"
          mode="new"
          isOwn={post.author_id === currentUserId}
          currentUserId={currentUserId}
          onHidden={(id) => {
            onHidden(id)
            onClose()
          }}
          onChangeAlgorithm={() => {}}
          // Inside the dialog the comments are the point, so they are already
          // open and the card does not offer a second way to toggle them.
          commentsAlwaysOpen
        />
      </div>
    </ResponsiveDialog>
  )
}
