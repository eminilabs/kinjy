/**
 * The sound a message makes when it arrives.
 *
 * Synthesised with the Web Audio API rather than shipped as a file. Two
 * reasons: an .mp3 is a request that can fail, arrive late, or be blocked, so
 * the first message of a session is the one that would be silent; and a sound
 * nobody has to download is a sound that works on the connections most of this
 * platform's members are on.
 *
 * It is two short notes a fifth apart, quiet, with a soft attack and release.
 * The envelope matters more than the notes: a square-edged tone clicks, and a
 * click in a messaging app reads as something breaking.
 */

const STORAGE_KEY = 'kinjy.message_sound'

let context: AudioContext | null = null

/** Whether the member wants it. On unless they said otherwise. */
export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off'
  } catch {
    // Private window, blocked storage: a default of "on" is the one that
    // matches what the member last chose in the common case.
    return true
  }
}

export function setSoundEnabled(on: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off')
  } catch {
    /* the toggle still works for this tab */
  }
}

/**
 * Unlock audio from inside a real gesture.
 *
 * Browsers refuse to start an AudioContext that no click asked for, and one
 * created outside a gesture stays "suspended" — so the first message would be
 * silent even with the sound turned on. Called from the click that opens a
 * conversation, which is a gesture the member made anyway.
 */
export function primeSound(): void {
  if (context) {
    if (context.state === 'suspended') void context.resume()
    return
  }
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctor) return
    context = new Ctor()
  } catch {
    context = null
  }
}

/**
 * Play the arrival sound. Does nothing if it is switched off, if audio was
 * never unlocked, or if the browser refuses — none of which is worth an error:
 * a missing sound must never cost somebody their message.
 */
export function playMessageChime(): void {
  if (!soundEnabled() || !context) return
  try {
    if (context.state === 'suspended') void context.resume()
    const now = context.currentTime
    // A5 then E6: high enough to carry over a room, far enough apart to read as
    // a signal rather than a beep.
    for (const [index, frequency] of [880, 1318.5].entries()) {
      const at = now + index * 0.085
      const osc = context.createOscillator()
      const gain = context.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(frequency, at)
      // Ramped, not switched: a square edge clicks, and a click reads as
      // something breaking rather than something arriving.
      gain.gain.setValueAtTime(0.0001, at)
      gain.gain.exponentialRampToValueAtTime(0.12, at + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.22)
      osc.connect(gain).connect(context.destination)
      osc.start(at)
      osc.stop(at + 0.24)
    }
  } catch {
    /* an unplayable sound is not an error worth showing anybody */
  }
}
