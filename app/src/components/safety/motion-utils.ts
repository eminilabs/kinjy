import { useEffect, useState } from 'react'

/** cloud-ease — default gentle settle (design §5). */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

/** Reactive prefers-reduced-motion flag. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const fn = () => setReduced(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])
  return reduced
}
