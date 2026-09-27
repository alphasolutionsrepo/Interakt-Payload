/**
 * Payload documents → flat Interakt documents, for a single index holding every content type.
 *
 * Rules (see README "Interakt index"):
 *  - Flat: scalars and arrays of strings only. A nested object indexes as "[object Object]".
 *  - Shared field names across types (`movements`, `subjects`, `nationality`, `artworkTitles`…),
 *    so one facet works over artworks, artists and stories alike.
 *  - Facet values are human-readable labels, not slugs.
 *  - Fields a type doesn't have are omitted (`compact`), never sent as null.
 *  - `id` is `<type>-<payload id>`: stable across re-seeds (the seed upserts), and what we delete by.
 */
import type { Artist, Artwork, Exhibition, Media, Movement, Story, Subject, Tour } from '../payload-types'
import { routes } from '../lib/format'
import { lexicalToPlainText } from '../lib/lexical'
import { ARTWORK_TYPES, COLOR_FAMILIES, DEPARTMENTS, ERAS, labelFor, REGIONS, STORY_CATEGORIES } from '../lib/taxonomy'

export type InteraktType = 'artwork' | 'artist' | 'story' | 'exhibition' | 'tour' | 'movement'

export const TYPE_LABELS: Record<InteraktType, string> = {
  artwork: 'Artwork',
  artist: 'Artist',
  story: 'Story',
  exhibition: 'Exhibition',
  tour: 'Tour',
  movement: 'Movement',
}

export interface InteraktDocument {
  id: string
  type: InteraktType
  typeLabel: string
  title: string
  slug: string
  url: string
  summary: string
  body: string
  imageUrl?: string
  imageAlt?: string
  // Shared facets
  artist?: string
  culture?: string
  nationality?: string
  movements?: string[]
  subjects?: string[]
  // Artworks
  department?: string
  artworkType?: string
  era?: string
  century?: string
  region?: string
  country?: string
  colorFamily?: string
  isOnView?: boolean
  yearStart?: number
  yearEnd?: number
  dateDisplay?: string
  medium?: string
  dimensions?: string
  creditLine?: string
  gallery?: string
  materials?: string[]
  techniques?: string[]
  // Artists
  birthYear?: number
  deathYear?: number
  // Stories
  category?: string
  author?: string
  readingTime?: number
  publishedAt?: string
  // Exhibitions
  venue?: string
  startDate?: string
  endDate?: string
  // Tours
  theme?: string
  durationMinutes?: number
  stopCount?: number
  // Movements
  period?: string
  // Related works
  artworkCount?: number
  artworkTitles?: string[]
  updatedAt?: string
}

/** Drop keys whose value is undefined, null, an empty string or an empty array. */
export function compact<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => {
      if (v === undefined || v === null || v === '') return false
      if (Array.isArray(v) && v.length === 0) return false
      return true
    }),
  ) as T
}

/** First sentences of `text` up to ~`max` characters (never cuts mid-word). */
export function summarize(text: string | null | undefined, max = 300): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const sentences = clean.match(/[^.!?]+[.!?]+(\s|$)/g) ?? []
  let out = ''
  for (const s of sentences) {
    if ((out + s).length > max) break
    out += s
  }
  if (out) return out.trim()
  return clean.slice(0, max).replace(/\s+\S*$/, '') + '…'
}

const obj = <T extends object>(v: T | number | string | null | undefined): T | undefined =>
  v && typeof v === 'object' ? v : undefined

const objs = <T extends object>(list: (T | number | string)[] | null | undefined): T[] =>
  (list ?? []).map((v) => obj<T>(v)).filter((v): v is T => Boolean(v))

const uniq = (list: (string | null | undefined)[]) => [...new Set(list.filter((v): v is string => Boolean(v)))]

function base(type: InteraktType, id: number, title: string, slug: string | null | undefined, path: string, siteUrl: string) {
  if (!slug) throw new Error(`${type} ${id} has no slug — cannot build a URL`)
  return {
    id: `${type}-${id}`,
    type,
    typeLabel: TYPE_LABELS[type],
    title,
    slug,
    url: `${siteUrl.replace(/\/$/, '')}${path}`,
  }
}

function image(media: Media | number | null | undefined, siteUrl: string) {
  const m = obj<Media>(media)
  const path = m?.sizes?.card?.url || m?.url
  if (!m || !path) return {}
  return { imageUrl: path.startsWith('http') ? path : `${siteUrl.replace(/\/$/, '')}${path}`, imageAlt: m.alt }
}

/** Titles of artworks embedded as blocks in Lexical rich text (populated at depth ≥ 1). */
type LexicalNode = { type?: string; fields?: { artwork?: Artwork | number }; children?: LexicalNode[] }

function embeddedArtworkTitles(doc: unknown): string[] {
  const out: string[] = []
  const walk = (node: LexicalNode) => {
    const art = node.type === 'block' ? obj<Artwork>(node.fields?.artwork) : undefined
    if (art) out.push(art.title)
    node.children?.forEach(walk)
  }
  const root = (doc as { root?: LexicalNode } | null)?.root
  if (root) walk(root)
  return out
}

const joinDocs = (join: { docs?: (number | Artwork)[] } | null | undefined) => objs<Artwork>(join?.docs)

// ---------------------------------------------------------------------------------------------

export function artworkToDocument(a: Artwork, siteUrl: string): InteraktDocument {
  const artist = obj<Artist>(a.artist)
  const movement = obj<Movement>(a.movement)
  const attribution = artist?.name ?? a.culture
  // The label facts are real signal for questions like "which paintings are on panel?".
  const facts = [a.medium, a.dimensions, [attribution, a.dateDisplay].filter(Boolean).join(', ')].filter(Boolean).join('. ')
  return compact({
    ...base('artwork', a.id, a.title, a.slug, routes.artwork(a.slug ?? ''), siteUrl),
    summary: summarize(a.description) || [a.title, attribution, a.dateDisplay].filter(Boolean).join(', '),
    body: [a.description, facts ? `${facts}.` : ''].filter(Boolean).join('\n\n'),
    ...image(a.image, siteUrl),
    artist: artist?.name,
    culture: a.culture ?? undefined,
    nationality: artist?.nationality ?? undefined,
    movements: uniq([movement?.title]),
    subjects: uniq(objs<Subject>(a.subjects).map((s) => s.title)),
    department: a.department ? labelFor(DEPARTMENTS, a.department) : undefined,
    artworkType: a.artworkType ? labelFor(ARTWORK_TYPES, a.artworkType) : undefined,
    era: a.era ? labelFor(ERAS, a.era) : undefined,
    century: a.century ?? undefined,
    region: a.region ? labelFor(REGIONS, a.region) : undefined,
    country: a.country ?? undefined,
    colorFamily: a.colorFamily ? labelFor(COLOR_FAMILIES, a.colorFamily) : undefined,
    isOnView: Boolean(a.isOnView),
    yearStart: a.yearStart ?? undefined,
    yearEnd: a.yearEnd ?? undefined,
    dateDisplay: a.dateDisplay ?? undefined,
    medium: a.medium ?? undefined,
    dimensions: a.dimensions ?? undefined,
    creditLine: a.creditLine ?? undefined,
    gallery: a.gallery ?? undefined,
    materials: a.materials ?? undefined,
    techniques: a.techniques ?? undefined,
    updatedAt: a.updatedAt,
  })
}

/**
 * Join fields (an artist's or movement's artworks) never populate the joined documents' own
 * relationships, so their image is passed in by the caller as `cover`.
 */
type CoverOpts = { cover?: Media | null }

export function artistToDocument(a: Artist, siteUrl: string, { cover }: CoverOpts = {}): InteraktDocument {
  const bio = lexicalToPlainText(a.bio as Parameters<typeof lexicalToPlainText>[0])
  const works = joinDocs(a.artworks)
  const lifespan = a.birthYear || a.deathYear ? `${a.birthYear ?? '?'}–${a.deathYear ?? ''}` : ''
  const fallback = [a.name, [a.nationality, lifespan].filter(Boolean).join(', ')].filter(Boolean).join(', ')
  return compact({
    ...base('artist', a.id, a.name, a.slug, routes.artist(a.slug ?? ''), siteUrl),
    summary: summarize(bio) || fallback,
    body: bio || `${fallback}. Works in the collection: ${works.map((w) => w.title).join('; ')}.`,
    ...image(cover, siteUrl),
    nationality: a.nationality ?? undefined,
    movements: uniq(objs<Movement>(a.movements).map((m) => m.title)),
    birthYear: a.birthYear ?? undefined,
    deathYear: a.deathYear ?? undefined,
    artworkCount: a.artworks?.totalDocs ?? works.length,
    artworkTitles: uniq(works.map((w) => w.title)),
    updatedAt: a.updatedAt,
  })
}

export function storyToDocument(s: Story, siteUrl: string): InteraktDocument {
  const body = lexicalToPlainText(s.body as Parameters<typeof lexicalToPlainText>[0])
  return compact({
    ...base('story', s.id, s.title, s.slug, routes.story(s.slug ?? ''), siteUrl),
    summary: s.excerpt,
    body: [s.excerpt, body].filter(Boolean).join('\n\n'),
    ...image(s.heroImage, siteUrl),
    category: STORY_CATEGORIES.find((c) => c.value === s.category)?.label,
    author: s.author,
    readingTime: s.readingTime ?? undefined,
    publishedAt: s.publishedAt ?? undefined,
    movements: uniq(objs<Movement>(s.movements).map((m) => m.title)),
    subjects: uniq(objs<Subject>(s.subjects).map((x) => x.title)),
    artworkTitles: uniq([...embeddedArtworkTitles(s.body), ...objs<Artwork>(s.relatedArtworks).map((a) => a.title)]),
    updatedAt: s.updatedAt,
  })
}

export function exhibitionToDocument(e: Exhibition, siteUrl: string): InteraktDocument {
  const body = lexicalToPlainText(e.body as Parameters<typeof lexicalToPlainText>[0])
  const works = objs<Artwork>(e.artworks)
  return compact({
    ...base('exhibition', e.id, e.title, e.slug, routes.exhibition(e.slug ?? ''), siteUrl),
    summary: summarize(e.summary),
    body: [e.summary, body].filter(Boolean).join('\n\n'),
    ...image(e.heroImage, siteUrl),
    venue: e.venue === 'aic' ? 'Art Institute of Chicago' : 'Lumen',
    startDate: e.startDate ?? undefined,
    endDate: e.endDate ?? undefined,
    artworkCount: works.length,
    artworkTitles: uniq(works.map((w) => w.title)),
    updatedAt: e.updatedAt,
  })
}

export function tourToDocument(t: Tour, siteUrl: string): InteraktDocument {
  const stops = (t.stops ?? []).map((s) => ({ artwork: obj<Artwork>(s.artwork), note: s.note }))
  // Each stop's note is the tour's real content; keep it next to the work it describes.
  const stopText = stops.map((s, i) => `${i + 1}. ${s.artwork?.title ?? 'Artwork'} — ${s.note}`).join('\n')
  return compact({
    ...base('tour', t.id, t.title, t.slug, routes.tour(t.slug ?? ''), siteUrl),
    summary: summarize(t.intro),
    body: [t.intro, stopText].filter(Boolean).join('\n\n'),
    ...image(t.heroImage, siteUrl),
    theme: t.theme,
    durationMinutes: t.durationMinutes,
    stopCount: stops.length,
    artworkCount: stops.length,
    artworkTitles: uniq(stops.map((s) => s.artwork?.title)),
    updatedAt: t.updatedAt,
  })
}

export function movementToDocument(m: Movement, siteUrl: string, { cover }: CoverOpts = {}): InteraktDocument {
  const works = joinDocs(m.artworks)
  return compact({
    ...base('movement', m.id, m.title, m.slug, routes.movement(m.slug ?? ''), siteUrl),
    summary: summarize(m.description),
    body: m.description ?? '',
    ...image(cover, siteUrl),
    period: m.period ?? undefined,
    movements: [m.title],
    artworkCount: m.artworks?.totalDocs ?? works.length,
    artworkTitles: uniq(works.map((w) => w.title)).slice(0, 25),
    updatedAt: m.updatedAt,
  })
}
