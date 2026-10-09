import { countryName } from '@/lib/profileOptions'
import type { OrderShipping } from '@/lib/api'

export function addressLines(s: OrderShipping): string[] {
  const cityLine = [s.postal_code, s.city].filter(Boolean).join(' ')
  return [
    s.full_name,
    s.line1,
    s.line2 ?? '',
    [cityLine, s.region].filter(Boolean).join(', '),
    countryName(s.country, 'en'),
    s.phone ?? '',
  ].filter((line) => line.trim() !== '')
}
