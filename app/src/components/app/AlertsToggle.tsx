import { useEffect, useState } from 'react'
import { Loader2, Volume2, VolumeX } from 'lucide-react'
import { playMessageChime, primeSound, setSoundEnabled, soundEnabled } from '@/lib/chime'
import { disablePush, enablePush, pushState, type PushState } from '@/lib/push'
import { cn } from '@/lib/utils'

/**
 * One switch for "tell me about new messages".
 *
 * There used to be two side by side: a speaker for the arrival sound, and a
 * pill reading "Notify me" for browser notifications. Two controls for one
 * intention — nobody wants the chime but not the notification — and the pill
 * spelled its state out in words next to a header that is otherwise all
 * icons.
 *
 * So the speaker does both. Pressing it turns on the sound *and* asks for
 * notification permission, which is the right moment for both: a browser
 * unlocks audio only from a gesture, and permission may only be requested
 * from one. A site that asks on load is why people have learned to press
 * Block without reading, and a blocked permission cannot be asked for again
 * from the page — one badly timed prompt costs the channel permanently.
 *
 * Where push cannot work — a browser without the Push API, an installation
 * with no keys, or permission already refused — the button still governs the
 * sound, and says what is going on in its tooltip rather than offering a
 * switch that does nothing.
 */
export default function AlertsToggle({ className }: { className?: string }) {
  const [sound, setSound] = useState(soundEnabled)
  const [push, setPush] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let alive = true
    pushState()
      .then((state) => alive && setPush(state))
      .catch(() => alive && setPush('unavailable'))
    return () => {
      alive = false
    }
  }, [])

  // Push is a thing that can be asked for only while it is neither already on
  // nor refused; everything else leaves this a sound switch.
  const pushUsable = push === 'off' || push === 'on'
  const blocked = push === 'denied'

  const label = (() => {
    if (!sound) {
      return blocked
        ? 'Silent. Notifications are blocked for this site — turn them back on in your browser settings.'
        : pushUsable
          ? 'Silent. Turn on the sound and notifications for new messages.'
          : 'Silent. Turn on the sound for new messages.'
    }
    if (push === 'on') return 'Sound and notifications on for new messages'
    if (blocked)
      return 'Sound on. Notifications are blocked for this site — turn them back on in your browser settings.'
    return 'Sound on for new messages'
  })()

  const toggle = async () => {
    const next = !sound
    setSound(next)
    setSoundEnabled(next)
    if (next) {
      // This click is the gesture a browser requires before audio may start.
      // Playing it once doubles as showing what it sounds like.
      primeSound()
      playMessageChime()
    }
    if (!pushUsable) return
    setBusy(true)
    try {
      setPush(next ? await enablePush() : await disablePush())
    } catch {
      // The sound still changed, which is the part that always works. The
      // state below is re-read rather than guessed.
      setPush(await pushState().catch(() => 'unavailable' as PushState))
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => void toggle()}
      aria-pressed={sound}
      aria-label={label}
      title={label}
      className={cn(
        'grid h-9 w-9 place-items-center rounded-full transition-colors hover:bg-text-hi/[0.1] disabled:opacity-50',
        sound ? 'bg-text-hi/[0.07] text-text-hi' : 'text-text-low',
        className,
      )}
    >
      {busy ? (
        <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      ) : sound ? (
        <Volume2 size={16} aria-hidden="true" />
      ) : (
        <VolumeX size={16} aria-hidden="true" />
      )}
    </button>
  )
}
