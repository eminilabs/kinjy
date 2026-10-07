import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, Pause, Play } from 'lucide-react'
import MemberAvatar from './MemberAvatar'
import { cn } from '@/lib/utils'

export interface VoiceNotePlayerProps {
  src: string
  senderAvatarUrl?: string | null
  senderDisplayName?: string | null
  senderHandle?: string | null
  /** Sent by the viewer: the bubble is gold, so the player is drawn in ink. */
  mine?: boolean
  /** Time and delivery ticks, drawn on the same line as the duration. */
  metaSlot?: React.ReactNode
  className?: string
}

interface AudioAnalysis {
  peaks: number[]
  duration: number
}

const BAR_COUNT = 36
const MIN_BAR = 0.18
const PLAY_EVENT = 'kinjy:voicenote:play'
const SEEK_STEP_SECONDS = 5
// Reading the real peaks means downloading and decoding the whole note. A long
// one is not worth that on a phone: it keeps the placeholder bars.
const MAX_ANALYSED_BYTES = 4 * 1024 * 1024

/**
 * The colours the player takes from the bubble it sits in.
 *
 * My bubble is the same warm gold in every theme, so what sits on it is a fixed
 * dark ink (#0b0e1d). The `ink` token cannot be used there: in the light theme
 * it turns white, which on gold is nearly invisible.
 */
const TONES = {
  mine: {
    button: 'text-[#0b0e1d] hover:bg-[#0b0e1d]/10',
    played: 'bg-[#0b0e1d]',
    rest: 'bg-[#0b0e1d]/25',
    thumb: 'bg-[#0b0e1d] ring-white/60',
    badge: 'bg-[#0b0e1d] text-gold-soft ring-gold',
    time: 'text-[#0b0e1d]/70',
  },
  theirs: {
    button: 'text-text-hi hover:bg-text-hi/10',
    played: 'bg-gold',
    rest: 'bg-text-low/30',
    thumb: 'bg-gold ring-white/70',
    badge: 'bg-gold text-[#0b0e1d] ring-white/70',
    time: 'text-text-low',
  },
} as const

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/** Plausible bars for a note whose peaks are not read (yet): the same note always gets the same bars. */
function fallbackBars(seed: string, count: number): number[] {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (Math.imul(31, hash) + seed.charCodeAt(i)) | 0
  }
  const bars: number[] = []
  for (let i = 0; i < count; i++) {
    hash = (Math.imul(1103515245, hash) + 12345) | 0
    const noise = Math.abs((hash % 100) / 100)
    const curve = Math.sin((i / (count - 1)) * Math.PI)
    const amplitude = 0.2 + 0.75 * (curve * 0.45 + noise * 0.55)
    bars.push(Math.min(1, Math.max(MIN_BAR, amplitude)))
  }
  return bars
}

async function analyseAudio(url: string, count: number, signal: AbortSignal): Promise<AudioAnalysis | null> {
  try {
    const response = await fetch(url, { signal })
    const buffer = await response.arrayBuffer()
    if (buffer.byteLength > MAX_ANALYSED_BYTES) return null
    const AudioCtx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return null
    const context = new AudioCtx()
    try {
      const decoded = await context.decodeAudioData(buffer)
      const samples = decoded.getChannelData(0)
      const step = Math.floor(samples.length / count)
      if (step < 4) return null
      const peaks: number[] = []
      for (let i = 0; i < count; i++) {
        let sum = 0
        for (let j = i * step; j < (i + 1) * step; j += 4) sum += Math.abs(samples[j] || 0)
        peaks.push(Math.min(1, Math.max(MIN_BAR, (sum / (step / 4)) * 4.5)))
      }
      return { peaks, duration: Number.isFinite(decoded.duration) ? decoded.duration : 0 }
    } finally {
      await context.close()
    }
  } catch {
    return null
  }
}

export default function VoiceNotePlayer({
  src,
  senderAvatarUrl,
  senderDisplayName,
  senderHandle,
  mine = false,
  metaSlot,
  className,
}: VoiceNotePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const trackRef = useRef<HTMLDivElement | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [peaks, setPeaks] = useState<number[]>(() => fallbackBars(src, BAR_COUNT))

  const tone = mine ? TONES.mine : TONES.theirs

  // The real shape and length of the note, when the browser can read it.
  useEffect(() => {
    const controller = new AbortController()
    void analyseAudio(src, BAR_COUNT, controller.signal).then((analysis) => {
      if (!analysis || controller.signal.aborted) return
      setPeaks(analysis.peaks)
      if (analysis.duration > 0) setDuration((known) => (known > 0 ? known : analysis.duration))
    })
    return () => controller.abort()
  }, [src])

  // Two notes never play over each other.
  useEffect(() => {
    const pauseForOther = (event: Event) => {
      const other = (event as CustomEvent<{ src: string }>).detail?.src
      if (other !== src && audioRef.current && !audioRef.current.paused) audioRef.current.pause()
    }
    window.addEventListener(PLAY_EVENT, pauseForOther)
    return () => window.removeEventListener(PLAY_EVENT, pauseForOther)
  }, [src])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlaying) {
      audio.pause()
      return
    }
    window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: { src } }))
    audio.play().catch(() => setIsPlaying(false))
  }, [isPlaying, src])

  const syncDuration = useCallback(() => {
    const length = audioRef.current?.duration
    if (length && Number.isFinite(length) && length > 0) setDuration(length)
  }, [])

  const seekTo = useCallback(
    (seconds: number) => {
      const target = Math.max(0, Math.min(duration, seconds))
      setCurrentTime(target)
      if (audioRef.current) audioRef.current.currentTime = target
    },
    [duration],
  )

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track || !duration) return
      const rect = track.getBoundingClientRect()
      seekTo(Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * duration)
    },
    [duration, seekTo],
  )

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsScrubbing(true)
    seekFromClientX(event.clientX)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isScrubbing) seekFromClientX(event.clientX)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return
    setIsScrubbing(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!direction) return
    event.preventDefault()
    seekTo(currentTime + direction * SEEK_STEP_SECONDS)
  }

  const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0
  const playedBars = Math.floor(progress * peaks.length)
  const displayedTime = formatAudioTime(isPlaying || currentTime > 0 ? currentTime : duration)

  return (
    <div
      className={cn(
        'flex w-full min-w-[210px] max-w-[320px] select-none items-center gap-2.5 py-0.5 sm:min-w-[250px]',
        className,
      )}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={() => audioRef.current && !isScrubbing && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={syncDuration}
        onDurationChange={syncDuration}
        onEnded={() => {
          setIsPlaying(false)
          setCurrentTime(0)
        }}
      />

      <div className="relative shrink-0">
        <MemberAvatar
          handle={senderHandle}
          displayName={senderDisplayName}
          avatarUrl={senderAvatarUrl}
          size={42}
          className="shadow-sm"
        />
        <span
          className={cn(
            'absolute -bottom-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full shadow-sm ring-2',
            tone.badge,
          )}
          role="img"
          aria-label="Voice note"
        >
          <Mic size={10} strokeWidth={2.5} aria-hidden="true" />
        </span>
      </div>

      <button
        type="button"
        onClick={togglePlay}
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95',
          tone.button,
        )}
        aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
      >
        {isPlaying ? (
          <Pause size={20} className="fill-current" aria-hidden="true" />
        ) : (
          <Play size={20} className="translate-x-0.5 fill-current rtl:-translate-x-0.5 rtl:rotate-180" aria-hidden="true" />
        )}
      </button>

      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          dir="ltr"
          className="relative flex h-6 w-full cursor-pointer touch-none items-center py-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          role="slider"
          aria-label="Voice note position"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          aria-valuetext={`${formatAudioTime(currentTime)} of ${formatAudioTime(duration)}`}
        >
          <div className="flex h-5 w-full items-center justify-between gap-[2px]">
            {peaks.map((amplitude, index) => (
              <div
                key={index}
                className={cn('w-[3px] rounded-full transition-colors', index <= playedBars && progress > 0 ? tone.played : tone.rest)}
                style={{ height: `${Math.round(amplitude * 20)}px`, minHeight: '4px' }}
              />
            ))}
          </div>

          <div
            className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2 motion-safe:transition-transform motion-safe:duration-75"
            style={{ left: `${progress * 100}%` }}
          >
            <div className={cn('h-3.5 w-3.5 rounded-full shadow ring-2', tone.thumb)} />
          </div>
        </div>

        <div className={cn('flex items-center justify-between px-0.5 text-[0.68rem] font-medium tabular-nums', tone.time)}>
          <span>{displayedTime}</span>
          {metaSlot && <div className="flex items-center gap-1">{metaSlot}</div>}
        </div>
      </div>
    </div>
  )
}
