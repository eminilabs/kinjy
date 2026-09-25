/** Scripted demo-clip model + helpers (no real mp4 exists in this environment). */

export interface DemoClipStep {
  /** Timed caption shown at the bottom of the "recording". */
  caption: string
  /** Cursor target inside the mock UI, in percent of the frame. */
  target?: { x: number; y: number }
}

export const DEFAULT_TARGETS = [
  { x: 26, y: 22 },
  { x: 68, y: 30 },
  { x: 42, y: 56 },
  { x: 72, y: 68 },
  { x: 30, y: 78 },
]

/** Build a scripted demo clip from any localized answer: sentences become timed captions. */
export function clipFromAnswer(answer: string, maxSteps = 4): DemoClipStep[] {
  const sentences = answer
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?。！؟?])\s+/)
    .filter((s) => s.trim().length > 2)
    .slice(0, maxSteps)
  return sentences.map((caption, i) => ({ caption, target: DEFAULT_TARGETS[i % DEFAULT_TARGETS.length] }))
}
