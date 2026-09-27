/**
 * Builds Interakt documents from Payload, for a single document (hooks) or everything (backfill).
 *
 * Owns the Payload-side details the pure mappers in toDocument.ts don't know about: which
 * collections are indexed, the depth each needs, published-only stories, and cover images for
 * artists and movements (join fields don't populate the joined artworks' images).
 */
import type { Payload, PayloadRequest } from 'payload'

import type { Media } from '../payload-types'
import {
  artistToDocument,
  artworkToDocument,
  exhibitionToDocument,
  type InteraktDocument,
  type InteraktType,
  movementToDocument,
  storyToDocument,
  tourToDocument,
} from './toDocument'

export const INDEXED_COLLECTIONS = ['artworks', 'artists', 'stories', 'exhibitions', 'tours', 'movements'] as const
export type IndexedCollection = (typeof INDEXED_COLLECTIONS)[number]

export const TYPE_FOR: Record<IndexedCollection, InteraktType> = {
  artworks: 'artwork',
  artists: 'artist',
  stories: 'story',
  exhibitions: 'exhibition',
  tours: 'tour',
  movements: 'movement',
}

export const documentId = (collection: IndexedCollection, id: number | string) => `${TYPE_FOR[collection]}-${id}`

const JOINS = { artworks: { limit: 100, count: true } }

/** First artwork image (on-view works first) for an artist or movement. */
async function coverFor(payload: Payload, field: 'artist' | 'movement', id: number, req?: PayloadRequest): Promise<Media | null> {
  const res = await payload.find({
    collection: 'artworks',
    where: { [field]: { equals: id } },
    depth: 1,
    limit: 1,
    sort: '-isOnView',
    req,
  })
  const image = res.docs[0]?.image
  return image && typeof image === 'object' ? image : null
}

/**
 * The index document for one Payload document, or `null` when it shouldn't be in the index
 * (missing, or a story with no published version).
 */
export async function buildDocument(
  payload: Payload,
  collection: IndexedCollection,
  id: number,
  siteUrl: string,
  req?: PayloadRequest,
): Promise<InteraktDocument | null> {
  const opts = { id, depth: 2, req, disableErrors: true } as const
  switch (collection) {
    case 'artworks': {
      const doc = await payload.findByID({ collection, ...opts })
      return doc ? artworkToDocument(doc, siteUrl) : null
    }
    case 'artists': {
      const doc = await payload.findByID({ collection, ...opts, joins: JOINS })
      return doc ? artistToDocument(doc, siteUrl, { cover: await coverFor(payload, 'artist', id, req) }) : null
    }
    case 'movements': {
      const doc = await payload.findByID({ collection, ...opts, joins: JOINS })
      return doc ? movementToDocument(doc, siteUrl, { cover: await coverFor(payload, 'movement', id, req) }) : null
    }
    case 'stories': {
      // `draft: false` returns the published version even while a newer draft exists.
      const doc = await payload.findByID({ collection, ...opts, draft: false })
      return doc && doc._status === 'published' ? storyToDocument(doc, siteUrl) : null
    }
    case 'exhibitions': {
      const doc = await payload.findByID({ collection, ...opts })
      return doc ? exhibitionToDocument(doc, siteUrl) : null
    }
    case 'tours': {
      const doc = await payload.findByID({ collection, ...opts })
      return doc ? tourToDocument(doc, siteUrl) : null
    }
  }
}

/** Every indexable document, for the backfill. Covers are resolved from one pass over artworks. */
export async function buildAll(payload: Payload, siteUrl: string): Promise<InteraktDocument[]> {
  const all = { depth: 2, limit: 0, pagination: false } as const
  const [artworks, artists, stories, exhibitions, tours, movements] = await Promise.all([
    payload.find({ collection: 'artworks', ...all, sort: '-isOnView' }),
    payload.find({ collection: 'artists', ...all, joins: JOINS }),
    payload.find({ collection: 'stories', ...all, where: { _status: { equals: 'published' } } }),
    payload.find({ collection: 'exhibitions', ...all }),
    payload.find({ collection: 'tours', ...all }),
    payload.find({ collection: 'movements', ...all, joins: JOINS }),
  ])

  const artistCover = new Map<number, Media>()
  const movementCover = new Map<number, Media>()
  for (const a of artworks.docs) {
    const image = typeof a.image === 'object' ? a.image : null
    if (!image) continue
    const artistId = typeof a.artist === 'object' ? a.artist?.id : a.artist
    const movementId = typeof a.movement === 'object' ? a.movement?.id : a.movement
    if (artistId && !artistCover.has(artistId)) artistCover.set(artistId, image)
    if (movementId && !movementCover.has(movementId)) movementCover.set(movementId, image)
  }

  return [
    ...artworks.docs.map((d) => artworkToDocument(d, siteUrl)),
    ...artists.docs.map((d) => artistToDocument(d, siteUrl, { cover: artistCover.get(d.id) })),
    ...stories.docs.map((d) => storyToDocument(d, siteUrl)),
    ...exhibitions.docs.map((d) => exhibitionToDocument(d, siteUrl)),
    ...tours.docs.map((d) => tourToDocument(d, siteUrl)),
    ...movements.docs.map((d) => movementToDocument(d, siteUrl, { cover: movementCover.get(d.id) })),
  ]
}
