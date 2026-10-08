import { useCallback, useMemo, useState, type ReactNode } from 'react'
import type { Post } from '@/lib/api'
import ReelViewer from './ReelViewer'
import { VideoReelContext } from './videoReel'

/**
 * Gives every card inside it a way to open the reel over this page's own list.
 *
 * The list is the posts the page is showing that have a video, in the order they
 * are shown, with a repost counted as the clip it carries (once). That is what
 * "the next video" means here: the next one down the page you were on.
 */
export default function VideoReelProvider({
  posts,
  currentUserId,
  autoplay = true,
  children,
}: {
  posts: Post[]
  currentUserId: string
  autoplay?: boolean
  children: ReactNode
}) {
  const [openId, setOpenId] = useState<string | null>(null)

  const clips = useMemo(() => {
    const seen = new Set<string>()
    const out: Post[] = []
    for (const post of posts) {
      const source = post.repost_of ?? post
      if (seen.has(source.id)) continue
      if (source.media.some((item) => item.kind === 'video' && item.url)) {
        seen.add(source.id)
        out.push(source)
      }
    }
    return out
  }, [posts])

  const open = useCallback(
    (postId: string) => {
      if (!clips.some((clip) => clip.id === postId)) return false
      setOpenId(postId)
      return true
    },
    [clips],
  )
  const value = useMemo(() => ({ open }), [open])

  return (
    <VideoReelContext.Provider value={value}>
      {children}
      {openId && (
        <ReelViewer
          // Keyed so a different starting clip is a fresh reel, not a scroll.
          key={openId}
          posts={clips}
          startId={openId}
          currentUserId={currentUserId}
          autoplay={autoplay}
          onClose={() => setOpenId(null)}
        />
      )}
    </VideoReelContext.Provider>
  )
}
