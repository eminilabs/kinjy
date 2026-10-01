import { useEffect, useState } from 'react'
import { useAppTheme } from '@/components/appdemo/theme'

const STORED_MODE = 'kaluta.display_mode'

function hasChosenMode(): boolean {
  try {
    return localStorage.getItem(STORED_MODE) !== null
  } catch {
    return false
  }
}

function useSystemDark(): boolean {
  const query = '(prefers-color-scheme: dark)'
  const [dark, setDark] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const list = window.matchMedia(query)
    const update = () => setDark(list.matches)
    list.addEventListener('change', update)
    return () => list.removeEventListener('change', update)
  }, [])
  return dark
}

/**
 * Light or dark for the landing page.
 *
 * A member who picked a display mode gets it here too (Cloud and Dark both
 * read as dark). Everyone else follows their system: the app's own default is
 * Cloud, and applying it here would show every first-time visitor a dark page
 * whatever their device is set to.
 *
 * `toggle` writes the same setting as the app's switcher, so the choice
 * carries into the app after sign-in.
 */
export function useLandingTheme() {
  const { resolved, setMode } = useAppTheme()
  const systemDark = useSystemDark()
  const theme: 'light' | 'dark' = hasChosenMode()
    ? resolved === 'light'
      ? 'light'
      : 'dark'
    : systemDark
      ? 'dark'
      : 'light'
  return { theme, toggle: () => setMode(theme === 'dark' ? 'light' : 'dark') }
}
