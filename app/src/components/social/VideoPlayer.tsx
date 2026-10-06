import { useCallback, useEffect, useRef, useState } from 'react'
import { Maximize2, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'

const pad = (n: number) => String(Math.floor(n)).padStart(2, '0')
const clock = (seconds: number) =>
  Number.isFinite(seconds) ? `${Math.floor(seconds / 60)}:${pad(seconds % 60)}` : '0:00'

/**
 * The video as it appears in a feed.
 *
 * The browser's own controls are not used. They are a different shape, colour
 * and size in every browser, they sit on top of the card's own rounding, and
 * on mobile Safari the control bar hijacks the tap that should open the video
 * full-size. So: our own bar, and `controls` off.
 *
 * Playback follows the viewport. A video starts when it is actually on screen
 * and stops when it is not, because a muted video playing to nobody three
 * screens up is somebody's battery and, on a phone plan, their money. The
 * member's own choice always outranks the viewport: once they have paused
 * something by hand, scrolling back to it does not start it again.
 */
export default function VideoPlayer({
  src,
  poster,
  autoplay = true,
  className,
  onExpand,
  startMuted = true,
  fill = false,
}: {
  src: string
  poster?: string | null
  /** The member's data/autoplay preference. False means it waits to be asked. */
  autoplay?: boolean
  className?: string
  /** Shown as a corner button when the video can be opened larger. */
  onExpand?: () => void
  startMuted?: boolean
  /** In the lightbox the video fills the space instead of being capped. */
  fill?: boolean
}) {
  const ref = useRef<HTMLVideoElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(startMuted)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  // Set the moment somebody presses pause themselves. From then on the
  // viewport may stop this video but never start it: a video that restarts
  // every time you scroll past is the behaviour people describe as "it keeps
  // playing on its own".
  const pausedByHand = useRef(false)

  const play = useCallback(() => {
    const video = ref.current
    if (!video) return
    // A rejected play() is normal — a browser refuses unmuted autoplay and
    // sometimes refuses it while the tab is in the background. Not an error to
    // report, just a video that stays paused.
    void video.play().catch(() => undefined)
  }, [])

  useEffect(() => {
    const video = ref.current
    const wrap = wrapRef.current
    if (!video || !wrap) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Half on screen counts as "being watched". A stricter threshold makes
        // a tall video on a short phone never qualify.
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (autoplay && !pausedByHand.current) play()
        } else {
          video.pause()
        }
      },
      { threshold: [0, 0.5, 1] },
    )
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [autoplay, play])

  useEffect(() => {
    const video = ref.current
    if (!video) return
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onTime = () => setProgress(video.currentTime)
    const onMeta = () => setDuration(video.duration)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('loadedmetadata', onMeta)
    return () => {
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('loadedmetadata', onMeta)
    }
  }, [])

  const toggle = () => {
    const video = ref.current
    if (!video) return
    if (video.paused) {
      pausedByHand.current = false
      play()
    } else {
      pausedByHand.current = true
      video.pause()
    }
  }

  const seek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const video = ref.current
    if (!video) return
    video.currentTime = Number(event.target.value)
    setProgress(video.currentTime)
  }

  return (
    <div ref={wrapRef} className={cn('group relative overflow-hidden bg-black', className)}>
      <video
        ref={ref}
        src={src}
        poster={poster ?? undefined}
        muted={muted}
        playsInline
        loop={false}
        preload={autoplay ? 'metadata' : 'none'}
        onClick={toggle}
        className={cn(
          'w-full cursor-pointer bg-black',
          fill ? 'max-h-[88svh] object-contain' : 'max-h-[460px] object-contain',
        )}
      />

      {/* A big target over the middle, for the tap that means play. Only while
          paused: during playback it would swallow a tap meant for the bar. */}
      {!playing && (
        <button
          type="button"
          onClick={toggle}
          aria-label="Play video"
          className="absolute inset-0 flex items-center justify-center bg-black/25"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/55 backdrop-blur-sm">
            <Play size={24} className="ms-0.5 text-white" aria-hidden="true" />
          </span>
        </button>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2.5 pt-8">
        <div className="pointer-events-auto flex items-center gap-2.5">
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? 'Pause' : 'Play'}
            className="text-white/90 hover:text-white"
          >
            {playing ? <Pause size={15} aria-hidden="true" /> : <Play size={15} aria-hidden="true" />}
          </button>

          <span className="w-9 shrink-0 text-[0.65rem] tabular-nums text-white/80">
            {clock(progress)}
          </span>

          <input
            type="range"
            min={0}
            max={duration || 0}
            value={progress}
            onChange={seek}
            aria-label="Seek"
            className="h-1 min-w-0 flex-1 cursor-pointer accent-gold"
          />

          <span className="w-9 shrink-0 text-end text-[0.65rem] tabular-nums text-white/80">
            {clock(duration)}
          </span>

          <button
            type="button"
            onClick={() => {
              const video = ref.current
              if (!video) return
              video.muted = !video.muted
              setMuted(video.muted)
            }}
            aria-label={muted ? 'Unmute' : 'Mute'}
            className="text-white/90 hover:text-white"
          >
            {muted ? <VolumeX size={15} aria-hidden="true" /> : <Volume2 size={15} aria-hidden="true" />}
          </button>

          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              aria-label="Open video full size"
              className="text-white/90 hover:text-white"
            >
              <Maximize2 size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
