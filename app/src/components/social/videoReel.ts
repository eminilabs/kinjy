import { createContext, useContext } from 'react'

/**
 * Opens the reel on a video: a full-screen, scroll-for-the-next-one viewer over
 * whatever list the page is showing. Pages that have such a list provide it;
 * a card with no provider around it falls back to the plain lightbox.
 */
export const VideoReelContext = createContext<{ open: (postId: string) => boolean } | null>(null)

export function useVideoReel() {
  return useContext(VideoReelContext)
}
