import { describe, expect, it } from 'vitest'

import { browse, facetDefs, parseBrowseState, toggleFilter, toQueryString, type FacetRecord } from '@/lib/facets'
import { exhibitionStatus } from '@/lib/format'

const rec = (id: number, over: Partial<FacetRecord>): FacetRecord => ({
  id,
  title: `Work ${id}`,
  yearStart: 1800 + id,
  department: null,
  artworkType: 'painting',
  era: '19th-century',
  region: 'europe',
  country: 'France',
  colorFamily: 'blue',
  movement: 'impressionism',
  artist: null,
  subjects: [],
  isOnView: true,
  ...over,
})

const records = [
  rec(1, { subjects: ['water', 'boats'] }),
  rec(2, { subjects: ['water'], colorFamily: 'green' }),
  rec(3, { movement: 'realism', subjects: ['portraits'], isOnView: false }),
  rec(4, { artworkType: 'sculpture', movement: 'ancient-greece', yearStart: -450, era: 'ancient', region: 'europe', country: 'Greece' }),
]
const defs = facetDefs({ movements: [], subjects: [], artists: [] })
const facet = (res: ReturnType<typeof browse>, key: string) =>
  Object.fromEntries(res.facets.find((f) => f.key === key)!.buckets.map((b) => [b.value, b.count]))

describe('parseBrowseState / toQueryString', () => {
  it('round-trips filters, flags, sort and page', () => {
    const state = parseBrowseState({ movement: 'impressionism,realism', onView: '1', sort: 'oldest', page: '2', bogus: 'x' })
    expect(state).toEqual({ filters: { movement: ['impressionism', 'realism'] }, onView: true, sort: 'oldest', page: 2 })
    expect(toQueryString(state)).toBe('?movement=impressionism%2Crealism&onView=1&sort=oldest&page=2')
  })

  it('falls back to defaults for invalid input', () => {
    expect(parseBrowseState({ sort: 'random', page: '-3' })).toEqual({ filters: {}, onView: false, sort: 'title', page: 1 })
  })

  it('toggling a filter resets the page', () => {
    const s = toggleFilter(parseBrowseState({ page: '3' }), 'color', 'blue')
    expect(s.filters.color).toEqual(['blue'])
    expect(s.page).toBe(1)
    expect(toggleFilter(s, 'color', 'blue').filters.color).toEqual([])
  })
})

describe('browse', () => {
  it('ORs values within a facet and ANDs across facets', () => {
    const res = browse(records, parseBrowseState({ movement: 'impressionism,realism', subject: 'water' }), defs)
    expect(res.total).toBe(2)
    expect(res.pageIds).toEqual([1, 2])
  })

  it('computes disjunctive counts', () => {
    const res = browse(records, parseBrowseState({ movement: 'impressionism' }), defs)
    // The movement facet ignores its own selection…
    expect(facet(res, 'movement')).toEqual({ impressionism: 2, realism: 1, 'ancient-greece': 1 })
    // …while other facets respect it; multi-valued subjects count once per record.
    expect(facet(res, 'subject')).toEqual({ water: 2, boats: 1 })
  })

  it('filters on view and keeps selected zero-count values visible', () => {
    const res = browse(records, parseBrowseState({ onView: '1', movement: 'realism' }), defs)
    expect(res.total).toBe(0)
    expect(res.facets.find((f) => f.key === 'movement')!.buckets.find((b) => b.value === 'realism')).toMatchObject({ count: 0, selected: true })
  })

  it('sorts by date with undated works last', () => {
    const withUndated = [...records, rec(5, { yearStart: null })]
    expect(browse(withUndated, parseBrowseState({ sort: 'oldest' }), defs).pageIds).toEqual([4, 1, 2, 3, 5])
    expect(browse(withUndated, parseBrowseState({ sort: 'newest' }), defs).pageIds).toEqual([3, 2, 1, 4, 5])
  })
})

describe('exhibitionStatus', () => {
  const now = new Date('2026-09-26')
  it('classifies by dates, with open-ended as current', () => {
    expect(exhibitionStatus({ startDate: '2026-06-01', endDate: '2026-12-01' }, now)).toBe('current')
    expect(exhibitionStatus({ startDate: '2026-11-01', endDate: '2027-02-01' }, now)).toBe('upcoming')
    expect(exhibitionStatus({ startDate: '2020-01-01', endDate: '2020-06-01' }, now)).toBe('past')
    expect(exhibitionStatus({ startDate: '2012-11-11', endDate: null }, now)).toBe('current')
  })
})
