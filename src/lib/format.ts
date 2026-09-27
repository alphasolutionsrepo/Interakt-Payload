import type { Exhibition, Media } from '@/payload-types'

export const routes = {
  artwork: (slug: string) => `/artworks/${slug}`,
  artist: (slug: string) => `/artists/${slug}`,
  movement: (slug: string) => `/movements/${slug}`,
  story: (slug: string) => `/stories/${slug}`,
  exhibition: (slug: string) => `/exhibitions/${slug}`,
  tour: (slug: string) => `/tours/${slug}`,
  collection: (query = '') => `/collection${query}`,
}

/** Narrows a populated relationship (object) vs. an unpopulated id. */
export function populated<T extends object>(value: T | number | string | null | undefined): T | undefined {
  return value && typeof value === 'object' ? value : undefined
}

export const asMedia = (value: Media | number | null | undefined) => populated<Media>(value)

export function formatDate(iso?: string | null, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!iso) return ''
  return new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: 'UTC' }).format(new Date(iso))
}

export function lifespan(birth?: number | null, death?: number | null) {
  if (!birth && !death) return ''
  return `${birth ?? '?'}–${death ?? ''}`
}

export type ExhibitionStatus = 'current' | 'upcoming' | 'past'

export function exhibitionStatus(e: Pick<Exhibition, 'startDate' | 'endDate'>, now = new Date()): ExhibitionStatus {
  const start = e.startDate ? new Date(e.startDate) : undefined
  const end = e.endDate ? new Date(e.endDate) : undefined
  if (start && start > now) return 'upcoming'
  if (end && end < now) return 'past'
  return 'current'
}

export function exhibitionDates(e: Pick<Exhibition, 'startDate' | 'endDate'>) {
  const start = formatDate(e.startDate)
  if (!e.endDate) return start ? `Since ${start}` : ''
  return `${start} – ${formatDate(e.endDate)}`
}
