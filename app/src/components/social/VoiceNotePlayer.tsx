import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { Mic, Play, Pause } from 'lucide-react'
import MemberAvatar from './MemberAvatar'
import { cn } from '@/lib/utils'

export interface VoiceNotePlayerProps {
  src: string
  senderAvatarUrl?: string | null
  senderDisplayName?: string | null
  senderHandle?: string | null
  mine?: boolean
  metaSlot?: React.ReactNode
  className?: string
}

interface AudioAnalysis {
  peaks: number[]
  duration: number
}

const BAR_COUNT = 36
const PLAY_EVENT = 'kinjy:voicenote:play'

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function generateFallbackBars(seed: string, count: number): number[] {
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
    bars.push(Math.min(1, Math.max(0.18, amplitude)))
  }
  return bars
}

async function extractAudioData(url: string, count: number): Promise<AudioAnalysis | null> {
  try {
    const res = await fetch(url)
    const buffer = await res.arrayBuffer()
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioCtx) return null
    const ctx = new AudioCtx()
    const decoded = await ctx.decodeAudioData(buffer)
    const data = decoded.getChannelData(0)
    const duration = Number.isFinite(decoded.duration) ? decoded.duration : 0
    const step = Math.floor(data.length / count)
    const peaks: number[] = []

    for (let i = 0; i < count; i++) {
      let sum = 0
      const start = i * step
      const end = start + step
      for (let j = start; j < end; j += 4) {
        sum += Math.abs(data[j] || 0)
      }
      const avg = sum / (step / 4)
      peaks.push(Math.min(1, Math.max(0.18, avg * 4.5)))
    }
    await ctx.close()
    return { peaks, duration }
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
  const [peaks, setPeaks] = useState<number[]>(() => generateFallbackBars(src, BAR_COUNT))

  const initialBars = useMemo(() => generateFallbackBars(src, BAR_COUNT), [src])

  // Extract accurate peaks and real duration via Web Audio
  useEffect(() => {
    let active = true
    extractAudioData(src, BAR_COUNT).then((data) => {
      if (active && data) {
        if (data.peaks.length) setPeaks(data.peaks)
        if (data.duration > 0) setDuration((prev) => (prev > 0 ? prev : data.duration))
      }
    })
    return () => {
      active = false
    }
  }, [src])

  // Pause when another voice note starts playing
  useEffect(() => {
    const handleOtherPlay = (e: Event) => {
      const custom = e as CustomEvent<{ src: string }>
      if (custom.detail?.src !== src && audioRef.current && !audioRef.current.paused) {
        audioRef.current.pause()
      }
    }
    window.addEventListener(PLAY_EVENT, handleOtherPlay)
    return () => window.removeEventListener(PLAY_EVENT, handleOtherPlay)
  }, [src])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: { src } }))
      audio.play().catch(() => {
        setIsPlaying(false)
      })
    }
  }, [isPlaying, src])

  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current || isScrubbing) return
    setCurrentTime(audioRef.current.currentTime)
  }, [isScrubbing])

  const handleLoadedMetadata = useCallback(() => {
    if (!audioRef.current) return
    const dur = audioRef.current.duration
    if (Number.isFinite(dur) && dur > 0) {
      setDuration(dur)
    }
  }, [])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(0)
  }, [])

  const seekFromClientX = useCallback(
    (clientX: number) => {
      const track = trackRef.current
      if (!track || !duration) return

      const rect = track.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const targetTime = ratio * duration
      setCurrentTime(targetTime)
      if (audioRef.current) {
        audioRef.current.currentTime = targetTime
      }
    },
    [duration],
  )

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setIsScrubbing(true)
    seekFromClientX(e.clientX)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return
    seekFromClientX(e.clientX)
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isScrubbing) return
    setIsScrubbing(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // Ignored
    }
  }

  const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0
  const activeBars = peaks.length ? peaks : initialBars
  const currentBarIndex = Math.floor(progress * activeBars.length)

  const displayedTime = isPlaying || currentTime > 0
    ? formatAudioTime(currentTime)
    : formatAudioTime(duration)

  return (
    <div
      className={cn(
        'flex w-full min-w-[210px] sm:min-w-[250px] max-w-[320px] items-center gap-2.5 py-0.5 select-none',
        className,
      )}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* Avatar circular with microphone badge */}
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
            'absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full shadow-sm ring-2',
            mine
              ? 'bg-emerald-500 text-white ring-background/80'
              : 'bg-emerald-500 text-white ring-background/80',
          )}
          title="Voice note"
          aria-label="Voice note"
        >
          <Mic size={10} strokeWidth={2.5} />
        </span>
      </div>

      {/* Play/Pause Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={cn(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-transform active:scale-95',
          'text-text-hi hover:bg-black/10 dark:hover:bg-white/10',
        )}
        aria-label={isPlaying ? 'Pause' : 'Play'}
      >
        {isPlaying ? (
          <Pause size={20} className="fill-current" />
        ) : (
          <Play size={20} className="fill-current translate-x-0.5" />
        )}
      </button>

      {/* Waveform track & Time/Meta footer */}
      <div className="flex flex-1 flex-col justify-center gap-1 min-w-0">
        <div
          ref={trackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="relative flex h-6 w-full cursor-pointer items-center touch-none py-1"
          role="slider"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={currentTime}
          aria-label="Audio progress"
        >
          {/* Waveform Bars */}
          <div className="flex h-5 w-full items-center justify-between gap-[2px]">
            {activeBars.map((amp, idx) => {
              const isPast = idx <= currentBarIndex
              return (
                <div
                  key={idx}
                  className={cn(
                    'w-[3px] rounded-full transition-colors',
                    isPast
                      ? 'bg-sky-400 dark:bg-sky-400'
                      : 'bg-text-low/30 dark:bg-white/20',
                  )}
                  style={{
                    height: `${Math.round(amp * 20)}px`,
                    minHeight: '4px',
                  }}
                />
              )
            })}
          </div>

          {/* Blue Scrubber Thumb (knob) */}
          <div
            className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 transition-transform duration-75"
            style={{ left: `${progress * 100}%` }}
          >
            <div className="h-3.5 w-3.5 rounded-full bg-sky-400 shadow ring-2 ring-white/60 dark:ring-black/40" />
          </div>
        </div>

        {/* Sub-row: Duration at left, Timestamp + ticks at right */}
        <div className="flex items-center justify-between text-[0.68rem] text-text-low font-medium tabular-nums px-0.5">
          <span>{displayedTime}</span>
          {metaSlot && <div className="flex items-center gap-1">{metaSlot}</div>}
        </div>
      </div>
    </div>
  )
}
