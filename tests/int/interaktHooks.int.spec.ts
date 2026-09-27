import { describe, expect, it } from 'vitest'

import { relatedRefs } from '@/interakt/hooks'
import { documentId } from '@/interakt/indexer'

describe('relatedRefs', () => {
  it('refreshes the artwork’s artist and movement, populated or not', () => {
    expect(relatedRefs('artworks', { artist: 37, movement: { id: 16 } })).toEqual([
      { collection: 'artists', id: 37 },
      { collection: 'movements', id: 16 },
    ])
  })

  it('also refreshes the previous artist/movement when they changed, without duplicates', () => {
    expect(relatedRefs('artworks', { artist: 37, movement: 16 }, { artist: 12, movement: 16 })).toEqual([
      { collection: 'artists', id: 37 },
      { collection: 'artists', id: 12 },
      { collection: 'movements', id: 16 },
    ])
  })

  it('has nothing to refresh for other collections or unattributed works', () => {
    expect(relatedRefs('stories', { artist: 37 })).toEqual([])
    expect(relatedRefs('artworks', { artist: null, movement: null })).toEqual([])
  })
})

describe('documentId', () => {
  it('matches the ids the mappers produce', () => {
    expect(documentId('artworks', 179)).toBe('artwork-179')
    expect(documentId('stories', 2)).toBe('story-2')
  })
})
