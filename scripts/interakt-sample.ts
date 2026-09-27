/**
 * `npm run interakt:sample` — writes sample-documents.json for creating the Interakt index.
 *
 * Interakt's "Configure Mappings" screen infers field types from a handful of representative
 * records. Paste this file's contents there, then set Searchable / Facetable / Include-in-response
 * per field (see README "Interakt index").
 *
 * Field coverage matters more than volume: a field Interakt never sees won't exist in the mapping.
 * So we map up to PER_TYPE real documents of each type and keep the smallest set that exercises
 * every field (`coveringSet`), plus at least one document per type.
 */
import { writeFileSync } from 'node:fs'

import config from '@payload-config'
import { getPayload } from 'payload'

import { coveringSet } from '../src/interakt/coverage'
import {
  artistToDocument,
  artworkToDocument,
  exhibitionToDocument,
  type InteraktDocument,
  movementToDocument,
  storyToDocument,
  tourToDocument,
} from '../src/interakt/toDocument'

const PER_TYPE = 12
const OUT = 'sample-documents.json'
/**
 * Interakt's mappings screen only reads the FIRST object of a pasted array, so a multi-type
 * sample loses every field the first document lacks. This file is one object holding every field
 * (each with a real value from the first document that has it) — paste this one.
 */
const OUT_MAPPING = 'sample-mapping.json'

async function main() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3003'
  const payload = await getPayload({ config })
  const find = { depth: 2, limit: PER_TYPE, pagination: false } as const

  const [artworks, artists, stories, exhibitions, tours, movements] = await Promise.all([
    // Mix on-view and off-view, named artists and cultures, by taking a spread of ids.
    payload.find({ collection: 'artworks', ...find, limit: 200, sort: 'id' }),
    payload.find({ collection: 'artists', ...find, where: { bio: { exists: true } }, joins: { artworks: { limit: 20, count: true } } }),
    payload.find({ collection: 'stories', ...find, where: { _status: { equals: 'published' } } }),
    payload.find({ collection: 'exhibitions', ...find }),
    payload.find({ collection: 'tours', ...find }),
    payload.find({ collection: 'movements', ...find, joins: { artworks: { limit: 25, count: true } } }),
  ])

  // Join fields don't populate the joined artworks' images, so look up one cover per document.
  const coverFor = async (field: 'artist' | 'movement', id: number) => {
    const res = await payload.find({ collection: 'artworks', where: { [field]: { equals: id } }, depth: 1, limit: 1, sort: '-isOnView' })
    const image = res.docs[0]?.image
    return image && typeof image === 'object' ? image : null
  }
  const artistCovers = await Promise.all(artists.docs.map((a) => coverFor('artist', a.id)))
  const movementCovers = await Promise.all(movements.docs.map((m) => coverFor('movement', m.id)))

  const byType: InteraktDocument[][] = [
    artworks.docs.filter((_, i) => i % 17 === 0).map((d) => artworkToDocument(d, siteUrl)),
    artists.docs.map((d, i) => artistToDocument(d, siteUrl, { cover: artistCovers[i] })),
    stories.docs.map((d) => storyToDocument(d, siteUrl)),
    exhibitions.docs.map((d) => exhibitionToDocument(d, siteUrl)),
    tours.docs.map((d) => tourToDocument(d, siteUrl)),
    movements.docs.map((d, i) => movementToDocument(d, siteUrl, { cover: movementCovers[i] })),
  ]

  const all = byType.flat()
  const chosen = coveringSet(all as unknown as Record<string, unknown>[]) as unknown as InteraktDocument[]
  // Make sure every type is represented even when another type already covered its fields.
  for (const docs of byType) if (docs[0] && !chosen.some((d) => d.type === docs[0].type)) chosen.push(docs[0])

  const order = ['artwork', 'artist', 'story', 'exhibition', 'tour', 'movement']
  chosen.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type))

  writeFileSync(OUT, JSON.stringify(chosen, null, 2) + '\n')

  const union: Record<string, unknown> = {}
  for (const doc of chosen) for (const [k, v] of Object.entries(doc)) if (!(k in union)) union[k] = v
  writeFileSync(OUT_MAPPING, JSON.stringify(union, null, 2) + '\n')
  const fields = new Set(chosen.flatMap((d) => Object.keys(d)))
  console.log(`Wrote ${chosen.length} documents (${[...new Set(chosen.map((d) => d.type))].join(', ')}) covering ${fields.size} fields to ${OUT}`)
  console.log(`Wrote one object with all ${Object.keys(union).length} fields to ${OUT_MAPPING} — paste this into Interakt's Configure Mappings`)
}

// `payload run` only awaits the module import, so the work must happen in top-level await.
try {
  await main()
  process.exit(0)
} catch (err) {
  console.error(err)
  process.exit(1)
}
