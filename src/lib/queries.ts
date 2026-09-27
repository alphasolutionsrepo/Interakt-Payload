/**
 * Server-side data access for the frontend, via the Payload Local API. Functions are wrapped in
 * React `cache` so a page and its metadata share one query per request.
 */
import config from '@payload-config'
import { getPayload, type Where } from 'payload'
import { cache } from 'react'

import type { Artist, Artwork, Exhibition, Movement, Story, Subject, Tour } from '@/payload-types'

import type { FacetRecord } from './facets'
import type { Option } from './taxonomy'

export const payloadClient = cache(() => getPayload({ config }))

const published: Where = { _status: { equals: 'published' } }

// --- Globals -------------------------------------------------------------------------------------

export const getSiteSettings = cache(async () => (await payloadClient()).findGlobal({ slug: 'site-settings' }))

export const getHomepage = cache(async () => (await payloadClient()).findGlobal({ slug: 'homepage', depth: 2 }))

// --- Artworks ------------------------------------------------------------------------------------

export const getArtworkBySlug = cache(async (slug: string) => {
  const res = await (await payloadClient()).find({ collection: 'artworks', where: { slug: { equals: slug } }, depth: 1, limit: 1 })
  return res.docs[0] as Artwork | undefined
})

export async function getArtworksByIds(ids: number[]): Promise<Artwork[]> {
  if (!ids.length) return []
  const res = await (await payloadClient()).find({
    collection: 'artworks',
    where: { id: { in: ids } },
    depth: 1,
    limit: ids.length,
    pagination: false,
  })
  const byId = new Map(res.docs.map((d) => [d.id, d]))
  return ids.map((id) => byId.get(id)).filter((d): d is Artwork => Boolean(d))
}

export async function findArtworks(where: Where, { limit = 12, sort = 'title' }: { limit?: number; sort?: string } = {}) {
  const res = await (await payloadClient()).find({ collection: 'artworks', where, depth: 1, limit, sort })
  return res.docs
}

/** Lightweight rows for every artwork, with relationships resolved to slugs, for faceting. */
export const getFacetRecords = cache(async (): Promise<FacetRecord[]> => {
  const payload = await payloadClient()
  const [artworks, taxonomy] = await Promise.all([
    payload.find({
      collection: 'artworks',
      depth: 0,
      limit: 0,
      pagination: false,
      select: {
        title: true,
        yearStart: true,
        department: true,
        artworkType: true,
        era: true,
        region: true,
        country: true,
        colorFamily: true,
        movement: true,
        artist: true,
        subjects: true,
        isOnView: true,
      },
    }),
    getTaxonomyLookups(),
  ])
  return artworks.docs.map((a) => ({
    id: a.id,
    title: a.title,
    yearStart: a.yearStart ?? null,
    department: a.department ?? null,
    artworkType: a.artworkType ?? null,
    era: a.era ?? null,
    region: a.region ?? null,
    country: a.country ?? null,
    colorFamily: a.colorFamily ?? null,
    movement: typeof a.movement === 'number' ? (taxonomy.movementSlug.get(a.movement) ?? null) : null,
    artist: typeof a.artist === 'number' ? (taxonomy.artistSlug.get(a.artist) ?? null) : null,
    subjects: (a.subjects ?? []).flatMap((s) => {
      const slug = typeof s === 'number' ? taxonomy.subjectSlug.get(s) : undefined
      return slug ? [slug] : []
    }),
    isOnView: Boolean(a.isOnView),
  }))
})

export const getTaxonomyLookups = cache(async () => {
  const payload = await payloadClient()
  const [movements, subjects, artists] = await Promise.all([
    payload.find({ collection: 'movements', depth: 0, limit: 0, pagination: false, select: { title: true, slug: true } }),
    payload.find({ collection: 'subjects', depth: 0, limit: 0, pagination: false, select: { title: true, slug: true } }),
    payload.find({ collection: 'artists', depth: 0, limit: 0, pagination: false, select: { name: true, slug: true } }),
  ])
  const toOptions = (docs: { slug?: string | null; title?: string; name?: string }[]): Option[] =>
    docs.filter((d) => d.slug).map((d) => ({ value: d.slug!, label: d.title ?? d.name ?? d.slug! }))
  return {
    movementSlug: new Map(movements.docs.map((d) => [d.id, d.slug ?? ''])),
    subjectSlug: new Map(subjects.docs.map((d) => [d.id, d.slug ?? ''])),
    artistSlug: new Map(artists.docs.map((d) => [d.id, d.slug ?? ''])),
    movements: toOptions(movements.docs),
    subjects: toOptions(subjects.docs),
    artists: toOptions(artists.docs),
  }
})

// --- Artists / movements -------------------------------------------------------------------------

export const getArtistBySlug = cache(async (slug: string) => {
  const res = await (await payloadClient()).find({
    collection: 'artists',
    where: { slug: { equals: slug } },
    depth: 2,
    limit: 1,
    joins: { artworks: { limit: 100, sort: 'yearStart' } },
  })
  return res.docs[0] as Artist | undefined
})

export async function getArtists() {
  const res = await (await payloadClient()).find({
    collection: 'artists',
    depth: 0,
    limit: 0,
    pagination: false,
    sort: 'name',
    joins: { artworks: { limit: 1, count: true } },
  })
  return res.docs
}

export const getMovementBySlug = cache(async (slug: string) => {
  const res = await (await payloadClient()).find({ collection: 'movements', where: { slug: { equals: slug } }, depth: 0, limit: 1 })
  return res.docs[0] as Movement | undefined
})

export async function getMovements() {
  const res = await (await payloadClient()).find({
    collection: 'movements',
    depth: 0,
    limit: 0,
    pagination: false,
    joins: { artworks: { limit: 1, count: true } },
  })
  return res.docs
}

export async function getSubjectBySlug(slug: string) {
  const res = await (await payloadClient()).find({ collection: 'subjects', where: { slug: { equals: slug } }, depth: 0, limit: 1 })
  return res.docs[0] as Subject | undefined
}

// --- Editorial -----------------------------------------------------------------------------------

export async function getStories({ category, limit = 0, where }: { category?: string; limit?: number; where?: Where } = {}) {
  const res = await (await payloadClient()).find({
    collection: 'stories',
    where: { and: [published, ...(category ? [{ category: { equals: category } }] : []), ...(where ? [where] : [])] },
    depth: 1,
    limit,
    pagination: false,
    sort: '-publishedAt',
  })
  return res.docs as Story[]
}

export const getStoryBySlug = cache(async (slug: string) => {
  const res = await (await payloadClient()).find({
    collection: 'stories',
    where: { and: [published, { slug: { equals: slug } }] },
    depth: 2,
    limit: 1,
  })
  return res.docs[0] as Story | undefined
})

export async function getExhibitions() {
  const res = await (await payloadClient()).find({ collection: 'exhibitions', depth: 1, limit: 0, pagination: false, sort: '-startDate' })
  return res.docs as Exhibition[]
}

export const getExhibitionBySlug = cache(async (slug: string) => {
  const res = await (await payloadClient()).find({ collection: 'exhibitions', where: { slug: { equals: slug } }, depth: 2, limit: 1 })
  return res.docs[0] as Exhibition | undefined
})

export async function getTours() {
  const res = await (await payloadClient()).find({ collection: 'tours', depth: 1, limit: 0, pagination: false, sort: 'title' })
  return res.docs as Tour[]
}

export const getTourBySlug = cache(async (slug: string) => {
  const res = await (await payloadClient()).find({ collection: 'tours', where: { slug: { equals: slug } }, depth: 2, limit: 1 })
  return res.docs[0] as Tour | undefined
})
