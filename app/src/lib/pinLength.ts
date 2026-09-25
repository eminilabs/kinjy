/**
 * How long a pinned section should hold the scroll, in pixels.
 *
 * ScrollTrigger accepts `end: '+=220%'`, and the percentage is resolved against
 * the scroller's height *at the moment the trigger is created*. That is the
 * fragility: if the viewport measures 0 or is mid-layout at creation time — a
 * background tab, a restored session, a slow font — the pin length is computed
 * from a nonsense base and the spacer balloons. One homepage section reserved
 * **39 245px** for a 1 519px section, which reads as an enormous empty hole in
 * the middle of the page.
 *
 * Returning a function means ScrollTrigger re-evaluates it on every refresh
 * (resize, orientation change, late layout) rather than trusting one early
 * reading, and the clamp keeps a bad measurement from producing an absurd
 * length rather than merely a wrong one.
 */
export function pinLength(viewports: number): () => string {
  return () => {
    const height = window.innerHeight || document.documentElement.clientHeight || 800
    const wanted = Math.round(height * viewports)
    // Never shorter than a screen — a pin with no travel is a jump — and never
    // longer than eight, which is already a very long story beat.
    const clamped = Math.min(Math.max(wanted, height), height * 8)
    return `+=${clamped}`
  }
}
