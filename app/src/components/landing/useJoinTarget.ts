import { useAuth } from '@/hooks/useAuth'

/** Where "join" leads: the sign-up form, or the app for someone already in. */
export function useJoinTarget() {
  const { user } = useAuth()
  return user
    ? { to: '/hub', label: 'Open Kinjy' }
    : { to: '/join?mode=signup', label: 'Sign up' }
}
