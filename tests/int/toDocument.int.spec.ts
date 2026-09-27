import { describe, expect, it } from 'vitest'

import {
  artistToDocument,
  artworkToDocument,
  compact,
  exhibitionToDocument,
  movementToDocument,
  storyToDocument,
  summarize,
  tourToDocument,
} from '@/interakt/toDocument'
import type { Artist, Artwork, Exhibition, Media, Movement, Story, Tour } from '@/payload-types'

const SITE = 'http://localhost:3003/'

const media = { id: 1, alt: 'Dots in a park', url: '/api/media/file/a.jpg', sizes: { card: { url: '/api/media/file/a-800x536.jpg' } } } as Media
const movement = { id: 16, title: 'Post-Impressionism', slug: 'post-impressionism', period: 'c. 1886–1905', description: 'Seurat applied colour theory. Cézanne rebuilt form.' } as Movement
const artist = { id: 37, name: 'Georges Seurat', slug: 'georges-seurat', nationality: 'French', birthYear: 1859, deathYear: 1891 } as Artist

const artwork = {
  id: 179,
  title: 'A Sunday on La Grande Jatte — 1884',
  slug: 'a-sunday-on-la-grande-jatte-1884',
  description: 'Parisians at leisure on an island in the Seine.',
  image: media,
  artist,
  movement,
  subjects: [{ id: 1, title: 'Leisure', slug: 'leisure' }, 7],
  department: 'european-painting-sculpture',
  artworkType: 'painting',
  era: '19th-century',
  century: '19th century',
  region: 'europe',
  country: 'France',
  colorFamily: 'yellow',
  isOnView: false,
  yearStart: 1884,
  yearEnd: 1886,
  dateDisplay: '1884–86',
  medium: 'Oil on canvas',
  materials: [],
  culture: null,
  updatedAt: '2026-09-26T00:00:00.000Z',
} as unknown as Artwork

const lexical = (children: unknown[]) => ({ root: { type: 'root', children } })
const para = (text: string) => ({ type: 'paragraph', children: [{ type: 'text', text }] })

/** Only scalars and arrays of strings are allowed at the top level. */
const isFlat = (doc: object) =>
  Object.values(doc).every((v) => v === null || typeof v !== 'object' || (Array.isArray(v) && v.every((x) => typeof x === 'string')))

describe('artworkToDocument', () => {
  const doc = artworkToDocument(artwork, SITE)

  it('builds a stable id and an absolute url without double slashes', () => {
    expect(doc.id).toBe('artwork-179')
    expect(doc.url).toBe('http://localhost:3003/artworks/a-sunday-on-la-grande-jatte-1884')
    expect(doc.imageUrl).toBe('http://localhost:3003/api/media/file/a-800x536.jpg')
  })

  it('is flat and uses labels, not slugs', () => {
    expect(isFlat(doc)).toBe(true)
    expect(doc).toMatchObject({
      department: 'European Painting & Sculpture',
      artworkType: 'Painting',
      era: '19th Century',
      region: 'Europe',
      colorFamily: 'Yellow',
      artist: 'Georges Seurat',
      nationality: 'French',
    })
  })

  it('always sends movements as an array and skips unpopulated subjects', () => {
    expect(doc.movements).toEqual(['Post-Impressionism'])
    expect(doc.subjects).toEqual(['Leisure'])
  })

  it('keeps false booleans but drops null, empty strings and empty arrays', () => {
    expect(doc.isOnView).toBe(false)
    expect(doc).not.toHaveProperty('culture')
    expect(doc).not.toHaveProperty('materials')
  })

  it('folds the label facts into the body', () => {
    expect(doc.body).toBe('Parisians at leisure on an island in the Seine.\n\nOil on canvas. Georges Seurat, 1884–86.')
  })
})

describe('other types', () => {
  it('flattens an artist bio and uses the passed cover image', () => {
    const doc = artistToDocument(
      { ...artist, bio: lexical([para('Seurat trained in Paris.'), para('He read about optics.')]), artworks: { docs: [artwork], totalDocs: 2 } } as unknown as Artist,
      SITE,
      { cover: media },
    )
    expect(doc.body).toBe('Seurat trained in Paris.\nHe read about optics.')
    expect(doc).toMatchObject({ artworkCount: 2, artworkTitles: ['A Sunday on La Grande Jatte — 1884'], imageAlt: 'Dots in a park' })
    expect(isFlat(doc)).toBe(true)
  })

  it('collects embedded and related artwork titles for stories', () => {
    const story = {
      id: 2,
      title: 'Close Look',
      slug: 'close-look',
      excerpt: 'Dots.',
      author: 'Ines Halvorsen',
      category: 'close-look',
      body: lexical([para('Intro.'), { type: 'block', fields: { blockType: 'artworkEmbed', artwork } }]),
      relatedArtworks: [artwork, { ...artwork, id: 5, title: 'Bathers' }],
      movements: [movement],
    } as unknown as Story
    const doc = storyToDocument(story, SITE)
    expect(doc).toMatchObject({ category: 'Close Look', body: 'Dots.\n\nIntro.', movements: ['Post-Impressionism'] })
    expect(doc.artworkTitles).toEqual(['A Sunday on La Grande Jatte — 1884', 'Bathers'])
  })

  it('writes every tour stop into the body next to its artwork', () => {
    const tour = { id: 1, title: 'Water', slug: 'water', intro: 'Rivers.', theme: 'Nature', durationMinutes: 25, stops: [{ artwork, note: 'Look at the boats.' }] } as unknown as Tour
    const doc = tourToDocument(tour, SITE)
    expect(doc.body).toBe('Rivers.\n\n1. A Sunday on La Grande Jatte — 1884 — Look at the boats.')
    expect(doc).toMatchObject({ stopCount: 1, theme: 'Nature' })
  })

  it('labels the exhibition venue', () => {
    const e = { id: 13, title: 'Archive show', slug: 'archive-show', summary: 'Old show.', venue: 'aic', startDate: '2020-01-01', artworks: [] } as unknown as Exhibition
    expect(exhibitionToDocument(e, SITE)).toMatchObject({ venue: 'Art Institute of Chicago', artworkCount: 0 })
  })

  it('gives movements their own title as a movements facet value', () => {
    const doc = movementToDocument({ ...movement, artworks: { docs: [artwork], totalDocs: 40 } } as unknown as Movement, SITE)
    expect(doc).toMatchObject({ movements: ['Post-Impressionism'], artworkCount: 40, period: 'c. 1886–1905' })
  })

  it('refuses documents without a slug', () => {
    expect(() => movementToDocument({ ...movement, slug: null } as unknown as Movement, SITE)).toThrow(/no slug/)
  })
})

describe('helpers', () => {
  it('summarize keeps whole sentences within the limit', () => {
    expect(summarize('One. Two two. Three three three.', 15)).toBe('One. Two two.')
    expect(summarize('short', 15)).toBe('short')
    expect(summarize('a very long sentence without any full stop at all', 20)).toBe('a very long…')
    expect(summarize(null)).toBe('')
  })

  it('compact drops empty values only', () => {
    expect(compact({ a: 0, b: false, c: '', d: [], e: null, f: undefined, g: ['x'] })).toEqual({ a: 0, b: false, g: ['x'] })
  })
})
